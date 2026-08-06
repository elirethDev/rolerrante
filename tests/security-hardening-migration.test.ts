import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// RED analysis-level test: no live Postgres in this environment, so we statically
// verify the security-hardening migration closes the audit findings:
// SEC-01 story self-approval bypass, SEC-05 admin change_role RPC, SEC-06
// characters rp_points mint, SEC-14 event_participants own-row DELETE.
const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260805020000_security_hardening.sql",
);
const sql = readFileSync(migrationPath, "utf8");

describe("SEC-01 stories self-approval bypass", () => {
  it("defines protect_story_staff_fields as SECURITY DEFINER with pinned search_path", () => {
    expect(sql).toMatch(
      /CREATE OR REPLACE FUNCTION public\.protect_story_staff_fields\(\)/,
    );
    expect(sql).toMatch(
      /SECURITY DEFINER SET search_path = public/,
    );
  });

  it("guards status, reviewed_by and review_notes against non-staff UPDATE", () => {
    const fn = sql.match(
      /CREATE OR REPLACE FUNCTION public\.protect_story_staff_fields\(\)[\s\S]*?\n\$\$;/,
    )![0];
    expect(fn).toMatch(/OLD\.status IS DISTINCT FROM NEW\.status/);
    expect(fn).toMatch(/OLD\.reviewed_by IS DISTINCT FROM NEW\.reviewed_by/);
    expect(fn).toMatch(/OLD\.review_notes IS DISTINCT FROM NEW\.review_notes/);
    expect(fn).toMatch(/NOT public\.is_gm_or_admin\(\)/);
  });

  it("creates trg_protect_story_staff_fields BEFORE UPDATE", () => {
    expect(sql).toMatch(
      /CREATE TRIGGER trg_protect_story_staff_fields\s+BEFORE UPDATE ON public\.stories\s+FOR EACH ROW EXECUTE FUNCTION public\.protect_story_staff_fields\(\)/,
    );
  });

  it("blocks the same-class INSERT bypass (status aprobado / review fields) for non-staff", () => {
    expect(sql).toMatch(
      /CREATE TRIGGER trg_protect_story_insert_workflow\s+BEFORE INSERT ON public\.stories/,
    );
    const fn = sql.match(
      /CREATE OR REPLACE FUNCTION public\.protect_story_insert_workflow\(\)[\s\S]*?\n\$\$;/,
    )![0];
    expect(fn).toMatch(/NOT public\.is_gm_or_admin\(\)/);
    expect(fn).toMatch(/NEW\.status NOT IN \('borrador', 'pendiente'\)/);
  });

  it("revokes table-wide ALL and grants only read + content-column UPDATE to players", () => {
    expect(sql).toContain(
      "REVOKE ALL ON public.stories FROM public, anon, authenticated;",
    );
    expect(sql).toContain(
      "GRANT SELECT ON public.stories TO public, anon, authenticated;",
    );
    expect(sql).toContain("GRANT INSERT ON public.stories TO authenticated;");
    expect(sql).toMatch(/GRANT UPDATE \([\s\S]*?\) ON public\.stories TO authenticated;/);
  });

  it("does NOT grant status/review fields to authenticated for UPDATE", () => {
    const grant = sql.match(
      /GRANT UPDATE \(([\s\S]*?)\) ON public\.stories TO authenticated;/,
    )![1];
    expect(grant).toMatch(/title/);
    expect(grant).toMatch(/content/);
    expect(grant).not.toMatch(/status/);
    expect(grant).not.toMatch(/review_notes/);
    expect(grant).not.toMatch(/reviewed_by/);
  });
});

describe("SEC-05 admin change_role RPC", () => {
  it("defines change_role(p_user_id uuid, p_new_role user_role) gated on is_admin", () => {
    const fn = sql.match(
      /CREATE OR REPLACE FUNCTION public\.change_role\(p_user_id uuid, p_new_role user_role\)[\s\S]*?\n\$\$;/,
    )![0];
    expect(fn).toMatch(/NOT public\.is_admin\(\) THEN\s+RAISE EXCEPTION 'No autorizado';/);
    expect(fn).toMatch(/UPDATE public\.profiles SET role = p_new_role, updated_at = now\(\)/);
    expect(fn).toMatch(/log_audit\('cambiar_rol'/);
  });

  it("locks EXECUTE to authenticated only", () => {
    expect(sql).toContain(
      "REVOKE EXECUTE ON FUNCTION public.change_role(uuid, user_role) FROM public, anon;",
    );
    expect(sql).toContain(
      "GRANT EXECUTE ON FUNCTION public.change_role(uuid, user_role) TO authenticated;",
    );
  });
});

describe("SEC-06 characters rp_points mint", () => {
  it("replaces the BETWEEN 0 AND 1000 INSERT check with a settings-derived cap", () => {
    expect(sql).toMatch(
      /ALTER POLICY "Jugadores crean personajes en borrador" ON public\.characters/,
    );
    expect(sql).toMatch(/rp_points >= 0/);
    expect(sql).toMatch(/character_creation_points/);
    // The loose 1000-point mint must be gone from the ALTER POLICY body (the
    // SEC-06 comment may still name the old check for documentation).
    const policy = sql.match(
      /ALTER POLICY "Jugadores crean personajes en borrador" ON public\.characters[\s\S]*?\n  \);/,
    )![0];
    expect(policy).not.toMatch(/rp_points BETWEEN 0 AND 1000/);
    expect(policy).not.toMatch(/BETWEEN 0 AND 1000/);
  });
});

describe("SEC-14 event_participants own-row DELETE policy", () => {
  it("lets a player delete their own participation row", () => {
    expect(sql).toMatch(
      /CREATE POLICY "Jugadores cancelan su participación" ON public\.event_participants\s+FOR DELETE USING \(EXISTS \([\s\S]*?FROM public\.characters c\s+WHERE c\.id = event_participants\.character_id AND c\.player_id = auth\.uid\(\)[\s\S]*?\)\);/,
    );
  });
});

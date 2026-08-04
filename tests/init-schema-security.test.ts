import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// RED analysis-level test: no live Postgres in this environment, so we statically
// verify the init_schema migration enforces the security-review fixes:
// C1 profile role self-elevation, C2 character self-approval / rp_points mint,
// C3 ungated SECURITY DEFINER RPCs, W1 search_path pinning, W2 log_audit exec
// lockdown, W5 event backdating guard.
const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260731000000_init_schema.sql",
);
const sql = readFileSync(migrationPath, "utf8");

const APPROVAL_RPCS = [
  "approve_story",
  "approve_character",
  "reject_story",
  "reject_character",
  "approve_skill_request",
  "confirm_event_completion",
];

function extractFunction(name: string): string {
  const match = sql.match(
    new RegExp(
      `CREATE OR REPLACE FUNCTION public\\.${name}\\([\\s\\S]*?\\n\\$\\$[^;]*;`,
    ),
  );
  expect(match, `expected ${name} function body`).not.toBeNull();
  return match![0];
}

describe("profiles role self-elevation guard (C1)", () => {
  it("revokes table-wide UPDATE and grants only editable columns to authenticated", () => {
    expect(sql).toContain(
      "REVOKE UPDATE ON public.profiles FROM anon, authenticated;",
    );
    expect(sql).toMatch(
      /GRANT UPDATE \(username, display_name, avatar_url, updated_at\) ON public\.profiles TO authenticated;/,
    );
  });

  it("blocks any non-admin role change via trigger", () => {
    expect(sql).toMatch(
      /CREATE TRIGGER trg_protect_profile_role\s+BEFORE UPDATE OF role ON public\.profiles\s+FOR EACH ROW EXECUTE FUNCTION public\.protect_profile_role\(\)/s,
    );
    const triggerFn = sql.match(
      /CREATE OR REPLACE FUNCTION public\.protect_profile_role\(\)[\s\S]*?\n\$\$;/,
    )![0];
    expect(triggerFn).toMatch(/NEW\.role IS DISTINCT FROM OLD\.role/);
    expect(triggerFn).toMatch(/NOT public\.is_admin\(\)/);
  });
});

describe("characters self-approval / rp_points mint guard (C2)", () => {
  it("restricts UPDATE column grants (status/rp_points/review fields NOT grantable to owner)", () => {
    expect(sql).toContain(
      "REVOKE UPDATE ON public.characters FROM anon, authenticated;",
    );
    // Anchor on the characters-specific columns so the profiles grant above
    // cannot be captured instead.
    const charsGrant =
      /GRANT UPDATE \(name, age, sex,([\s\S]*?)\) ON public\.characters TO authenticated;/.exec(
        sql,
      );
    expect(charsGrant).not.toBeNull();
    const grant = charsGrant![0];
    // Owner-editable content columns are present...
    expect(grant).toMatch(/name/);
    expect(grant).toMatch(/status/);
    expect(grant).toMatch(/reviewed_by/);
    // ...but minting/review-only fields are NOT.
    expect(grant).not.toMatch(/rp_points/);
    expect(grant).not.toMatch(/review_notes/);
    expect(grant).not.toMatch(/player_id/);
  });

  it("INSERT policy forces draft/pending, no prior review and bounded rp_points", () => {
    const insertPolicy =
      /CREATE POLICY "Jugadores crean personajes en borrador" ON public\.characters[\s\S]*?FOR INSERT WITH CHECK \((.*?)\);/s.exec(
        sql,
      );
    expect(insertPolicy).not.toBeNull();
    const body = insertPolicy![1];
    expect(body).toMatch(/player_id = auth\.uid\(\)/);
    expect(body).toMatch(/status IN \('borrador',\s*'pendiente'\)/);
    expect(body).toMatch(/rp_points/);
    expect(body).toMatch(/reviewed_by IS NULL AND reviewed_at IS NULL/);
  });

  it("no conflicting FOR ALL owner policy remains on characters", () => {
    expect(sql).not.toMatch(
      /CREATE POLICY "Jugadores gestionan sus personajes" ON public\.characters/,
    );
  });

  it("trigger blocks non-staff status promotion and rp_points changes", () => {
    expect(sql).toMatch(
      /CREATE TRIGGER trg_protect_character_review\s+BEFORE UPDATE OF status, rp_points ON public\.characters/,
    );
    const triggerFn = sql.match(
      /CREATE OR REPLACE FUNCTION public\.protect_character_review\(\)[\s\S]*?\n\$\$;/,
    )![0];
    expect(triggerFn).toMatch(/NOT public\.is_gm_or_admin\(\)/);
    expect(triggerFn).toMatch(/NEW\.status NOT IN \('borrador', 'pendiente'\)/);
    expect(triggerFn).toMatch(/NEW\.rp_points IS DISTINCT FROM OLD\.rp_points/);
  });
});

describe("SECURITY DEFINER approval RPCs are gated and exec-locked (C3)", () => {
  it("each approval RPC raises unless is_gm_or_admin()", () => {
    for (const name of APPROVAL_RPCS) {
      const fn = extractFunction(name);
      expect(fn, `${name} must gate on is_gm_or_admin`).toMatch(
        /IF NOT public\.is_gm_or_admin\(\) THEN\s+RAISE EXCEPTION 'No autorizado';/,
      );
    }
  });

  it("each approval RPC revokes PUBLIC/anon EXECUTE and grants authenticated", () => {
    for (const name of APPROVAL_RPCS) {
      expect(sql, `${name} exec revocation`).toContain(
        `REVOKE EXECUTE ON FUNCTION public.${name}(uuid, text) FROM public, anon;`,
      );
      expect(sql, `${name} exec grant`).toContain(
        `GRANT EXECUTE ON FUNCTION public.${name}(uuid, text) TO authenticated;`,
      );
    }
  });
});

describe("search_path pinned on every SECURITY DEFINER function (W1)", () => {
  it("no SECURITY DEFINER function lacks SET search_path = public", () => {
    // Every "SECURITY DEFINER" token must be followed by a pinned search_path.
    expect(sql).not.toMatch(
      /SECURITY DEFINER(?!\s+SET\s+search_path\s*=\s*public)/g,
    );
  });
});

describe("log_audit exec lockdown (W2)", () => {
  it("revokes PUBLIC/anon EXECUTE and keeps authenticated callable", () => {
    expect(sql).toContain(
      "REVOKE EXECUTE ON FUNCTION public.log_audit(audit_action, text, uuid, jsonb) FROM public, anon;",
    );
    expect(sql).toContain(
      "GRANT EXECUTE ON FUNCTION public.log_audit(audit_action, text, uuid, jsonb) TO authenticated;",
    );
  });

  it("requires an authenticated session inside the body", () => {
    const fn = extractFunction("log_audit");
    expect(fn).toMatch(/IF auth\.uid\(\) IS NULL THEN[\s\S]*?RAISE EXCEPTION/);
  });
});

describe("confirm_event_completion backdating guard (W5)", () => {
  it("raises unless the event is publicado or en_curso", () => {
    const fn = extractFunction("confirm_event_completion");
    expect(fn).toMatch(
      /IF v_status NOT IN \('publicado', 'en_curso'\) THEN[\s\S]*?RAISE EXCEPTION/,
    );
    expect(fn).toMatch(/SELECT type, status, starts_at, ends_at, creator_id/);
  });
});

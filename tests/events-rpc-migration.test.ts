import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// RED analysis-level test: no live Postgres in this environment, so we statically
// verify the rpc_repair migration defines the two runtime-missing RPCs:
// finalize_event (canonical event finalization + XP award) and
// reject_skill_request (mirror of approve_skill_request with status rechazado).
const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260805010000_rpc_repair.sql",
);
const sql = readFileSync(migrationPath, "utf8");

function extractFunction(name: string): string {
  const match = sql.match(
    new RegExp(
      `CREATE OR REPLACE FUNCTION public\\.${name}\\([\\s\\S]*?\\n\\$\\$;`,
    ),
  );
  expect(match, `expected ${name} function body`).not.toBeNull();
  return match![0];
}

describe("rpc_repair migration 20260805010000_rpc_repair.sql", () => {
  describe("finalize_event (Bug 1: RPC missing from migrations)", () => {
    it("defines finalize_event with the canonical signature (uuid, int, text default null)", () => {
      expect(sql).toMatch(
        /CREATE OR REPLACE FUNCTION public\.finalize_event\(\s*p_event_id uuid,\s*p_xp_per_participant int,\s*p_notes text DEFAULT NULL\s*\)/,
      );
    });

    it("is SECURITY DEFINER with pinned search_path and gates on is_gm_or_admin", () => {
      const fn = extractFunction("finalize_event");
      expect(fn).toMatch(/SECURITY DEFINER SET search_path = public/);
      expect(fn).toMatch(
        /IF NOT public\.is_gm_or_admin\(\) THEN\s+RAISE EXCEPTION 'No autorizado';/,
      );
    });

    it("revokes PUBLIC/anon EXECUTE and grants authenticated", () => {
      expect(sql).toContain(
        "REVOKE EXECUTE ON FUNCTION public.finalize_event(uuid, int, text) FROM public, anon;",
      );
      expect(sql).toContain(
        "GRANT EXECUTE ON FUNCTION public.finalize_event(uuid, int, text) TO authenticated;",
      );
    });

    it("awards XP and marks the event finalizado", () => {
      const fn = extractFunction("finalize_event");
      expect(fn).toMatch(/INSERT INTO public\.xp_transactions/);
      expect(fn).toMatch(/SET status = 'finalizado'/);
    });
  });

  describe("reject_skill_request (Bug 2: RPC missing from migrations)", () => {
    it("defines reject_skill_request with signature (uuid, text)", () => {
      expect(sql).toMatch(
        /CREATE OR REPLACE FUNCTION public\.reject_skill_request\(\s*p_request_id uuid,\s*p_notes text\s*\)/,
      );
    });

    it("is SECURITY DEFINER with pinned search_path and gates on is_gm_or_admin", () => {
      const fn = extractFunction("reject_skill_request");
      expect(fn).toMatch(/SECURITY DEFINER SET search_path = public/);
      expect(fn).toMatch(
        /IF NOT public\.is_gm_or_admin\(\) THEN\s+RAISE EXCEPTION 'No autorizado';/,
      );
    });

    it("revokes PUBLIC/anon EXECUTE and grants authenticated", () => {
      expect(sql).toContain(
        "REVOKE EXECUTE ON FUNCTION public.reject_skill_request(uuid, text) FROM public, anon;",
      );
      expect(sql).toContain(
        "GRANT EXECUTE ON FUNCTION public.reject_skill_request(uuid, text) TO authenticated;",
      );
    });

    it("sets the request to rechazado without awarding XP", () => {
      const fn = extractFunction("reject_skill_request");
      expect(fn).toMatch(/SET status = 'rechazado'/);
      expect(fn).not.toMatch(/xp_transactions/);
      expect(fn).not.toMatch(/rp_points/);
    });
  });

  it("keeps every SECURITY DEFINER function with a pinned search_path (W1)", () => {
    expect(sql).not.toMatch(
      /SECURITY DEFINER(?!\s+SET\s+search_path\s*=\s*public)/g,
    );
  });
});
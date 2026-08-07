import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Regression guard for the RLS insert-policy fix (SEC-06).
// La subquery `rp_points <= (SELECT COALESCE(...))` con fila ausente devolvía
// NULL → RLS violation al crear personajes. El COALESCE debe estar FUERA del
// subquery para que, sin fila en settings, el cap sea 25 (no NULL).
const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260805050000_fix_character_insert_policy.sql",
);
const sql = readFileSync(migrationPath, "utf8");

describe("fix_character_insert_policy 20260805050000", () => {
  it("drops and re-creates the characters insert policy", () => {
    expect(sql).toMatch(
      /DROP POLICY IF EXISTS "Jugadores crean personajes en borrador" ON public\.characters/,
    );
    expect(sql).toMatch(
      /CREATE POLICY "Jugadores crean personajes en borrador" ON public\.characters[\s\S]*FOR INSERT WITH CHECK/,
    );
  });

  it("puts COALESCE OUTSIDE the settings subquery (fila ausente => 25, no NULL)", () => {
    // COALESCE((SELECT ...), 25) — el COALESCE envuelve el subquery completo.
    expect(sql).toMatch(
      /rp_points\s*<=\s*COALESCE\(\s*\(\s*SELECT\s+\(s\.value\)::int\s+FROM public\.settings/,
    );
  });

  it("keeps the security gates (owner + pending status + staff fields null)", () => {
    expect(sql).toMatch(/player_id = auth\.uid\(\)/);
    expect(sql).toMatch(/status IN \('borrador', 'pendiente'\)/);
    expect(sql).toMatch(/reviewed_by IS NULL AND reviewed_at IS NULL/);
  });

  it("negative: a naive COALESCE inside the subquery would fail this guard", () => {
    // Si alguien reintroduce `SELECT COALESCE((s.value)::int, 25) FROM ...`
    // (COALESCE DENTRO), el patrón NO matchea y la prueba falla.
    expect(sql).not.toMatch(
      /SELECT COALESCE\(\(s\.value\)::int,\s*25\)\s+FROM public\.settings/,
    );
  });
});

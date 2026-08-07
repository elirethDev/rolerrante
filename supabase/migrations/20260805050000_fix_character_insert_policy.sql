-- Fix SEC-06 policy: la subquery devolvía NULL (no 25) cuando la fila
-- `character_creation_points` no existe en settings → `rp_points <= NULL`
-- evaluaba NULL → el WITH CHECK fallaba → "new row violates row level security"
-- en TODA creación de personaje.
--
-- El COALESCE debe estar FUERA del subquery:
--   rp_points <= COALESCE((SELECT s.value::int ...), 25)
--   * fila existe: compara contra el valor → apply el cap
--   * fila NO existe: NULL dentro del subquery → COALESCE lo convierte en 25

DROP POLICY IF EXISTS "Jugadores crean personajes en borrador" ON public.characters;

CREATE POLICY "Jugadores crean personajes en borrador" ON public.characters
  FOR INSERT WITH CHECK (
    player_id = auth.uid()
    AND status IN ('borrador', 'pendiente')
    AND rp_points >= 0
    AND rp_points <= COALESCE(
      (SELECT (s.value)::int FROM public.settings s WHERE s.key = 'character_creation_points'),
      25
    )
    AND reviewed_by IS NULL AND reviewed_at IS NULL
  );

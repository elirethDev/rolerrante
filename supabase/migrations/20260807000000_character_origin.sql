-- OD gap: campo narrativo "Origen" de la ficha.
-- Decisión de producto: solo Origen (Clase y Alineamiento quedan fuera).
-- Editable por el jugador al crear (y editar) su ficha; visible en la ficha.
ALTER TABLE public.characters ADD COLUMN IF NOT EXISTS origin text;

-- El UPDATE del propietario está restringido por columna (REVOKE + GRANT UPDATE
-- ... en init_schema): ampliar el grant para que el jugador pueda guardar origin.
GRANT UPDATE (origin) ON public.characters TO authenticated;

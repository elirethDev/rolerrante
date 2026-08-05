-- Community presence (landing-community / community-presence).
-- Aditiva sobre el esquema existente: una columna nullable y un RPC SECURITY
-- DEFINER de solo-escritura por sesión. No toca la columna grant de profiles.

-- Columna de última actividad: nullable, sin default (nace NULL).
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_active_at timestamptz;

-- ===========================================================================
-- touch_presence: marca la última actividad del usuario autenticado.
-- SECURITY DEFINER (igual que public.log_audit): con search_path acotado a
-- pg_catalog,pg_temp; rechaza a anon/sin-sesión y espeja REVOKE/GRANT de
-- log_audit (solo authenticated). NO amplía la columna grant de profiles:
-- la escritura ocurre dentro de la función definer, que solo actualiza
-- last_active_at para la fila id = auth.uid().
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.touch_presence()
RETURNS void AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  UPDATE public.profiles SET last_active_at = now() WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp;

REVOKE EXECUTE ON FUNCTION public.touch_presence() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.touch_presence() TO authenticated;

-- ===========================================================================
-- Rollback (down-migration)
-- ===========================================================================
-- DROP FUNCTION public.touch_presence();
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS last_active_at;

-- Re-aprobación de ficha (re-approval loop): el propietario devuelve su ficha
-- a revisión para que el consejo la re-apruebe.
-- Aditivo: un RPC SECURITY DEFINER owner-scoped y un valor nuevo de
-- audit_action. NO amplía la columna grant de characters: status ya es editable
-- a borrador/pendiente vía trigger, pero review_notes queda FUERA del GRANT
-- UPDATE del propietario, por lo que el reenvío necesita un camino privilegiado
-- que borre el rastro de aprobación previa (review_notes/reviewed_by/reviewed_at)
-- y deje la ficha en pendiente.

-- El enum audit_action se extiende en la MISMA migración donde se usa por
-- primera vez (precedente: 20260802000000_forum.sql).
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'solicitar_revision';

-- ===========================================================================
-- request_character_review: propietario envía la ficha a re-aprobación.
-- SECURITY DEFINER (igual que public.log_audit) con search_path acotado a
-- pg_catalog,pg_temp; rechaza a anon/sin-sesión y a NO propietarios (compara
-- player_id con auth.uid()); pone status='pendiente' y limpia
-- review_notes/reviewed_by/reviewed_at. Espeja REVOKE/GRANT de log_audit
-- (solo authenticated). El trigger protect_character_review también rige aquí:
-- como auth.uid() es el propietario (no staff), NEW.status debe quedar en
-- borrador/pendiente y rp_points intacto — se cumple por diseño.
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.request_character_review(p_character_id uuid)
RETURNS void AS $$
DECLARE
  v_player_id uuid;
BEGIN
  -- W2: sesión obligatoria. anon y cualquiera sin sesión no pueden reenviar.
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT player_id INTO v_player_id FROM public.characters WHERE id = p_character_id;
  IF v_player_id IS NULL THEN
    RAISE EXCEPTION 'Personaje no encontrado';
  END IF;
  IF v_player_id <> auth.uid() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  UPDATE public.characters
  SET status = 'pendiente', review_notes = NULL, reviewed_by = NULL, reviewed_at = NULL
  WHERE id = p_character_id;

  PERFORM public.log_audit('solicitar_revision', 'character', p_character_id, jsonb_build_object('re_request', true));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp;

REVOKE EXECUTE ON FUNCTION public.request_character_review(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.request_character_review(uuid) TO authenticated;

-- ===========================================================================
-- Rollback (down-migration)
-- ===========================================================================
-- DROP FUNCTION public.request_character_review(uuid);

-- rpc_repair: define the two RPCs the app calls but no migration ever created.
-- Bug 1: finalize_event — canonical event finalization + XP award (replaces the
-- app-side call to confirm_event_completion for finalization). Bug 2:
-- reject_skill_request — mirrors approve_skill_request but sets rechazado.

-- finalize_event: GM/admin finalizes a published/in-progress event, awards XP,
-- marks finalizado. Per-participant XP comes from the GM (p_xp_per_participant);
-- creator/campaign bonuses come from xp_rewards settings.
CREATE OR REPLACE FUNCTION public.finalize_event(
  p_event_id uuid,
  p_xp_per_participant int,
  p_notes text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_status event_status;
  v_type event_type;
  v_start timestamptz;
  v_end timestamptz;
  v_creator uuid;
  v_xp_creator int;
  v_xp_campaign int;
  v_xp_campaign_days int;
BEGIN
  IF NOT public.is_gm_or_admin() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  IF p_xp_per_participant <= 0 THEN
    RAISE EXCEPTION 'La XP por participante debe ser mayor que 0';
  END IF;
  SELECT status, type, starts_at, ends_at, creator_id
  INTO v_status, v_type, v_start, v_end, v_creator
  FROM public.events WHERE id = p_event_id;
  IF v_status NOT IN ('publicado', 'en_curso') THEN
    RAISE EXCEPTION 'El evento debe estar publicado o en curso para finalizarse';
  END IF;
  v_xp_creator := (SELECT (value->>'crear_evento')::int FROM public.settings WHERE key = 'xp_rewards');
  v_xp_campaign := (SELECT (value->>'campana_larga')::int FROM public.settings WHERE key = 'xp_rewards');
  v_xp_campaign_days := (SELECT (value->>'dias_campana_larga')::int FROM public.settings WHERE key = 'xp_rewards');
  -- Award creator XP
  INSERT INTO public.xp_transactions (character_id, amount, reason, source, source_id, awarded_by)
  SELECT id, v_xp_creator, 'Crear evento', 'event', p_event_id, auth.uid()
  FROM public.characters WHERE player_id = v_creator AND status = 'aprobado' LIMIT 1;
  UPDATE public.characters SET rp_points = rp_points + v_xp_creator
  WHERE player_id = v_creator AND status = 'aprobado';
  -- Award participant XP (per participant amount from GM)
  INSERT INTO public.xp_transactions (character_id, amount, reason, source, source_id, awarded_by)
  SELECT character_id, p_xp_per_participant, 'Participación en evento', 'event', p_event_id, auth.uid()
  FROM public.event_participants WHERE event_id = p_event_id AND status = 'confirmado';
  UPDATE public.characters SET rp_points = rp_points + p_xp_per_participant
  WHERE id IN (SELECT character_id FROM public.event_participants WHERE event_id = p_event_id AND status = 'confirmado');
  UPDATE public.event_participants SET xp_awarded = p_xp_per_participant
  WHERE event_id = p_event_id AND status = 'confirmado';
  -- Campaign bonus
  IF v_type = 'campana' AND v_start IS NOT NULL AND v_end IS NOT NULL
     AND EXTRACT(EPOCH FROM (v_end - v_start))/86400 >= v_xp_campaign_days THEN
    UPDATE public.characters SET rp_points = rp_points + v_xp_campaign
    WHERE id IN (SELECT character_id FROM public.event_participants WHERE event_id = p_event_id AND status = 'confirmado');
    INSERT INTO public.xp_transactions (character_id, amount, reason, source, source_id, awarded_by)
    SELECT character_id, v_xp_campaign, 'Finalización de campaña larga', 'event', p_event_id, auth.uid()
    FROM public.event_participants WHERE event_id = p_event_id AND status = 'confirmado';
    UPDATE public.event_participants SET xp_awarded = xp_awarded + v_xp_campaign
    WHERE event_id = p_event_id AND status = 'confirmado';
  END IF;
  UPDATE public.events SET status = 'finalizado', updated_at = now() WHERE id = p_event_id;
  PERFORM public.log_audit('finalizar_evento', 'event', p_event_id, jsonb_build_object('xp', p_xp_per_participant, 'notes', p_notes));
END;
$$;
REVOKE EXECUTE ON FUNCTION public.finalize_event(uuid, int, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.finalize_event(uuid, int, text) TO authenticated;

-- reject_skill_request: mirrors approve_skill_request but sets status=rechazado
CREATE OR REPLACE FUNCTION public.reject_skill_request(p_request_id uuid, p_notes text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_gm_or_admin() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  UPDATE public.skill_requests SET status = 'rechazado', review_notes = p_notes, reviewed_at = now()
  WHERE id = p_request_id;
  PERFORM public.log_audit('rechazar', 'skill_request', p_request_id, jsonb_build_object('notes', p_notes));
END;
$$;
REVOKE EXECUTE ON FUNCTION public.reject_skill_request(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.reject_skill_request(uuid, text) TO authenticated;

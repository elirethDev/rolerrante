-- Security hardening (SEC-01/05/06/14). Cierra hallazgos del audit sobre la vía
-- directa a la API de Supabase (PostgREST). Aditiva sobre init_schema y el foro.

-- ============================================================================
-- SEC-01: bypass de auto-aprobación de historias
-- La policy FOR ALL del dueño dejaba abierta la vía directa
--   UPDATE public.stories SET status='aprobado'
-- sin restricción de columnas ni trigger de protección (a diferencia de
-- characters/threads). Se replica el patrón protect_character_review /
-- protect_thread_staff_fields: trigger BEFORE UPDATE que rechaza cambios de
-- campos de staff (status/reviewed_by/review_notes) a quien no sea GM/admin, más
-- grants por columna que dejan esos campos fuera del UPDATE de jugadores.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.protect_story_staff_fields()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF (OLD.status IS DISTINCT FROM NEW.status) AND NOT public.is_gm_or_admin() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  IF (OLD.reviewed_by IS DISTINCT FROM NEW.reviewed_by) AND NOT public.is_gm_or_admin() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  IF (OLD.review_notes IS DISTINCT FROM NEW.review_notes) AND NOT public.is_gm_or_admin() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_story_staff_fields ON public.stories;
CREATE TRIGGER trg_protect_story_staff_fields
  BEFORE UPDATE ON public.stories
  FOR EACH ROW EXECUTE FUNCTION public.protect_story_staff_fields();

-- Misma clase de bypass vía INSERT: con la policy FOR ALL el dueño podía crear
-- una historia ya 'aprobada' (o con review_* rellenados) saltándose la revisión
-- del GM. El trigger exige borrador/pendiente y campos de revisión vacíos salvo
-- staff (misma doctrina que el INSERT policy de characters, C2).
CREATE OR REPLACE FUNCTION public.protect_story_insert_workflow()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_gm_or_admin() AND (
    NEW.status NOT IN ('borrador', 'pendiente')
    OR NEW.reviewed_by IS NOT NULL
    OR NEW.review_notes IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_story_insert_workflow ON public.stories;
CREATE TRIGGER trg_protect_story_insert_workflow
  BEFORE INSERT ON public.stories
  FOR EACH ROW EXECUTE FUNCTION public.protect_story_insert_workflow();

-- Column grants para stories (patrón characters). El jugador puede INSERT y
-- editar SOLO campos de contenido: status/review_* quedan fuera del UPDATE de
-- authenticated (defensa en profundidad junto al trigger).
REVOKE ALL ON public.stories FROM public, anon, authenticated;
GRANT SELECT ON public.stories TO public, anon, authenticated;
GRANT INSERT ON public.stories TO authenticated;
GRANT UPDATE (title, content, character_id, updated_at) ON public.stories TO authenticated;
GRANT SELECT, UPDATE ON public.stories TO service_role;

-- ============================================================================
-- SEC-05: promoción/democión de rol por admin vía RPC
-- El UPDATE directo a profiles.role falla por RLS/column-grants (rol no editable
-- por el propio usuario) y no deja auditoría. change_role es la vía oficial:
-- solo admin, valida el rol objetivo y registra en audit_logs.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.change_role(p_user_id uuid, p_new_role user_role)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  IF p_new_role NOT IN ('rolero', 'gm', 'admin') THEN
    RAISE EXCEPTION 'Rol inválido';
  END IF;
  UPDATE public.profiles SET role = p_new_role, updated_at = now() WHERE id = p_user_id;
  PERFORM public.log_audit('cambiar_rol', 'profile', p_user_id, jsonb_build_object('new_role', p_new_role));
END;
$$;
REVOKE EXECUTE ON FUNCTION public.change_role(uuid, user_role) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.change_role(uuid, user_role) TO authenticated;

-- ============================================================================
-- SEC-06: acuñado de rp_points en la creación de personajes
-- El INSERT policy aceptaba rp_points BETWEEN 0 AND 1000: un jugador podía
-- acuñar hasta 1000 puntos. La app siembra rp_points = points_creación - gasto
-- (personajes/nuevo), así que se acota al presupuesto declarado en settings
-- (default 25 si la fila aún no existe). Cierra el mint sin romper la creación.
-- ============================================================================
ALTER POLICY "Jugadores crean personajes en borrador" ON public.characters
  WITH CHECK (
    player_id = auth.uid()
    AND status IN ('borrador', 'pendiente')
    AND rp_points >= 0
    AND rp_points <= (
      SELECT COALESCE((s.value)::int, 25)
      FROM public.settings s
      WHERE s.key = 'character_creation_points'
    )
    AND reviewed_by IS NULL AND reviewed_at IS NULL
  );

-- ============================================================================
-- SEC-14: salida de eventos
-- No existía policy de DELETE para jugadores en event_participants, por lo que
-- la acción "Salir" fallaba en silencio (RLS denegaba el borrado). Se agrega la
-- policy que permite borrar la propia participación (mismo flujo que el join).
-- ============================================================================
CREATE POLICY "Jugadores cancelan su participación" ON public.event_participants
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM public.characters c
    WHERE c.id = event_participants.character_id AND c.player_id = auth.uid()
  ));

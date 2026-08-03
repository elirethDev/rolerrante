-- Forum moderation: reports, user_sanctions, audit enum, SECURITY DEFINER RPCs
-- (REQ-MOD-REP-01 / REQ-MOD-ENF-01/02/04). Aditiva sobre el esquema existente.
-- No reconstruible: extiende public.audit_action en la MISMA migración (REQ-FORUM-01.2).

-- Extender el enum de auditoría con acciones de moderación (REQ-MOD-REP-01.4,
-- REQ-MOD-ENF-01.4, REQ-MOD-ENF-02.3) y las dos acciones de resolución de un
-- reporte (resuelta/descartada).
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'reportar';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'suspender';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'banear';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'reportar_resuelto';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'reportar_descartado';

-- Reportes de posts (REQ-MOD-REP-01). status por CHECK (abierta|resuelta|descartada).
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES public.profiles(id),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  reason text NOT NULL,
  justification text,
  status text NOT NULL DEFAULT 'abierta' CHECK (status IN ('abierta', 'resuelta', 'descartada')),
  resolved_by uuid REFERENCES public.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
-- Cualquier usuario autenticado puede reportar (REQ-MOD-REP-01.3).
CREATE POLICY "Cualquier autenticado reporta" ON public.reports
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
-- Solo admin puede ver/resolver reportes (REQ-MOD-REP-02).
CREATE POLICY "Solo admin ve reportes" ON public.reports
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Solo admin resuelve reportes" ON public.reports
  FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Sanciones de acceso al foro (REQ-MOD-ENF-01.1 / ENF-02.1). kind por CHECK
-- (suspension|ban); un ban es permanente con active_until NULL.
CREATE TABLE public.user_sanctions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('suspension', 'ban')),
  active_until timestamptz,
  justification text NOT NULL,
  issued_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_sanctions ENABLE ROW LEVEL SECURITY;
-- Escritura (INSERT/UPDATE/DELETE) solo admin. SELECT visible al propio usuario
-- (para que el gate server-side forumAccessAllowed pueda leerla como el usuario
-- logueado y bloquearlo), y a admin (cola de moderación en fases 2/3).
CREATE POLICY "Solo admin gestiona sanciones" ON public.user_sanctions
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Usuario ve su propia sancion" ON public.user_sanctions
  FOR SELECT USING (user_id = auth.uid());

-- Índices de acceso frecuente.
CREATE INDEX idx_reports_status ON public.reports(status);
CREATE INDEX idx_reports_post_id ON public.reports(post_id);
CREATE INDEX idx_user_sanctions_user ON public.user_sanctions(user_id);

-- ===========================================================================
-- RFCs SECURITY DEFINER (enforcement). Cada una: gate is_admin(), justificación
-- obligatoria en SQL y rechazo de targets admin/GM (REQ-MOD-ENF-01.2 / ENF-04.1).
-- ===========================================================================

-- Suspensión temporal (REQ-MOD-ENF-01).
CREATE OR REPLACE FUNCTION public.suspend_user(
  p_user_id uuid,
  p_active_until timestamptz,
  p_justification text
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Solo admin puede sancionar usuarios';
  END IF;
  IF p_justification IS NULL OR btrim(p_justification) = '' THEN
    RAISE EXCEPTION 'La justificacion es obligatoria';
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id AND role IN ('gm', 'admin')) THEN
    RAISE EXCEPTION 'No se puede sancionar a un GM o admin';
  END IF;

  INSERT INTO public.user_sanctions (user_id, kind, active_until, justification, issued_by)
  VALUES (p_user_id, 'suspension', p_active_until, p_justification, auth.uid());

  PERFORM public.log_audit('suspender', 'profile', p_user_id,
    jsonb_build_object('justification', p_justification, 'active_until', p_active_until));
END;
$$;

-- Ban permanente (REQ-MOD-ENF-02). active_until queda NULL = sin expiración.
CREATE OR REPLACE FUNCTION public.ban_user(
  p_user_id uuid,
  p_justification text
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Solo admin puede sancionar usuarios';
  END IF;
  IF p_justification IS NULL OR btrim(p_justification) = '' THEN
    RAISE EXCEPTION 'La justificacion es obligatoria';
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id AND role IN ('gm', 'admin')) THEN
    RAISE EXCEPTION 'No se puede sancionar a un GM o admin';
  END IF;

  INSERT INTO public.user_sanctions (user_id, kind, active_until, justification, issued_by)
  VALUES (p_user_id, 'ban', NULL, p_justification, auth.uid());

  PERFORM public.log_audit('banear', 'profile', p_user_id,
    jsonb_build_object('justification', p_justification));
END;
$$;

-- Resolver o descartar un reporte (REQ-MOD-REP-02.2).
CREATE OR REPLACE FUNCTION public.resolve_report(
  p_report_id uuid,
  p_status text,
  p_justification text
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Solo admin puede resolver reportes';
  END IF;
  IF p_justification IS NULL OR btrim(p_justification) = '' THEN
    RAISE EXCEPTION 'La justificacion es obligatoria';
  END IF;
  IF p_status NOT IN ('resuelta', 'descartada') THEN
    RAISE EXCEPTION 'Estado de resolucion invalido';
  END IF;

  UPDATE public.reports
  SET status = p_status,
      resolved_by = auth.uid(),
      resolved_at = now()
  WHERE id = p_report_id;

  IF p_status = 'resuelta' THEN
    PERFORM public.log_audit('reportar_resuelto', 'report', p_report_id,
      jsonb_build_object('justification', p_justification));
  ELSE
    PERFORM public.log_audit('reportar_descartado', 'report', p_report_id,
      jsonb_build_object('justification', p_justification));
  END IF;
END;
$$;

-- Reportar self-SELECT policy (REQ-MOD-REP-01.3 correction).
-- reportPost does insert().select('id').single() to read back the new report id;
-- the base moderation migration grants reports SELECT only to admins, so a
-- non-admin reporter gets zero rows back on the select and reportPost always
-- errors ("No se pudo crear el reporte"). This additive policy lets a reporter
-- SELECT their own reports; admins keep the existing admin-only SELECT.
CREATE POLICY "Reporter ve su propio reporte" ON public.reports
  FOR SELECT USING (reporter_id = auth.uid());

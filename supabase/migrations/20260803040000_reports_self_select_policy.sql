-- Reportar self-SELECT policy (REQ-MOD-REP-01.3 correction).
-- reportPost does insert().select('id').single() to read back the new report id;
-- the base moderation migration grants reports SELECT only to admins, so a
-- non-admin reporter gets zero rows back on the select and reportPost always
-- errors ("No se pudo crear el reporte"). This additive policy lets a reporter
-- SELECT their own reports; admins keep the existing admin-only SELECT.
CREATE POLICY "Reporter ve su propio reporte" ON public.reports
  FOR SELECT USING (reporter_id = auth.uid());

-- W7 (aceptado, documentado): las políticas RLS no pueden limitar columnas, así
-- que esta SELECT expone al reporter también resolved_by/resolved_at (campos de
-- moderación). El riesgo es aceptado porque (1) resolved_by solo muestra QUÉ
-- staff resolvió, sin contenido sensible; (2) resolved_at es una fecha; (3) la
-- app filtra estos campos en la capa de presentación (solo el reporter ve sus
-- filas; el resto de metadatos de moderación permanecen admin-only). Una vista
-- SECURITY DEFINER que recorte columnas sería la alternativa sin reescritura de
-- la app, pero se difiere: el costo de mantenimiento no justifica hoy el riesgo
-- residual (id + timestamps de moderación sin datos de contenido).

-- Reacciones: like único ("Gracias") por usuario y post (REQ-REACT-01).
-- Migración aditiva: tabla nueva; no toca tablas existentes.
-- Decisión F: el registro se retiene indefinidamente para futuros logros,
-- no se audita por acción (no log_audit en toggles).

CREATE TABLE public.reactions (
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

-- SELECT: conteo visible dentro de hilos visibles para el lector (REACT-01.1).
-- Los invitados deben ver el contador (REQ-02.3: guest ve count chip), por lo que
-- la política es de visibilidad, NO de autenticación (a diferencia de INSERT/DELETE
-- que sí exigen auth.uid() = user_id). El conteo agregado no debe filtrar
-- reacciones de hilos pendientes/borradores a invitados.
CREATE POLICY "Reacciones contables en hilos visibles" ON public.reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.posts p
      JOIN public.threads t ON t.id = p.thread_id
      WHERE p.id = reactions.post_id
        AND (t.status IN ('aprobado', 'abierto') OR t.author_id = auth.uid() OR is_gm_or_admin())
    )
  );

-- INSERT: el usuario solo puede insertar su propia fila (un like por post) y solo
-- dentro de un hilo visible. La subconsulta EXISTS replica el alcance de visibilidad
-- del SELECT (status IN aprobado/abierto, o dueño del hilo, o staff/GM), de modo que
-- no se puede inflar el contador de un post en un hilo oculto (pendiente/borrador)
-- (REACT-01.1, FIX-1). PostgreSQL permite subconsultas a otras tablas en WITH CHECK.
CREATE POLICY "Usuario inserta su propia reacción en hilo visible" ON public.reactions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.posts p
      JOIN public.threads t ON t.id = p.thread_id
      WHERE p.id = reactions.post_id
        AND (t.status IN ('aprobado', 'abierto') OR t.author_id = auth.uid() OR is_gm_or_admin())
    )
  );

-- DELETE: el usuario solo puede eliminar su propia fila (unlike) dentro de un hilo
-- visible. Replica el mismo alcance de visibilidad que INSERT/SELECT (FIX-1).
CREATE POLICY "Usuario borra su propia reacción en hilo visible" ON public.reactions
  FOR DELETE USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.posts p
      JOIN public.threads t ON t.id = p.thread_id
      WHERE p.id = reactions.post_id
        AND (t.status IN ('aprobado', 'abierto') OR t.author_id = auth.uid() OR is_gm_or_admin())
    )
  );

-- Índice para el conteo agregado por post (REACT-01.1).
CREATE INDEX idx_reactions_post_id ON public.reactions(post_id);

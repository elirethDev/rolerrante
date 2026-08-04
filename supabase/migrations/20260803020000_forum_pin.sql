-- Forum pin (Fijado): hilo fijado por GM/admin (REQ-FORUM-01.1/04.3).
-- Aditivo: una columna con DEFAULT false (sin backfill) y dos valores de enum.
-- El enum audit_action se extiende en la MISMA migración donde se usa por primera
-- vez, siguiendo el precedente de migrations/20260802000000_forum.sql.

-- Columna is_sticky: los hilos existentes quedan en false por defecto.
ALTER TABLE public.threads
  ADD COLUMN is_sticky boolean NOT NULL DEFAULT false;

-- Extender el enum de auditoría con las acciones de fijar/desfijar (REQ-FORUM-01.2).
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'fijar_hilo';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'desfijar_hilo';

-- W3 (extensión): is_sticky nace en ESTA migración (no existía en
-- 20260802000000_forum.sql), por lo que aquí se concede la columna y se extiende
-- el guard protect_thread_staff_fields para que solo GM/admin puedan fijar
-- (mismo patrón de column grant + trigger que en la migración del foro).
GRANT UPDATE (is_sticky) ON public.threads TO authenticated;

CREATE OR REPLACE FUNCTION public.protect_thread_staff_fields()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_gm_or_admin() AND (
    NEW.status IS DISTINCT FROM OLD.status
    OR NEW.is_locked IS DISTINCT FROM OLD.is_locked
    OR NEW.locked_by IS DISTINCT FROM OLD.locked_by
    OR NEW.locked_at IS DISTINCT FROM OLD.locked_at
    OR NEW.linked_entity_type IS DISTINCT FROM OLD.linked_entity_type
    OR NEW.linked_entity_id IS DISTINCT FROM OLD.linked_entity_id
    OR NEW.is_sticky IS DISTINCT FROM OLD.is_sticky
  ) THEN
    RAISE EXCEPTION 'Solo GM/Admin pueden modificar estado, bloqueo o fijado de hilos';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_thread_is_sticky
  BEFORE UPDATE OF is_sticky ON public.threads
  FOR EACH ROW EXECUTE FUNCTION public.protect_thread_staff_fields();

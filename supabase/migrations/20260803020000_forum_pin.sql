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

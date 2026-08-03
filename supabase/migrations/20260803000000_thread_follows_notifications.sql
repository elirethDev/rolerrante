-- Thread follows + in-app reply notifications (Slice 1 de forum-follow-notif).
-- Migración aditiva sobre el esquema existente (cero cambios a tablas previas).
-- Decision D: follow de hilo SOLO, nuevas respuestas, campanita in-app, SIN email.
-- El trigger SECURITY DEFINER es no-interceptable (fanea para cualquier INSERT de
-- posts) y espeja la filosofía del RPC public.log_audit ya establecido.

-- Seguidores de hilo. notify_in_app es la preferencia por-follow (1:1 de la fila,
-- sin tabla extra de preferencias).
CREATE TABLE public.thread_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  notify_in_app boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (thread_id, user_id)
);

ALTER TABLE public.thread_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Seguidores ven sus propios follows" ON public.thread_follows
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Seguidores insertan sus propios follows" ON public.thread_follows
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Seguidores borran sus propios follows" ON public.thread_follows
  FOR DELETE USING (user_id = auth.uid());

-- Notificaciones in-app. type restringido por CHECK ('new_reply'); no usamos enum.
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  type text NOT NULL CHECK (type = 'new_reply'),
  thread_id uuid NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES public.profiles(id),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
-- SELECT: solo el destinatario. INSERT lo realiza SOLO el trigger SECURITY DEFINER
-- (no existe policy de INSERT para la app => los inserts directos fallan por RLS).
CREATE POLICY "Destinatario ve sus notificaciones" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

-- Fan-out no-interceptable (SECURITY DEFINER), espejo de log_audit: para cada post
-- insertado, una notificación por seguidor (del hilo, in-app) con self-exclusion.
CREATE OR REPLACE FUNCTION public.notify_thread_followers()
RETURNS trigger SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, thread_id, post_id, actor_id)
  SELECT tf.user_id, 'new_reply', NEW.thread_id, NEW.id, NEW.author_id
  FROM public.thread_follows tf
  WHERE tf.thread_id = NEW.thread_id
    AND tf.notify_in_app = true
    AND tf.user_id <> NEW.author_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notify_followers
  AFTER INSERT ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.notify_thread_followers();

-- Índices de acceso frecuente: fan-out por hilo y marca-leído por destinatario.
CREATE INDEX idx_notifications_user_read ON public.notifications(user_id, read_at);
CREATE INDEX idx_thread_follows_thread ON public.thread_follows(thread_id);

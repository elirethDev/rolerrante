-- Forum: categorías, hilos, posts y permisos (fase 1: schema + RLS + índices + enum)
-- Migración aditiva sobre el esquema existente. No reconstruible: extiende el enum
-- public.audit_action en la MISMA migración (REQ-FORUM-01.2).

-- Estado de los hilos: añade 'abierto' para los debates públicos; el resto se deriva
-- del estado de aprobación de la entidad vinculada (historia/personaje/evento).
CREATE TYPE public.thread_status AS ENUM ('borrador', 'pendiente', 'abierto', 'aprobado', 'rechazado');

-- Extender el enum de auditoría con acciones del foro (REQ-FORUM-01.2).
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'crear_hilo';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'editar_post';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'eliminar_post';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'bloquear_hilo';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'desbloquear_hilo';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'editar_permisos';

-- Categorías de 2 niveles: una categoría raíz puede tener subcategorías (parent_id).
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES public.categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  sort_order int NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categorías públicas legibles" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Solo admin gestiona categorías" ON public.categories
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Hilos de conversación. content_type distingue debate libre frente a entidades
-- vinculadas (historia/ficha/evento). linked_entity_* apunta a la entidad puente.
CREATE TABLE public.threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.categories(id),
  content_type text NOT NULL CHECK (content_type IN ('debate','historia','ficha','evento')),
  title text NOT NULL,
  body jsonb NOT NULL DEFAULT '{}',
  author_id uuid NOT NULL REFERENCES public.profiles(id),
  linked_entity_type text,
  linked_entity_id uuid,
  status thread_status NOT NULL DEFAULT 'borrador',
  is_locked boolean NOT NULL DEFAULT false,
  locked_by uuid REFERENCES public.profiles(id),
  locked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  edited_by uuid REFERENCES public.profiles(id),
  edited_at timestamptz
);

ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Threads visibles si abiertos o aprobados" ON public.threads
  FOR SELECT USING (
    status IN ('aprobado', 'abierto') OR author_id = auth.uid() OR is_gm_or_admin()
  );
CREATE POLICY "Autor o GM/Admin gestionan hilos" ON public.threads
  FOR ALL USING (author_id = auth.uid() OR is_gm_or_admin())
  WITH CHECK (author_id = auth.uid() OR is_gm_or_admin());

-- Posts por hilo, numerados (post_number) para mantener orden estable en ediciones
-- y borrados sin renumerar.
CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id),
  body jsonb NOT NULL DEFAULT '{}',
  post_number int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  edited_by uuid REFERENCES public.profiles(id),
  edited_at timestamptz,
  UNIQUE (thread_id, post_number)
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Posts visibles según hilo" ON public.posts
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.threads t WHERE t.id = posts.thread_id
    AND (t.status IN ('aprobado','abierto') OR t.author_id = auth.uid() OR is_gm_or_admin())
  ));
CREATE POLICY "Autor o GM/Admin gestionan posts" ON public.posts
  FOR ALL USING (author_id = auth.uid() OR is_gm_or_admin())
  WITH CHECK (author_id = auth.uid() OR is_gm_or_admin());

-- Permisos por sección (categoría) y por hilo, por rol. Los flags de hilo
-- sobrescriben los de la sección.
CREATE TABLE public.section_permissions (
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  can_view boolean NOT NULL DEFAULT false,
  can_post boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  can_lock boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (category_id, role)
);

ALTER TABLE public.section_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permisos de sección legibles" ON public.section_permissions FOR SELECT USING (true);
CREATE POLICY "Solo admin gestiona permisos de sección" ON public.section_permissions
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE TABLE public.thread_permissions (
  thread_id uuid NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  can_view boolean NOT NULL DEFAULT false,
  can_post boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  can_lock boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (thread_id, role)
);

ALTER TABLE public.thread_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permisos de hilo legibles" ON public.thread_permissions FOR SELECT USING (true);
CREATE POLICY "Solo admin gestiona permisos de hilo" ON public.thread_permissions
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Índices de acceso frecuente (REQ-FORUM-01.4).
CREATE INDEX idx_threads_category_status ON public.threads(category_id, status);
CREATE INDEX idx_threads_linked_entity ON public.threads(linked_entity_type, linked_entity_id);
CREATE INDEX idx_posts_thread_number ON public.posts(thread_id, post_number);

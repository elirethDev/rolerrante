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
-- W3: la antigua policy FOR ALL le daba al autor UPDATE sobre status, bloqueo y
-- vinculación. Se separa por comando y la autorización fina se apoya en column
-- grants (solo columnas de contenido + campos de staff) + trigger que rechaza
-- cambios de campos de staff a quien no sea GM/admin (mismo patrón que
-- protect_profile_role / protect_character_review en init_schema).
CREATE POLICY "Autor o GM/Admin insertan hilos" ON public.threads
  FOR INSERT WITH CHECK (author_id = auth.uid() OR is_gm_or_admin());
CREATE POLICY "Autores editan el contenido de sus hilos" ON public.threads
  FOR UPDATE USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());
CREATE POLICY "GM/Admin gestionan hilos" ON public.threads
  FOR UPDATE USING (is_gm_or_admin())
  WITH CHECK (is_gm_or_admin());
CREATE POLICY "Autor o GM/Admin borran hilos" ON public.threads
  FOR DELETE USING (author_id = auth.uid() OR is_gm_or_admin());

REVOKE UPDATE ON public.threads FROM anon, authenticated;
GRANT UPDATE (title, body, updated_at, edited_by, edited_at, status, is_locked,
  locked_by, locked_at, linked_entity_type, linked_entity_id)
  ON public.threads TO authenticated;

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
  ) THEN
    RAISE EXCEPTION 'Solo GM/Admin pueden modificar estado, bloqueo o vinculación de hilos';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_thread_staff_fields
  BEFORE UPDATE OF status, is_locked, locked_by, locked_at,
    linked_entity_type, linked_entity_id
  ON public.threads
  FOR EACH ROW EXECUTE FUNCTION public.protect_thread_staff_fields();

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
  WITH CHECK (
    (author_id = auth.uid() OR is_gm_or_admin())
    AND EXISTS (
      SELECT 1 FROM public.threads t
      WHERE t.id = posts.thread_id
        AND (t.status IN ('aprobado', 'abierto') OR t.author_id = auth.uid() OR is_gm_or_admin())
    )
  );

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

-- W4: la visibilidad por permisos (section_permissions / thread_permissions) se
-- aplica en la capa de app (server actions + filtros de categorías visibles para
-- el rol); RLS no la replica aquí para no romper las rutas de lectura actuales.
-- La ESCRITURA de posts sí exige un hilo visible vía WITH CHECK (ver policy
-- "Autor o GM/Admin gestionan posts"), replicando el patrón de reactions.

-- Índices de acceso frecuente (REQ-FORUM-01.4).
CREATE INDEX idx_threads_category_status ON public.threads(category_id, status);
CREATE INDEX idx_threads_linked_entity ON public.threads(linked_entity_type, linked_entity_id);
CREATE INDEX idx_posts_thread_number ON public.posts(thread_id, post_number);

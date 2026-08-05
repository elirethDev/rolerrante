-- foro-categorias: columnas para el gestor práctico de categorías/subforos
-- (foro-categorias). Aditiva sobre migrations/20260802000000_foro.sql.

-- Rol mínimo de lectura por categoría (FORO-CAT-MINROLE). NULL = Público
-- (cualquiera). Pendiente < rolero < gm < admin; la visibilidad pública se
-- filtra en la capa de app (minReadRoleSatisfied) junto a is_visible.
ALTER TABLE public.categories ADD COLUMN min_read_role user_role;

-- Requiere aprobación de entrada (FORO-CAT-APPR). Metadato editable en el panel
-- admin; su enforcement de workflow de entrada queda para un cambio futuro.
ALTER TABLE public.categories ADD COLUMN requires_approval boolean NOT NULL DEFAULT false;

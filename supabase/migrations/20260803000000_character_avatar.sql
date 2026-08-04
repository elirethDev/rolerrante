-- Character avatar: Avatar del personaje (REQ-CAV-01.1)
-- Migración aditiva: añade la columna avatar_url a la tabla characters.
-- avatar_url es un enlace (URL http/https) validado en servidor; NULL cuando el
-- jugador no ha elegido avatar. No requiere backfill (por defecto NULL) y no
-- cambia el esquema de RLS existente (los controles de edición ya permiten a
-- jugador y staff editar personajes aprobados).
ALTER TABLE public.characters ADD COLUMN avatar_url text NULL;

-- La columna nace acá, así que el UPDATE grant de la columna vive aquí (no en
-- init_schema, que no la tiene aún): coherencia entre column grant y schema.
GRANT UPDATE (avatar_url) ON public.characters TO authenticated;

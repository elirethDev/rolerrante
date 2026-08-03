-- Character avatar: Avatar del personaje (REQ-CAV-01.1)
-- Migración aditiva: añade la columna avatar_url a la tabla characters.
-- avatar_url es un enlace (URL http/https) validado en servidor; NULL cuando el
-- jugador no ha elegido avatar. No requiere backfill (por defecto NULL) y no
-- cambia el esquema de RLS existente (los controles de edición ya permiten a
-- jugador y staff editar personajes aprobados).
ALTER TABLE public.characters ADD COLUMN avatar_url text NULL;

# RolErrante — Visión del proyecto

Aplicación web para organizar el rol por foro inspirado en `plumayespada.com`, ambientada en el universo de **World of Warcraft**.

## Objetivo
Facilitar a los jugadores la gestión de:
- Fichas de personajes (atributos, habilidades, magia, valores de combate).
- Historias de personajes (backstory con editor WYSIWYG).
- Eventos y campañas de rol, con inscripción de personajes y entrega automática de experiencia.
- Panel de maestres (GMs) para corrección y aprobación.
- Panel de administrador con poderes totales y log de auditoría de acciones GM.

## Stack
- **Framework:** SvelteKit (SSR/CSR con TypeScript).
- **Estilos:** Tailwind CSS + daisyUI.
- **Editor:** TipTap 2 (negrita, cursiva, colores, imágenes, listas, encabezados).
- **Backend/BD:** Supabase (Auth + Postgres + Storage).
- **Iconos:** lucide-svelte.

## Roles
| Rol | Descripción |
|-----|-------------|
| `pendiente` | Usuario registrado. Solo puede crear/editar su historia de personaje. |
| `rolero` | Tiene al menos un personaje con historia y ficha aprobados. Puede crear fichas, eventos, inscribirse a eventos, solicitar habilidades. |
| `gm` | Revisa y aprueba historias, fichas, solicitudes de habilidades y finalizaciones de eventos. |
| `admin` | Solo el dueño. Poderes totales, log de auditoría, settings del sistema, catálogos. |

## Principios de diseño
- **Múltiples personajes por usuario.** Cada personaje tiene su propia historia y ficha, ambas deben ser aprobadas por un GM.
- **Reglas configurables.** Razas, habilidades y costes/XP se guardan en BD para poder iterar sin tocar código.
- **Auditoría completa.** Cualquier acción de GM que cambie estado, otorgue XP o modifique datos queda registrada en `audit_logs`.
- **Seguridad por RLS + funciones Postgres.** Las operaciones críticas (gasto de XP, aprobaciones, finalización de eventos) se hacen mediante funciones SQL/RPC para ser atómicas.
- **Tema visual Azeroth.** Fondo oscuro piedra/cuero, dorado `#C8AA6E`, tipografía Cinzel para títulos.

## Documentos del proyecto
1. `01-SETUP.md` — Instalación y variables de entorno.
2. `02-DATABASE.md` — Esquema SQL completo con RLS, triggers y seed.
3. `03-FRONTEND.md` — Estructura de rutas y componentes.
4. `04-REGLAS-NEGOCIO.md` — Lógica de ficha, XP, eventos, habilidades.
5. `05-FASES.md` — Plan de implementación por fases con revisión.

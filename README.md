# Rol Errante

Plataforma de rol por foro ambientada en Azeroth (World of Warcraft). Comunidad de foro con fichas de personaje, crónicas, eventos, panel de administración y herramientas para el consejo de GMs.

Sitio en producción: [https://rolerrante.pages.dev](https://rolerrante.pages.dev) (desplegado automáticamente por Cloudflare Pages desde `main`).

## Stack

- **Frontend:** SvelteKit 2 + Svelte 5 + TypeScript strict
- **Estilos:** Tailwind CSS 4 + daisyUI 5 (tema Azeroth) + tokens propios en `src/app.css`
- **Backend:** Supabase (Postgres + Auth + RLS + Storage)
- **Editor:** TipTap 3 (con Link, color, character-count e imagen)
- **Autenticación:** Supabase Auth + SSR (`@supabase/ssr`), Turnstile de Cloudflare en formularios públicos, login con "Recordarme", recuperación de contraseña
- **Deploy:** Cloudflare Pages (adapter-cloudflare), auto-deploy en cada push a `main`

## Requisitos

- Node.js >= 22
- npm >= 10
- Supabase CLI (`npx supabase`) — opcional: solo migraciones y generación de tipos

## Setup

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con las claves de Supabase y Turnstile

# 3. (Opcional) Vincular Supabase CLI
npx supabase login
npx supabase link --project-ref <PROJECT-REF>
```

## Desarrollo

```bash
npm run dev        # Servidor de desarrollo en http://localhost:5173
npm run check      # TypeScript check con svelte-check (0 errores esperado)
npm run format:check # Prettier — verifica formato
```

## Tests

```bash
npm test           # Vitest (unit + componentes + rutas)
npm run lint       # ESLint
```

Suite actual: **~106 archivos / ~670+ tests** (componentes de UI, lógica de negocio, flujos de auth y migraciones).

## Base de datos

El schema vive en `supabase/migrations/` (versionado):

- Bases: perfiles con roles (pendiente/rolero/gm/admin), fichas, historias, eventos, habilidades, auditoría.
- Foro/CMS: categorías/foros, hilos, posts, reacciones ("Gracias"), pin/fijado, búsqueda, notificaciones de hilos, reportes, suspensiones y edictos (moderación con cola independiente y auditoría).
- RLS habilitada en todas las tablas; los cambios sensibles (roles, aprobación de fichas, RPCs) están protegidos en la propia base.

Para aplicarla / regenerar tipos:

```bash
npx supabase login                     # Una sola vez
npx supabase db push                   # Aplica migraciones pendientes al proyecto remoto
npx supabase gen types typescript --linked --schema public > src/lib/supabase/database.types.ts
```

## Deploy

No hace falta comando de deploy: **Cloudflare Pages está conectado al repo y publica cada push a `main`** (config en `wrangler.toml`, output `.svelte-kit/cloudflare`). Verificar el build local con `npm run build` antes de pushear.

**Variables de producción** se configuran en el dashboard de Cloudflare Pages (Settings → Environment variables), no en el repo:

| Variable                    | Descripción                                                  |
| --------------------------- | ------------------------------------------------------------ |
| `PUBLIC_SUPABASE_URL`       | URL del proyecto Supabase                                    |
| `PUBLIC_SUPABASE_ANON_KEY`  | Clave anónima/publicable                                     |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio (solo server-side, banner de auditoría GM) |
| `PUBLIC_TURNSTILE_SITE_KEY` | Clave pública de Cloudflare Turnstile                        |
| `TURNSTILE_SECRET_KEY`      | Clave secreta de Turnstile                                   |

> El envío de emails de autenticación (confirmación y recuperación) usa un **SMTP propio** (Resend) configurado en el dashboard de Supabase; los templates con la identidad de la marca viven en Open Design.

## Estructura

```
├── src/
│   ├── lib/               # auth, rules, supabase (client/server/serviceRole), forum, turnstile, utils, types
│   │   ├── components/    # ui (kit con tokens), forum, gm, admin, sheets, editor (TipTap)
│   │   └── ...
│   ├── routes/            # SvelteKit file-based routing (landing, foro, personajes, historias, eventos, gm, admin, auth)
│   └── app.html
├── static/                # favicon (sigil), hero-loop (video de fondo) + poster
├── supabase/
│   ├── config.toml
│   └── migrations/        # Schema versionado (RLS + políticas seguras)
├── tests/                 # Vitest
├── docs/                  # Reglas de juego y documentación
├── vitest.config.ts
├── eslint.config.mjs
├── .prettierrc
├── tailwind.config.js     # (Tailwind 4: la config CSS-first vive en src/app.css)
└── wrangler.toml
```

## Variables de entorno (.env.local)

| Variable                    | Descripción                           |
| --------------------------- | ------------------------------------- |
| `PUBLIC_SUPABASE_URL`       | URL del proyecto Supabase             |
| `PUBLIC_SUPABASE_ANON_KEY`  | Clave anónima/publicable              |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio (solo server-side)  |
| `PUBLIC_TURNSTILE_SITE_KEY` | Clave pública de Cloudflare Turnstile |
| `TURNSTILE_SECRET_KEY`      | Clave secreta de Turnstile            |

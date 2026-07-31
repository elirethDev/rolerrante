# Rol Errante

Plataforma de rol por foro ambientada en Azeroth (Warcraft). Fichas de personaje, historias, eventos y panel de administración.

## Stack

- **Frontend:** SvelteKit 2 + Svelte 5 + TypeScript strict
- **Estilos:** Tailwind CSS 3.4 + daisyUI 4 (tema Azeroth)
- **Backend:** Supabase (Postgres + Auth + Storage)
- **Editor:** TipTap 2
- **Deploy:** Cloudflare Pages (adapter-cloudflare)

## Requisitos

- Node.js >=20.18 (portable en `C:\tools\node-v20.18.2-win-x64` si la instalación de sistema falló)
- npm >=10
- Supabase CLI (`npx supabase --version`) — opcional, solo para migraciones y generación de tipos

### Configurar el PATH (Node portable)

Si usás el runtime portable, agregalo al PATH de la sesión antes de cualquier comando:

**PowerShell:**
```powershell
$env:PATH = "C:\tools\node-v20.18.2-win-x64;$env:PATH"
```

**CMD:**
```cmd
set PATH=C:\tools\node-v20.18.2-win-x64;%PATH%
```

## Setup

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con las claves de Supabase y Turnstile

# 3. (Opcional) Vincular Supabase CLI para regenerar tipos
npx supabase login
npx supabase link --project-ref dclkjcsvymjqkktvntdy
```

## Desarrollo

```bash
npm run dev        # Servidor de desarrollo en http://localhost:5173
npm run check      # TypeScript check con svelte-check
npm run build      # Build de producción (output: .svelte-kit/cloudflare)
npm run preview    # Previsualizar build
```

## Tests y calidad

```bash
npm test           # Vitest (15 tests contra src/lib/rules.ts)
npm run test:watch # Vitest en modo watch
npm run lint       # ESLint (0 errores, 84 warnings baseline)
npm run format     # Prettier check
```

## Base de datos

El schema vive en `supabase/migrations/`. Para aplicarlo:

```bash
npx supabase login                     # Una sola vez
npx supabase db push                   # Aplica migraciones al proyecto remoto
npx supabase gen types typescript --linked --schema public > src/lib/supabase/database.types.ts  # Regenerar tipos
```

## Deploy

```bash
npm run build
npx wrangler pages deploy .svelte-kit/cloudflare
```

Configuración de Cloudflare Pages en `wrangler.toml`. Requiere `wrangler login` la primera vez.

## Estructura

```
├── src/
│   ├── lib/           # auth, rules, supabase, utils, types
│   ├── routes/        # SvelteKit file-based routing
│   └── app.html
├── supabase/
│   ├── config.toml
│   └── migrations/    # Schema versionado
├── tests/             # Vitest
├── docs/              # Documentación técnica y reglas de juego
├── vitest.config.ts
├── eslint.config.mjs
├── .prettierrc
├── tailwind.config.js
└── wrangler.toml
```

## Variables de entorno (.env.local)

| Variable | Descripción |
|----------|-------------|
| `PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `PUBLIC_SUPABASE_ANON_KEY` | Clave anónima/publicable |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio (solo server-side) |
| `PUBLIC_TURNSTILE_SITE_KEY` | Clave pública de Cloudflare Turnstile |
| `TURNSTILE_SECRET_KEY` | Clave secreta de Turnstile |
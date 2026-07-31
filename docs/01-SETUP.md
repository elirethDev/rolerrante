# Setup del proyecto

## 1. Crear proyecto SvelteKit

Ejecutar desde la raíz del workspace:

```bash
cd c:/Users/pablo/Documents/RolErrante
npm create svelte@latest . -- --template skeleton --types typescript
npm install
```

Seleccionar:
- TypeScript: **Sí**
- ESLint/Prettier: opcional (recomendado Prettier)
- Playwright/vitest: opcional

## 2. Instalar dependencias

```bash
npm install -D tailwindcss postcss autoprefixer daisyui@latest
npm install @supabase/supabase-js @supabase/ssr
npm install lucide-svelte
npm install -D @tailwindcss/typography
npm install @tiptap/core @tiptap/pm @tiptap/starter-kit @tiptap/extension-image @tiptap/extension-color @tiptap/extension-text-style @tiptap/extension-underline
npm install -D @types/node
```

## 3. Configurar Tailwind + daisyUI

Crear `tailwind.config.js`:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      fontFamily: {
        cinzel: ['Cinzel', 'serif'],
      },
      colors: {
        azeroth: {
          gold: '#C8AA6E',
          dark: '#0F1115',
          panel: '#1A1C23',
          border: '#3A2F1F',
        },
      },
    },
  },
  plugins: [require('daisyui'), require('@tailwindcss/typography')],
  daisyui: {
    themes: [
      {
        azeroth: {
          primary: '#C8AA6E',
          secondary: '#2C3E50',
          accent: '#8E44AD',
          neutral: '#1A1C23',
          'base-100': '#0F1115',
          'base-200': '#1A1C23',
          'base-300': '#2A2D36',
          info: '#3498DB',
          success: '#27AE60',
          warning: '#F1C40F',
          error: '#C0392B',
        },
      },
    ],
  },
};
```

Crear `postcss.config.js`:

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

Crear `src/app.css`:

```css
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Inter:wght@300;400;500;600&display=swap');
@tailwind base;
@tailwind components;
@tailwind utilities;

html {
  font-family: 'Inter', sans-serif;
}

h1, h2, h3, h4, h5, h6, .font-cinzel {
  font-family: 'Cinzel', serif;
}
```

Actualizar `src/routes/+layout.svelte`:

```svelte
<script>
  import '../app.css';
</script>

<div data-theme="azeroth" class="min-h-screen bg-base-100 text-base-content">
  <slot />
</div>
```

## 4. Variables de entorno

Crear `.env.local` (nunca subir a git):

```env
PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
PUBLIC_SUPABASE_ANON_KEY=TU-ANON-KEY
SUPABASE_SERVICE_ROLE_KEY=TU-SERVICE-ROLE-KEY
```

> ⚠️ **Seguridad:** nunca expongas `SUPABASE_SERVICE_ROLE_KEY` en el cliente. Solo se usa en `hooks.server.ts` y server actions/loaders.

## 5. Crear clientes de Supabase

Crear `src/lib/supabase/client.ts`:

```ts
import { createBrowserClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export const loadSupabase = () => createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);
```

Crear `src/lib/supabase/server.ts`:

```ts
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import type { Cookies } from '@sveltejs/kit';

export const loadSupabase = (cookies: Cookies) => {
  return createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      get: (key) => cookies.get(key),
      set: (key, value, options) => cookies.set(key, value, { ...options, path: '/' }),
      remove: (key, options) => cookies.delete(key, { ...options, path: '/' }),
    },
  });
};

export const loadServiceRole = () => {
  return createServerClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};
```

## 6. Hooks de servidor (auth + roles)

Crear `src/hooks.server.ts` con la lógica de sesión y carga de perfil (ver Fase 2).

## 7. Añadir tipos de Supabase

Tras ejecutar el SQL en Supabase, generar tipos:

```bash
npx supabase gen types typescript --project-id TU-PROJECT-ID --schema public > src/lib/supabase/database.types.ts
```

Si no tienes la CLI de Supabase, instálala:

```bash
npm install -g supabase
```

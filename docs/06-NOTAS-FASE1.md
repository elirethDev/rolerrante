# Notas de cierre de la Fase 1

## Estado
- Proyecto SvelteKit creado y configurado en `/app`.
- Dependencias instaladas (Tailwind, daisyUI, Supabase SSR, TipTap, lucide-svelte).
- Tema visual "Azeroth" configurado con colores y tipografía Cinzel.
- Layout, Navbar, landing page y hooks de servidor implementados.
- Helpers de autenticación, reglas de juego y utilidades creados.
- Variables de entorno configuradas en `.env.local` con la URL y claves de Supabase.
- Build de producción exitoso (`npm run build`).

## Pendiente manual del usuario
Para completar la Fase 1, debes realizar estos pasos en el dashboard de Supabase:

### 1. Ejecutar el esquema SQL
1. Abre el SQL Editor del proyecto:
   https://supabase.com/dashboard/project/dclkjcsvymjqkktvntdy/editor
2. Crea una nueva consulta y pega TODO el contenido de `docs/supabase-schema.sql`.
3. Ejecuta la consulta. Esto creará tablas, tipos, RLS, triggers, funciones y seed de razas/habilidades.

### 2. Crear buckets de Storage
1. Ve a Storage:
   https://supabase.com/dashboard/project/dclkjcsvymjqkktvntdy/storage/buckets
2. Crea 3 buckets públicos:
   - `avatars`
   - `story-images`
   - `event-images`
3. Configura las políticas de acceso:
   - Lectura pública para los 3 buckets.
   - Escritura permitida para usuarios autenticados en `story-images` y `event-images`.
   - Escritura en `avatars` solo para el propietario del perfil.

### 3. Generar tipos TypeScript (opcional pero recomendado)
Una vez ejecutado el SQL, puedes regenerar los tipos con:

```powershell
$env:PATH = 'c:\Users\pablo\Documents\RolErrante\nodejs\node-v20.18.2-win-x64;' + $env:PATH
cd c:\Users\pablo\Documents\RolErrante\app
$env:SUPABASE_ACCESS_TOKEN = 'TU-ACCESS-TOKEN'
supabase gen types typescript --project-id dclkjcsvymjqkktvntdy --schema public > src/lib/supabase/database.types.ts
```

Para obtener el access token, ve a:
https://supabase.com/dashboard/account/tokens

> Nota: si no generas los tipos, el proyecto seguirá compilando porque `database.types.ts` actualmente contiene `export type Database = any;`. Los tipos reales mejorarán la seguridad de tipos en el código.

### 4. Primer usuario admin
Tras registrarte en la app, ejecuta en el SQL Editor:

```sql
UPDATE public.profiles SET role = 'admin' WHERE username = 'TU_USERNAME';
```

## Cómo ejecutar la app en desarrollo

```powershell
$env:PATH = 'c:\Users\pablo\Documents\RolErrante\nodejs\node-v20.18.2-win-x64;' + $env:PATH
cd c:\Users\pablo\Documents\RolErrante\app
npm run dev
```

Luego abre http://localhost:5173 en tu navegador.

## Próxima fase
Una vez completados los pasos manuales, avisame para continuar con la **Fase 2: Auth + roles** (registro, login, guards y perfil).

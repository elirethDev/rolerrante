# Deploy en Cloudflare Pages — RolErrante

## Requisitos previos

1. Cuenta en [Cloudflare](https://dash.cloudflare.com/)
2. Repositorio de Git con el código (GitHub, GitLab, etc.)
3. Proyecto Supabase configurado
4. Claves de Turnstile (Cloudflare)

## Variables de entorno necesarias

Configurar en el dashboard de Cloudflare Pages:

| Variable | Tipo | Descripción |
|----------|------|-------------|
| `PUBLIC_SUPABASE_URL` | Pública | URL del proyecto Supabase |
| `PUBLIC_SUPABASE_ANON_KEY` | Pública | Anon key de Supabase (pública) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secreto (Encrypt)** | Service role key — **NUNCA compartir** |
| `PUBLIC_TURNSTILE_SITE_KEY` | Pública | Site key de Cloudflare Turnstile |
| `TURNSTILE_SECRET_KEY` | **Secreto (Encrypt)** | Secret key de Turnstile — **NUNCA compartir** |

## Pasos para deploy

### 1. Preparar el código

```bash
# Instalar dependencias
cd app
npm install

# Verificar que el build funciona
npm run build
```

### 2. Conectar a Cloudflare Pages

1. Ir a [Cloudflare Dashboard](https://dash.cloudflare.com/) → Pages
2. Click "Create a project" → "Connect to Git"
3. Seleccionar el repositorio
4. Configurar:

| Configuración | Valor |
|---------------|-------|
| Production branch | `main` (o `master`) |
| Build command | `npm run build` |
| Build output directory | `.svelte-kit/cloudflare` |
| Root directory | `app` |

### 3. Configurar variables de entorno

En la sección "Environment variables" del proyecto:

1. Agregar las 5 variables listadas arriba
2. Las marcadas como **Secreto** deben tener el candado activado (Encrypt)
3. Guardar y desplegar

### 4. Dominio personalizado (opcional)

1. En Pages → tu proyecto → Custom domains
2. Agregar el dominio
3. Configurar los DNS según las instrucciones de Cloudflare

## Seguridad

### ⚠️ CRÍTICO: Proteger claves

- **NUNCA** subir `.env.local` al repositorio (está en `.gitignore`)
- **NUNCA** compartir `SUPABASE_SERVICE_ROLE_KEY` ni `TURNSTILE_SECRET_KEY`
- Usar variables **Encrypt** en Cloudflare para secrets
- El archivo `.env.example` tiene valores placeholder para desarrollo local

### Headers de seguridad ya implementados

- `Content-Security-Policy` — Controla qué recursos pueden cargarse
- `X-Frame-Options: DENY` — Previene clickjacking
- `X-Content-Type-Options: nosniff` — Previene MIME sniffing
- `Referrer-Policy: strict-origin-when-cross-origin` — Controla referrer
- `Permissions-Policy` — Desactiva APIs no utilizadas (cámara, micrófono)
- `Strict-Transport-Security` — Fuerza HTTPS

### Rate limiting

- Implementado en hooks.server.ts para formularios
- 10 requests por minuto por IP
- En Cloudflare, considerar activar [Rate Limiting](https://developers.cloudflare.com/waf/rate-limiting-rules/) adicional

## Desarrollo local

```bash
cd app
npm run dev
```

El archivo `.env.local` debe contener las claves de desarrollo:
```
PUBLIC_SUPABASE_URL=...
PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
PUBLIC_TURNSTILE_SITE_KEY=...
TURNSTILE_SECRET_KEY=...
```

## Verificación post-deploy

1. ✅ La página carga correctamente en el dominio
2. ✅ Los formularios tienen Turnstile funcionando
3. ✅ Login/registro funcionan
4. ✅ Las RLS policies de Supabase están activas
5. ✅ Los headers de seguridad se están enviando (verificar con DevTools)
</content
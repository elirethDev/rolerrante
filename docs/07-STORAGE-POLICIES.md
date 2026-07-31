# Políticas de Storage (buckets de imágenes)

Los buckets ya están creados. Ahora debes configurar las políticas de acceso desde el dashboard de Supabase.

## Pasos para cada bucket

1. Abre el dashboard de Storage:
   https://supabase.com/dashboard/project/dclkjcsvymjqkktvntdy/storage/buckets

2. Haz clic en cada bucket (`avatars`, `story-images`, `event-images`).

3. Ve a la pestaña **Policies** (Políticas).

4. Crea las políticas indicadas abajo usando el botón **New policy** → **Create from scratch**.

---

## Bucket: `avatars`

### Política 1: Lectura pública
- **Name**: `Avatar public read`
- **Allowed operation**: SELECT
- **Target roles**: `anon`, `authenticated`
- **Policy definition**: `true`

### Política 2: Subida propia
- **Name**: `Avatar owner upload`
- **Allowed operation**: INSERT
- **Target roles**: `authenticated`
- **Policy definition**:

```sql
((storage.foldername(name))[1] = auth.uid()::text)
```

> Nota: esta política asume que las imágenes se suben a una carpeta con el UUID del usuario, por ejemplo `avatars/<user-id>/foto.png`.

### Política 3: Actualización propia
- **Name**: `Avatar owner update`
- **Allowed operation**: UPDATE
- **Target roles**: `authenticated`
- **Policy definition**:

```sql
((storage.foldername(name))[1] = auth.uid()::text)
```

### Política 4: Borrado propio
- **Name**: `Avatar owner delete`
- **Allowed operation**: DELETE
- **Target roles**: `authenticated`
- **Policy definition**:

```sql
((storage.foldername(name))[1] = auth.uid()::text)
```

---

## Bucket: `story-images`

### Política 1: Lectura pública
- **Name**: `Story images public read`
- **Allowed operation**: SELECT
- **Target roles**: `anon`, `authenticated`
- **Policy definition**: `true`

### Política 2: Subida para usuarios autenticados
- **Name**: `Story images authenticated upload`
- **Allowed operation**: INSERT
- **Target roles**: `authenticated`
- **Policy definition**: `true`

### Política 3: Actualización propia (opcional)
- **Name**: `Story images owner update`
- **Allowed operation**: UPDATE
- **Target roles**: `authenticated`
- **Policy definition**: `true`

### Política 4: Borrado propio (opcional)
- **Name**: `Story images owner delete`
- **Allowed operation**: DELETE
- **Target roles**: `authenticated`
- **Policy definition**: `true`

---

## Bucket: `event-images`

### Política 1: Lectura pública
- **Name**: `Event images public read`
- **Allowed operation**: SELECT
- **Target roles**: `anon`, `authenticated`
- **Policy definition**: `true`

### Política 2: Subida para usuarios autenticados
- **Name**: `Event images authenticated upload`
- **Allowed operation**: INSERT
- **Target roles**: `authenticated`
- **Policy definition**: `true`

### Política 3: Actualización propia (opcional)
- **Name**: `Event images owner update`
- **Allowed operation**: UPDATE
- **Target roles**: `authenticated`
- **Policy definition**: `true`

### Política 4: Borrado propio (opcional)
- **Name**: `Event images owner delete`
- **Allowed operation**: DELETE
- **Target roles**: `authenticated`
- **Policy definition**: `true`

---

## Nota importante

Si prefieres no usar carpetas por usuario en `avatars`, puedes simplificar la política de INSERT/UPDATE/DELETE a `true` para usuarios autenticados. Sin embargo, organizar por carpeta (`avatars/<user-id>/`) es más seguro y evita que un usuario sobrescriba la foto de otro.

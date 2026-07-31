# Estructura de rutas y componentes

## Árbol de rutas SvelteKit

```
src/routes
├── +layout.svelte              # Tema, Navbar, carga de perfil
├── +page.svelte                # Landing
├── login/+page.svelte          # Login
├── registro/+page.svelte       # Registro
├── perfil/+page.svelte         # Mi perfil
├── personajes
│   ├── +page.svelte            # Mis personajes
│   ├── nuevo/+page.svelte      # Wizard: historia + ficha
│   └── [id]/+page.svelte       # Vista pública de ficha
├── historias
│   └── +page.svelte            # Listado público de historias aprobadas
├── eventos
│   ├── +page.svelte            # Listado de eventos
│   ├── nuevo/+page.svelte      # Crear evento
│   └── [id]/+page.svelte       # Detalle, inscripción, sesiones
├── solicitudes
│   ├── +page.svelte            # Mis solicitudes de habilidad
│   └── nueva/+page.svelte      # Crear solicitud
├── gm
│   ├── +layout.svelte          # Sidebar de maestre
│   ├── +page.svelte            # Dashboard GM
│   ├── historias/+page.svelte  # Cola de historias
│   ├── fichas/+page.svelte     # Cola de fichas
│   ├── habilidades/+page.svelte # Cola de solicitudes de habilidad
│   └── eventos/+page.svelte    # Cola de finalizaciones de eventos
└── admin
    ├── +layout.svelte          # Sidebar admin
    ├── +page.svelte            # Dashboard admin
    ├── usuarios/+page.svelte   # Gestión de roles
    ├── logs/+page.svelte       # Audit logs
    ├── catalogos/+page.svelte  # Razas y habilidades
    └── ajustes/+page.svelte    # Settings XP y creación
```

## Componentes reutilizables clave

```
src/lib/components
├── ui
│   ├── Navbar.svelte
│   ├── Sidebar.svelte
│   ├── Card.svelte
│   ├── BadgeStatus.svelte
│   ├── Button.svelte
│   └── Modal.svelte
├── forms
│   ├── AttributeInput.svelte      # Control +/-/slider de atributo
│   ├── SkillPicker.svelte         # Selector de habilidad + especialización
│   └── SkillRequestForm.svelte    # Formulario de solicitud de habilidad
├── tiptap
│   ├── TipTapEditor.svelte        # Editor WYSIWYG completo
│   └── TipTapViewer.svelte        # Renderizado seguro del contenido
├── sheets
│   ├── CharacterSheetSummary.svelte
│   └── CombatValues.svelte        # PV, PM, iniciativa, ataque, defensa
└── events
    ├── EventCard.svelte
    ├── ParticipantList.svelte
    └── SessionList.svelte
```

## Helpers y tipos

```
src/lib
├── supabase
│   ├── client.ts
│   ├── server.ts
│   └── database.types.ts
├── auth.ts                       # Guards y funciones de rol
├── utils.ts                      # Formateo de fechas, slugs, etc.
├── rules.ts                      # Cálculo de valores de combate, rangos
└── types.ts                      # Tipos globales
```

## Guards de ruta

Se implementan en `src/lib/auth.ts`:

```ts
export function requireAuth(locals: App.Locals) {
  if (!locals.user) throw redirect(303, '/login');
}

export function requireRole(locals: App.Locales, roles: UserRole[]) {
  if (!roles.includes(locals.profile?.role)) throw redirect(303, '/');
}
```

Y se usan en `+page.server.ts` de cada ruta protegida:

```ts
import { requireAuth, requireRole } from '$lib/auth';

export const load = async ({ locals }) => {
  requireAuth(locals);
  requireRole(locals, ['gm', 'admin']);
  // ...
};
```

## Comportamiento esperado por pantalla

### Landing `/`
- Breve presentación + acceso a login/registro.
- Listado público de personajes aprobados (tarjetas con retrato, raza, nombre).

### Login / Registro
- Registro con email, contraseña, username (guardado en `raw_user_meta_data`).
- Al registrarse, Supabase Auth + trigger crean el perfil con rol `pendiente`.

### Mis personajes `/personajes`
- Grid de tarjetas con estado (borrador/pendiente/aprobado/rechazado).
- Botón "Crear personaje" → wizard `/personajes/nuevo`.
- Permite editar historia/ficha mientras esté en borrador/rechazado.

### Wizard de personaje `/personajes/nuevo`
Formulario de 2 pasos:
1. **Historia**: título + editor TipTap.
2. **Ficha**: nombre, raza, edad, sexo, descripción física, atributos (puntos restantes), habilidades (puntos restantes), fuente de maná.

Al enviar: inserta personaje en estado `borrador` con historia en `borrador`.

### Vista de ficha `/personajes/[id]`
- Solo visible si está aprobada (o es propietario/GM/admin).
- Muestra atributos, habilidades agrupadas por atributo, valores de combate calculados, historia aprobada.

### Eventos `/eventos`
- Listado paginado: casual, evento, campaña.
- Filtros por estado.
- Botón "Participar" (elige personaje aprobado).
- Creador puede marcar "Finalizar" → pasa a `finalizacion_pendiente`.

### Detalle de evento `/eventos/[id]`
- Título, descripción rica, tipo, fechas, ubicación.
- Lista de sesiones (masteos) con resumen.
- Lista de participantes con personajes.
- Botones según rol: editar (creador), inscribirse (rolero), finalizar (creador), confirmar cierre (GM).

### Solicitudes de habilidad `/solicitudes`
- Listado por personaje.
- Botón "Nueva solicitud" (máx 4 habilidades).
- Validación: coste XP = nuevo nivel, saldo suficiente.

### Panel GM `/gm/*`
- Historias: cola de aprobación con previsualización.
- Fichas: cola de aprobación con resumen de validaciones.
- Habilidades: cola de solicitudes, ver justificación y coste.
- Eventos: cola de eventos en `finalizacion_pendiente`, confirmar cierre.

### Panel Admin `/admin/*`
- Dashboard con métricas rápidas.
- Usuarios: cambiar roles (ascender a GM, degradar, etc. Todo se loguea).
- Logs: tabla filtrable de `audit_logs`.
- Catálogos: CRUD de razas y habilidades.
- Ajustes: edición de `xp_rewards` y `character_creation`.

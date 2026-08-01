# Plan de implementación por fases

Cada fase termina en un punto estable y revisable. Al finalizar cada una, se notifica al usuario para validación antes de continuar.

## Fase 1 — Setup, tema y base de datos (entregable: app arranca y BD creada)

- [x] Crear scaffold de SvelteKit con TypeScript en `/app`.
- [x] Instalar Tailwind, daisyUI, TipTap, lucide-svelte, @supabase/ssr.
- [x] Configurar tema visual "Azeroth" (colores, fuente Cinzel).
- [x] Crear layout base, landing y estructura de carpetas.
- [x] Configurar clientes Supabase (browser + server + service role).
- [x] Crear `hooks.server.ts` para cargar sesión y perfil en `locals`.
- [x] Ejecutar en Supabase el SQL completo del documento `02-DATABASE.md`.
- [ ] Crear buckets de Storage (`avatars`, `story-images`, `event-images`).
- [ ] Generar tipos de BD con `supabase gen types`.
- [x] Crear `.env.local` de ejemplo (sin claves reales).

**Revisión:** el usuario debe ver la app corriendo localmente (`npm run dev`) y la BD poblada con razas/habilidades.

## Fase 2 — Autenticación y roles (entregable: login/registro funcional y guards)

- [x] Página de registro con email, username y contraseña.
- [x] Página de login.
- [ ] Trigger de Supabase crea perfil automáticamente.
- [x] Middleware `hooks.server.ts` inyecta `user` y `profile` en `locals`.
- [x] Funciones de guard `requireAuth`, `requireRole`.
- [x] Navbar adaptativa según rol (login/logout, enlaces a panel GM/Admin).
- [x] Ruta `/perfil` para ver/editar perfil básico.
- [x] Protección de rutas GM y Admin.

**Revisión:** registrar un usuario nuevo, verificar que su rol es `pendiente` y que no puede entrar a `/gm` ni `/admin`.

## Fase 3 — Historias y editor WYSIWYG (entregable: crear y enviar historia para aprobación)

- [x] Componente `TipTapEditor` con negrita, cursiva, listas, encabezados, color, imágenes.
- [ ] Subida de imágenes a Storage `story-images` desde el editor.
- [ ] Wizard de personaje: paso 1 — historia (título + contenido).
- [ ] Guardar personaje en `borrador` con historia en `borrador`.
- [x] Botón "Enviar historia" → pasa historia a `pendiente`.
- [x] Listado `/personajes` con estados.
- [x] Vista pública `/historias` con historias aprobadas.

**Revisión:** crear un personaje, escribir historia con imágenes y enviarla. Verificar estado en BD.

## Fase 4 — Creador de ficha (entregable: ficha completa con validaciones)

- [x] Wizard paso 2 — datos del personaje: nombre, raza, edad, sexo, descripción física.
- [x] Asignador de atributos con controles +/- y puntos restantes.
- [x] Validación de regla 10↔4 y total de puntos.
- [x] Selector de habilidades con especializaciones y puntos restantes.
- [x] Validación de máximo nivel 2 en creación.
- [x] Selección de fuente de maná (Inteligencia o Espíritu).
- [ ] Cálculo y vista previa de valores de combate.
- [x] Botón "Enviar ficha" → pasa personaje a `pendiente`.
- [x] Vista pública `/personajes/[id]` con ficha completa.

**Revisión:** crear una ficha válida, comprobar que rechaza distribuciones incorrectas y muestra valores de combate.

## Fase 5 — Eventos y entrega de XP (entregable: flujo completo de evento)

- [x] Crear evento (título, descripción TipTap, tipo, fechas, ubicación, máximo jugadores).
- [x] Listado `/eventos` con filtros.
- [x] Detalle de evento con inscripción (selección de personaje aprobado).
- [x] Lista de sesiones/masteos dentro del evento.
- [ ] Creador puede marcar evento como `finalizacion_pendiente`.
- [x] Panel GM `/gm/eventos` para confirmar finalización.
- [ ] Trigger `confirm_event_completion` otorga XP a creador y participantes.
- [ ] Mostrar historial de XP en perfil/personaje.

**Revisión:** crear evento, inscribir personajes, finalizar y confirmar; verificar saldos de XP en BD.

## Fase 6 — Solicitudes de habilidad (entregable: mejorar habilidades gastando XP)

- [x] Formulario de solicitud: elegir hasta 4 habilidades, niveles destino, justificación.
- [x] Cálculo de coste XP automático.
- [x] Validación de saldo suficiente y niveles válidos.
- [x] Panel GM `/gm/habilidades` para aprobar/rechazar.
- [ ] Trigger `approve_skill_request` descuenta XP y actualiza habilidades.
- [x] Vista de habilidades actualizada en `/personajes/[id]`.

**Revisión:** solicitar subir habilidades, aprobar como GM y comprobar descuento y nuevo nivel.

## Fase 7 — Panel GM y Panel Admin (entregable: gestión completa)

- [x] Dashboard GM con contadores de colas.
- [x] `/gm/historias` y `/gm/fichas` con acciones aprobar/rechazar + notas.
- [x] `/gm/habilidades` y `/gm/eventos` operativos.
- [x] Dashboard Admin con métricas.
- [x] `/admin/usuarios` para cambiar roles (con log de auditoría).
- [x] `/admin/logs` tabla filtrable de `audit_logs`.
- [x] `/admin/catalogos` CRUD de razas y habilidades.
- [x] `/admin/ajustes` edición de `xp_rewards` y `character_creation`.

**Revisión:** todas las acciones de GM/admin generan entradas en `audit_logs`.

## Fase 8 — Pulido UX/UI (entregable: producto final visualmente pulido)

- [ ] Ajustar espaciados, tipografías y paleta en todas las pantallas.
- [ ] Añadir estados vacíos, loaders y mensajes de error.
- [ ] Mejorar navegación móvil.
- [ ] Revisar contraste y accesibilidad básica.
- [ ] Optimizar imágenes y políticas de Storage.
- [ ] Preparar build de producción (`npm run build`).

**Revisión:** revisión final del usuario y ajustes menores.

---
**Nota de divergencias** (agosto 2026): El plan original describe algunas funcionalidades que se implementaron de forma distinta o cuya verificación requiera acceso directo a la base de datos:

1. **Imágenes en historias**: Las imágenes del editor TipTap se insertan mediante URL ingresada por el usuario ("URL-from-prompt"), no mediante subida a un bucket de Storage `story-images`. El bucket y las políticas correspondientes no fueron verificados.
2. **Creación de personaje**: Se usan rutas separadas (`/personajes/nuevo` y `/personajes/[id]/editar`) en lugar del flujo tipo wizard de dos pasos descrito en las fases 3 y 4. No existe el estado intermedio "borrador" para personajes.
3. **Vista previa de combate en creación**: La computación de valores de combate existe (componente `CombatValues` y `rules.combatValues()`) pero solo se muestra en la vista detalle `/personajes/[id]`; no hay vista previa en el creador de ficha `/personajes/nuevo`.
4. **Elementos del lado de la base de datos**: Los triggers (`confirm_event_completion`, `approve_skill_request`, creación automática de perfil), buckets de Storage (`avatars`, `story-images`, `event-images`), la generación de tipos (`supabase gen types`), y las funcionalidades que dependen de ellos (marcar evento como `finalizacion_pendiente`, historial de XP en perfil/personaje) no fueron verificados contra la base de datos de producción. Quedan marcados como pendientes de verificación.

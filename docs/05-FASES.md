# Plan de implementación por fases

Cada fase termina en un punto estable y revisable. Al finalizar cada una, se notifica al usuario para validación antes de continuar.

## Fase 1 — Setup, tema y base de datos (entregable: app arranca y BD creada)

- [ ] Crear scaffold de SvelteKit con TypeScript en `/app`.
- [ ] Instalar Tailwind, daisyUI, TipTap, lucide-svelte, @supabase/ssr.
- [ ] Configurar tema visual "Azeroth" (colores, fuente Cinzel).
- [ ] Crear layout base, landing y estructura de carpetas.
- [ ] Configurar clientes Supabase (browser + server + service role).
- [ ] Crear `hooks.server.ts` para cargar sesión y perfil en `locals`.
- [ ] Ejecutar en Supabase el SQL completo del documento `02-DATABASE.md`.
- [ ] Crear buckets de Storage (`avatars`, `story-images`, `event-images`).
- [ ] Generar tipos de BD con `supabase gen types`.
- [ ] Crear `.env.local` de ejemplo (sin claves reales).

**Revisión:** el usuario debe ver la app corriendo localmente (`npm run dev`) y la BD poblada con razas/habilidades.

## Fase 2 — Autenticación y roles (entregable: login/registro funcional y guards)

- [ ] Página de registro con email, username y contraseña.
- [ ] Página de login.
- [ ] Trigger de Supabase crea perfil automáticamente.
- [ ] Middleware `hooks.server.ts` inyecta `user` y `profile` en `locals`.
- [ ] Funciones de guard `requireAuth`, `requireRole`.
- [ ] Navbar adaptativa según rol (login/logout, enlaces a panel GM/Admin).
- [ ] Ruta `/perfil` para ver/editar perfil básico.
- [ ] Protección de rutas GM y Admin.

**Revisión:** registrar un usuario nuevo, verificar que su rol es `pendiente` y que no puede entrar a `/gm` ni `/admin`.

## Fase 3 — Historias y editor WYSIWYG (entregable: crear y enviar historia para aprobación)

- [ ] Componente `TipTapEditor` con negrita, cursiva, listas, encabezados, color, imágenes.
- [ ] Subida de imágenes a Storage `story-images` desde el editor.
- [ ] Wizard de personaje: paso 1 — historia (título + contenido).
- [ ] Guardar personaje en `borrador` con historia en `borrador`.
- [ ] Botón "Enviar historia" → pasa historia a `pendiente`.
- [ ] Listado `/personajes` con estados.
- [ ] Vista pública `/historias` con historias aprobadas.

**Revisión:** crear un personaje, escribir historia con imágenes y enviarla. Verificar estado en BD.

## Fase 4 — Creador de ficha (entregable: ficha completa con validaciones)

- [ ] Wizard paso 2 — datos del personaje: nombre, raza, edad, sexo, descripción física.
- [ ] Asignador de atributos con controles +/- y puntos restantes.
- [ ] Validación de regla 10↔4 y total de puntos.
- [ ] Selector de habilidades con especializaciones y puntos restantes.
- [ ] Validación de máximo nivel 2 en creación.
- [ ] Selección de fuente de maná (Inteligencia o Espíritu).
- [ ] Cálculo y vista previa de valores de combate.
- [ ] Botón "Enviar ficha" → pasa personaje a `pendiente`.
- [ ] Vista pública `/personajes/[id]` con ficha completa.

**Revisión:** crear una ficha válida, comprobar que rechaza distribuciones incorrectas y muestra valores de combate.

## Fase 5 — Eventos y entrega de XP (entregable: flujo completo de evento)

- [ ] Crear evento (título, descripción TipTap, tipo, fechas, ubicación, máximo jugadores).
- [ ] Listado `/eventos` con filtros.
- [ ] Detalle de evento con inscripción (selección de personaje aprobado).
- [ ] Lista de sesiones/masteos dentro del evento.
- [ ] Creador puede marcar evento como `finalizacion_pendiente`.
- [ ] Panel GM `/gm/eventos` para confirmar finalización.
- [ ] Trigger `confirm_event_completion` otorga XP a creador y participantes.
- [ ] Mostrar historial de XP en perfil/personaje.

**Revisión:** crear evento, inscribir personajes, finalizar y confirmar; verificar saldos de XP en BD.

## Fase 6 — Solicitudes de habilidad (entregable: mejorar habilidades gastando XP)

- [ ] Formulario de solicitud: elegir hasta 4 habilidades, niveles destino, justificación.
- [ ] Cálculo de coste XP automático.
- [ ] Validación de saldo suficiente y niveles válidos.
- [ ] Panel GM `/gm/habilidades` para aprobar/rechazar.
- [ ] Trigger `approve_skill_request` descuenta XP y actualiza habilidades.
- [ ] Vista de habilidades actualizada en `/personajes/[id]`.

**Revisión:** solicitar subir habilidades, aprobar como GM y comprobar descuento y nuevo nivel.

## Fase 7 — Panel GM y Panel Admin (entregable: gestión completa)

- [ ] Dashboard GM con contadores de colas.
- [ ] `/gm/historias` y `/gm/fichas` con acciones aprobar/rechazar + notas.
- [ ] `/gm/habilidades` y `/gm/eventos` operativos.
- [ ] Dashboard Admin con métricas.
- [ ] `/admin/usuarios` para cambiar roles (con log de auditoría).
- [ ] `/admin/logs` tabla filtrable de `audit_logs`.
- [ ] `/admin/catalogos` CRUD de razas y habilidades.
- [ ] `/admin/ajustes` edición de `xp_rewards` y `character_creation`.

**Revisión:** todas las acciones de GM/admin generan entradas en `audit_logs`.

## Fase 8 — Pulido UX/UI (entregable: producto final visualmente pulido)

- [ ] Ajustar espaciados, tipografías y paleta en todas las pantallas.
- [ ] Añadir estados vacíos, loaders y mensajes de error.
- [ ] Mejorar navegación móvil.
- [ ] Revisar contraste y accesibilidad básica.
- [ ] Optimizar imágenes y políticas de Storage.
- [ ] Preparar build de producción (`npm run build`).

**Revisión:** revisión final del usuario y ajustes menores.

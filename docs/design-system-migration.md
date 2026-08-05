# RolErrante — Design-System Migration Handoff

> Written for future agents working on `C:\Users\pablo\Documents\RolErrante`.
> Scope: how the visual design system (created in the Open Design workspace,
> `rolerrante-design-system-2fb7`) maps onto the real SvelteKit app, what has
> been migrated, and — most importantly — **what is NOT implemented yet**.

## 1. Source of truth

- **Design screens**: `C:\Users\pablo\AppData\Roaming\Open Design\namespaces\release-stable-win\data\projects\rolerrante-design-system-2fb7\screens\*.html` (36 screens).
- **Design tokens/styles**: `assets/rolerrante.css` (in the design workspace) mirror 1:1 the Tailwind v4 theme in `src/app.css` of this repo (`@theme` + azeroth palette tokens: `--color-azeroth-*`, `--radius-*`, `--shadow-*`).
- **Home page**: only `screens/landing-community.html` exists (the old `landing.html` was removed; all internal links point to `landing-community.html`).

## 2. Migration strategy (already applied)

The design system uses custom CSS classes; the app uses Tailwind v4 + DaisyUI with an
`azeroth` theme whose tokens already match the design palette exactly. Therefore the
migration is **class-based, not "rewrite every page"**:

1. `src/app.css` now ships a **component layer** (all classes used by the design screens
   are declared here once, using azeroth tokens): `.app-shell`, `.page-head`, `.page-title`,
   `.page-sub`, `.kicker`, `.tabs/.tab`, `.media-card`, `.char-card`, `.panel`, `.form-card`,
   `.budget-bar`, `.tiptap`, `.empty-slot`, `.notice`, `.top-actions`, `.search-wrap`,
   `.notif-row`, `.activity-row`, `.grid2`.
2. Shared UI components live in `src/lib/components/ui/` (Navbar, Footer, Field, Input,
   Select, Button, Badge, Tag, Avatar, Modal, Pager, EmptyState, Breadcrumbs) and already
   consume the azeroth tokens.
3. New reusable components added for the pattern:
   - `src/lib/components/ui/PageHeader.svelte` — kicker + title + subtitle + actions
     (`<PageHeader kicker="..." title="..." subtitle="...">{#snippet actions()}...{/snippet}</PageHeader>`).
   - `src/lib/components/ui/FilterTabs.svelte` — filter tabs with counts
     (`<FilterTabs tabs={[...]} value={x} onchange={...} />`).
4. Root layout `src/routes/+layout.svelte` uses the system width (`max-w-[1180px]`)
   instead of Tailwind's default `container`.

### Rules for future migration work
- **Never** introduce raw hex colors. Use only `azeroth` tokens or `--color-azeroth-*`
  CSS vars. Derived colors come from `oklch()`.
- **Do not** duplicate component CSS across pages — add to the `app.css` layer or a
  component `<style>`.
- Keep existing `data-testid` attributes and server-test contracts intact (tests cover
  server `load()`/actions, not page markup — markup is safe to restyle).
- Buttons: keep DaisyUI `btn btn-primary|ghost|secondary` classes (already themed).
- Tip/Tap rich text: the real app uses `TipTapEditor`/`TipTapViewer`; the `.tiptap`
  visual shell in `app.css` matches that editor's look.

## 3. Screen → route mapping (with migration status)

| # | Design screen | Real route | Status |
|---|---|---|---|
| 1 | `landing-community.html` | `/` | ✅ **Already aligned** (hero, feed, discord, sections) |
| 2 | `forum-index.html` | `/foro` | 🟡 existing page uses its own styles |
| 3 | `thread.html` | `/foro/[threadId]` | 🟡 existing page uses its own styles |
| 4 | `nueva-ficha.html` | `/personajes/nuevo` | 🟡 existing form is functional (Tailwind) |
| 5 | `personajes.html` | `/personajes` | ✅ **Migrated** (PageHeader + FilterTabs + char-card) |
| 6 | `ficha.html` | `/personajes/[id]` | 🟡 existing detail page |
| 7 | `perfil.html` | `/perfil` | ✅ **Migrated** (PageHeader + panel) |
| 8 | `eventos.html` | `/eventos` | ✅ **Migrated** (PageHeader + FilterTabs + media-card) |
| 9 | `evento-nuevo.html` | `/eventos/nuevo` | 🟡 existing form |
| 10 | `evento.html` | `/eventos/[id]` | 🟡 existing detail (ParticipantList/SessionList) |
| 11 | `historias.html` | `/historias` | ✅ **Migrated** (PageHeader + FilterTabs + media-card) |
| 12 | `historia-nueva.html` | `/historias/nueva` | 🟡 existing form |
| 13 | `historia.html` | `/historias/[id]` | 🟡 existing detail (moderation panel present) |
| 14 | `historia-editar.html` | `/historias/[id]/editar` | 🟡 existing form |
| 15 | `foro-nuevo.html` | `/foro/nuevo` | 🟡 existing form (draft autosave present) |
| 16 | `foro-editar.html` | `/foro/[threadId]/editar` | 🟡 existing form |
| 17 | `notificaciones.html` | `/notificaciones` | ✅ **Migrated** (PageHeader + notif-rows) |
| 18 | `solicitudes.html` | `/solicitudes` | ✅ **Migrated** (PageHeader + SkillRequestForm + history) |
| 19 | `forgot-password.html` | `/forgot-password` | 🟡 existing auth card |
| 20 | `reset-password.html` | `/reset-password` | 🟡 existing auth card |
| 21 | `gm.html` | `/gm` | 🟡 existing worklist page |
| 22 | `gm-eventos.html` | `/gm/eventos` | 🟡 existing page |
| 23 | `gm-fichas.html` | `/gm/fichas` | 🟡 existing page |
| 24 | `gm-historias.html` | `/gm/historias` | 🟡 existing page |
| 25 | `gm-habilidades.html` | `/gm/habilidades` | 🟡 existing page |
| 26 | `gm-solicitud.html` | `/gm/solicitudes/[id]` | 🟡 existing detail |
| 27 | `admin.html` | `/admin` | 🟡 existing dashboard |
| 28 | `admin-usuarios.html` | `/admin/usuarios` | 🟡 existing page |
| 29 | `admin-catalogos.html` | `/admin/catalogos` | 🟡 existing page |
| 30 | `admin-foro.html` | `/admin/foro` | 🟡 existing page |
| 31 | `admin-moderacion.html` | `/admin/moderacion` | 🟡 existing page |
| 32 | `admin-auditoria.html` | `/admin/auditoria` | 🟡 existing page |
| 33 | `admin-ajustes.html` | `/admin/ajustes` | 🟡 existing page |
| 34 | `login.html` | `/login` | 🟡 existing auth card |
| 35 | `register.html` | `/registro` | 🟡 existing auth card |
| 36 | `error.html` | `+error.svelte` | 🟡 existing error page (has hero style already) |

Legend: ✅ migrated to the new system styles · 🟡 existing functional page that could
be restyled with the app.css layer (low priority, cosmetic).

## 4. Functionality in the DESIGN that is NOT implemented in the app

The following features appear in the design screens but have **no backend, no route
logic, or no component** in the real app. Each is a candidate for future implementation.

### 4.1 Characters / fichas
- **Census browsing for non-owners** — `personajes.html` shows the whole realm census
  (approved characters by all players) with server-side search + race filter. The real
  `/personajes` route only lists **my** characters and requires auth
  (`+page.server.ts` redirects guests). A public census (approved-only) does not exist.
- **Avatar upload** — the design shows avatar previews everywhere, but the app only
  stores `avatar_url` as a text URL (perfil form, character form). No upload endpoint /
  storage.
- **Character edit status flow** — ficha.html shows "Editar ficha → guarda como borrador
  → el consejo la aprueba". The app has `/personajes/[id]/editar`, but there is no
  explicit "send back to review" / re-approval loop for edits (only creation goes to
  `pendiente`).

### 4.2 Stories / crónicas
- **Public story list w/ per-status tabs** — done on the player side (migrated); a public
  (guest-visible) "Crónicas del reino" consumable without login is not exposed.

### 4.3 Events / eventos
- **Session management (sesiones)** — `evento.html` shows a `SessionList` (fecha, título,
  resumen, "masterizado"). The app renders `SessionList` in the detail page but there is
  **no UI to create/edit event sessions** (no form component, no action).
- **Participant self-inscription UX** — the detail page reads participants and has a
  `/join` action, but the design adds: XP capping display, waiting-list semantics, and a
  clear "inscripción confirmada" state. Confirm these against the real action.

### 4.4 GM panel
- **One-click approve / inline correct on Fichas & Historias** (`gm.html` worklist has an
  inline edit + autosave demo). Real `/gm` page: please compare against the design — the
  demo used `[data-wl]` cards with inline comments; the app implements review via the
  item detail pages. A unified worklist with inline reject/comment may be missing.
- **XP-by-event finalization** exists (`/gm/eventos`); confirm the `gm.html` "revision
  queue" aggregates fichas/historias/habilidades like the design's single column.

### 4.5 Admin panel
- **Category permission matrix** — `admin-foro.html` (design) shows per-category
  "Solo lectura / visible para invitados" and role matrix. The app has `PermissionPanel`
  (used in `/admin/foro`), but confirm a per-role matrix exists; the design implies a
  more complete matrix view.
- **Audit "Solo foro" filter toggle** — implemented in real page (client filter).
- **Threat/abuse protection note** in moderación: the design flags that GM/Admin targets
  cannot be sanctioned; the real page already guards this (REQ-MOD-ENF-04) — verify only.

### 4.6 Profile
- **Activity/reputation KPIs** — `perfil.html` shows KPIs (personajes, crónicas, eventos,
  reputación) and a "Tu actividad" feed. The real `/perfil` only edits display name +
  avatar. The KPIs + activity feed are **not implemented**.

### 4.7 Commerce-ish / misc
- **Reputación** (reputation points) referenced in design badges and perfil KPIs — **no
  column or logic exists** in the schema (`docs/supabase-schema.sql`).
- **Staff "✦" marker** — `Avatar` supports `staff`, but no profile field drives it yet.

## 5. Where to look (index)

- Types: `src/lib/types.ts`
- Rules (attributes, skills, combat, XP costs): `src/lib/rules.ts`
- Auth/roles: `src/lib/auth.ts`, `src/lib/utils.ts`
- Schema: `docs/supabase-schema.sql`
- Shared UI components: `src/lib/components/ui/`
- Domain components: `src/lib/components/{events,skils,notifications,sheets,editor,navigation}/`
- Route pages: `src/routes/**/+page.svelte` (+ server loads/actions in `+page.server.ts`)
- Tests: `tests/` (unit, server-side) — keep green; page markup is free to restyle.
- Commands: `npm run check` (svelte-check), `npm test` (vitest). Note: some suites fail on
  CI-less environments (Supabase migrations, `pr2-player` visual tests, `spoiler.css`);
  these are environmental, not code regressions.

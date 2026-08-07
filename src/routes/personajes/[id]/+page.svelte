<script lang="ts">
  import { resolve } from '$app/paths';
  import type { PageData } from './$types';
  import { statusLabel, statusColor, formatDate } from '$lib/utils';
  import { ATTRIBUTE_LABELS, combatValues, getRankName, ATTR_BASE_VALUE, ATTR_POINTS_BUDGET } from '$lib/rules';
  import type { Character, CharacterSkill } from '$lib/types';
  import { FileText, MessagesSquare } from '@lucide/svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';

  let { data }: { data: PageData } = $props();

  // character comes from Supabase join query with embedded skills, stories, race
  // Use auto-inferred DB type but cast to Character at component call sites
  let character = $derived(data.character);
  let skills = $derived(
    (character.skills ?? []).filter((s: { level: number }) => s.level > 0) as CharacterSkill[],
  );
  let stories = $derived(character.stories ?? []);
  let canModerate = $derived(data.profile?.role === 'gm' || data.profile?.role === 'admin');
  let isOwner = $derived(data.profile?.id === character.player_id);
  let canEdit = $derived(canModerate || isOwner);
  let canCreateStory = $derived(isOwner && character.status === 'aprobado');
  let primaryStory = $derived(
    stories.find((s: { status: string }) => s.status === 'aprobado') ?? stories[0],
  );
  let secondaryStories = $derived(
    stories.filter((s: { id: string }) => s.id !== primaryStory?.id),
  );
  let narrativePresent = $derived(character.physical_description?.trim() ?? '');

  // Identidad real para la hoja
  let raceName = $derived(
    typeof character.race === 'string'
      ? character.race
      : (character.race?.name ?? 'Desconocida'),
  );
  // El Origen del jugador (campo editable al crear/editar la ficha) manda;
  // si está vacío (fichas viejas) cae al grupo de la raza como antes.
  let originName = $derived(
    character.origin?.trim()
      ? character.origin
      : typeof character.race === 'string'
        ? '—'
        : (character.race?.group_name ?? '—'),
  );
  let avatarFailed = $state(false);
  let avatarUrl = $derived(character.avatar_url ?? '');
  let initial = $derived(character.name?.trim()?.[0]?.toUpperCase() ?? '?');

  // Atributos con su modificador (valor sobre la base de 4)
  const attrOrder = ['F', 'D', 'I', 'P', 'E'] as const;
  const attrKeyMap: Record<string, keyof Character> = {
    F: 'attr_fis',
    D: 'attr_des',
    I: 'attr_int',
    P: 'attr_per',
    E: 'attr_esp',
  };
  let attrRows = $derived(
    attrOrder.map((attr) => {
      const value = Number(character[attrKeyMap[attr]]) || ATTR_BASE_VALUE;
      const mod = value - ATTR_BASE_VALUE;
      return { attr, label: ATTRIBUTE_LABELS[attr], short: ATTRIBUTE_LABELS[attr].slice(0, 3), value, mod };
    }),
  );

  // Valores de combate derivados de atributos + habilidades (fórmulas reales de rules.ts)
  let combat = $derived(combatValues(character as unknown as Character, skills));

  // Habilidades agrupadas por atributo (Físico, Destreza, Inteligencia, Percepción, Espíritu)
  let grouped = $derived.by(() => {
    const g: Record<string, CharacterSkill[]> = {};
    for (const s of skills) {
      const attr = s.skill?.attribute ?? 'F';
      (g[attr] ??= []).push(s);
    }
    return g;
  });

  let combatBlocks = $derived([
    { label: 'Puntos de vida', value: combat.pv, hint: 'Físico × 4', resource: 'hp' as const, title: 'Puntos de vida: se calculan como Físico × 4' },
    { label: 'Puntos de maná', value: combat.pm, hint: character.mana_source === 'I' ? 'Inteligencia × 4' : 'Espíritu × 4', resource: 'mp' as const, title: 'Puntos de maná: se calculan según tu fuente de maná × 4' },
    { label: 'Iniciativa', value: combat.iniciativa, hint: 'Percepción + Reflejos', resource: null, title: 'Iniciativa: Percepción + habilidad Reflejos' },
    { label: 'Ataque CC', value: combat.ataqueCC, hint: 'Armas CC + Físico', resource: null, title: 'Ataque cuerpo a cuerpo: habilidad Armas CC + Físico' },
    { label: 'Ataque CC sutil', value: combat.ataqueCCSutil, hint: 'Armas CC sutil + Destreza', resource: null, title: 'Ataque cuerpo a cuerpo sutil: habilidad Armas CC sutil + Destreza' },
    { label: 'Ataque a distancia', value: combat.ataqueDistancia, hint: 'Armas a distancia + Percepción', resource: null, title: 'Ataque a distancia: habilidad Armas distancia + Percepción' },
    { label: 'Defensa', value: combat.defensa, hint: 'Defensa + Destreza', resource: null, title: 'Defensa: habilidad Defensa + Destreza' },
  ]);

  // Sellos derivados de datos reales
  let sealYear = $derived(character.created_at ? new Date(character.created_at).getFullYear() : null);
</script>

<svelte:head>
  <title>{character.name} — RolErrante</title>
</svelte:head>

<section class="max-w-6xl mx-auto">
  <PageHeader kicker="Censo del reino" title="Ficha de personaje">
    {#snippet actions()}
      {#if character.status === 'pendiente'}
        <span class="badge badge-lg badge-warning" data-testid="character-revision-state">
          En revisión
        </span>
      {/if}
      {#if canEdit}
        <a href={resolve(`/personajes/${character.id}/editar`)} class="btn btn-primary btn-sm font-cinzel">
          Editar ficha
        </a>
      {/if}
    {/snippet}
  </PageHeader>

  <div class="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
    <div class="min-w-0 space-y-6">
      <!-- HOJA DE PERSONAJE · estilo rol de mesa -->
      <section class="sheet" data-od-id="character-sheet" aria-label="Hoja de personaje">
        <header class="sheet-top">
          {#if avatarUrl && !avatarFailed}
            <figure class="avatar avatar-xl">
              <img
                src={avatarUrl}
                alt={`Avatar de ${character.name}`}
                class="avatar-xl-img"
                loading="lazy"
                onerror={() => (avatarFailed = true)}
              />
            </figure>
          {:else}
            <span class="avatar avatar-xl avatar-ring" data-testid="character-avatar-initial">{initial}</span>
          {/if}
          <div class="sheet-identity">
            <span class="sheet-kicker">Personaje · Censo del reino</span>
            <h2 class="sheet-name">{character.name}</h2>
            <p class="sheet-bio">
              {raceName}{#if character.age != null} · {character.age} años{/if}{#if character.sex} · {character.sex}{/if}
            </p>
            <div class="row" style="gap:8px;margin-top:12px;flex-wrap:wrap">
              {#if character.status}
                <span
                  data-testid="character-status-badge"
                  class="badge badge-lg no-dot {statusColor(character.status)}"
                >
                  {statusLabel(character.status)}
                </span>
              {/if}
              {#if character.status === 'aprobado'}
                <span data-testid="character-canon-badge" class="badge badge-lg badge-gold no-dot">
                  Canon
                </span>
              {/if}
            </div>
          </div>
          <img class="sheet-crest" src="/favicon.svg" alt="Símbolo del personaje">
        </header>

        <div class="sheet-meta">
          <div class="sheet-meta-cell"><b>{raceName}</b><span>Raza</span></div>
          <div class="sheet-meta-cell"><b>{originName}</b><span>Origen</span></div>
          {#if character.rp_points != null}
            <div class="sheet-meta-cell"><b>{character.rp_points}</b><span>Puntos de rol</span></div>
          {/if}
        </div>

        <div class="sheet-grid">
          <!-- Atributos: columna de caja con valor -->
          <div class="sheet-attr" data-od-id="atributos">
            <h3 class="sheet-col-title">Atributos</h3>
            {#each attrRows as row (row.attr)}
              <div class="attr-row">
                <span class="attr-n">{row.label}</span>
                <div class="attr-val">
                  <span class="attr-eq">{row.short}</span>
                  <span class="attr-box">{row.value}</span>
                  <span class="attr-mod">{row.mod >= 0 ? `+${row.mod}` : row.mod}</span>
                </div>
              </div>
            {/each}
            <p class="sheet-attr-note">
              Presupuesto de atributos: {ATTR_POINTS_BUDGET} puntos por encima de la base de {ATTR_BASE_VALUE}.
            </p>
          </div>

          <!-- Habilidades por atributo -->
          <div class="sheet-skills" data-od-id="habilidades" aria-label="Habilidades del personaje">
            <h3 class="sheet-col-title">Habilidades por atributo</h3>
            {#if Object.keys(grouped).length === 0}
              <p class="text-azeroth-muted">Este personaje todavía no ha entrenado habilidades.</p>
            {:else}
              <div class="skill-blocks">
                {#each attrOrder as attr (attr)}
                  {@const group = grouped[attr] ?? []}
                  {#if group.length > 0}
                    <div class="skill-group">
                      <div class="skill-group-head">
                        <h4>{ATTRIBUTE_LABELS[attr]}</h4>
                        <span class="skill-count">{group.length}</span>
                      </div>
                      {#each group as s (s.id ?? s.skill?.name ?? '')}
                        <div class="skill-row">
                          <div class="s-main">
                            <b>{s.skill?.name}</b>
                            {#if s.specialization}
                              <span class="s-spec">{s.specialization}</span>
                            {/if}
                          </div>
                          <div class="s-rhs">
                            <b class="s-level">{s.level}</b>
                            <span class="s-rank">{getRankName(s.level)}</span>
                          </div>
                        </div>
                      {/each}
                    </div>
                  {/if}
                {/each}
              </div>
            {/if}
            <p class="sheet-attr-note">
              Los niveles siguen las reglas del compendio.
            </p>
          </div>
        </div>

        <!-- Ficha de combate integrada (derivada de atributos + habilidades) -->
        <div class="sheet-combat" data-od-id="combate" aria-label="Valores de combate">
          <div class="sheet-combat-head">
            <h3 class="sheet-col-title">Ficha de combate</h3>
            <span class="sheet-combat-sub">se calcula con tus atributos y habilidades</span>
          </div>
          <div class="combat-grid">
            {#each combatBlocks as block (block.label)}
              <div class="combat-tile {block.resource ? 'resource' : ''}" title={block.title}>
                <span>{block.label}</span>
                <b>{block.value}</b>
                {#if block.resource}
                  <span class="resource-track">
                    <span class="resource-fill {block.resource}" style="width:100%"></span>
                  </span>
                {/if}
                <small>{block.hint}</small>
              </div>
            {/each}
          </div>
        </div>

        <!-- Narrativa del personaje como cierre de la hoja -->
        <div class="sheet-back" data-od-id="narrative-blocks">
          <h3 class="sheet-col-title">La historia del personaje</h3>
          <div class="sheet-back-cols">
            <div class="sheet-back-col" data-testid="narrative-pasado">
              <h4>Pasado</h4>
              <p class="muted" style="margin:0">—</p>
            </div>
            <div class="sheet-back-col" data-testid="narrative-presente">
              <h4>Presente</h4>
              {#if narrativePresent}
                <p class="muted" style="margin:0">{narrativePresent}</p>
              {:else}
                <p class="text-azeroth-faint italic">—</p>
              {/if}
            </div>
            <div class="sheet-back-col" data-testid="narrative-objetivos">
              <h4>Objetivos</h4>
              <p class="muted" style="margin:0">—</p>
            </div>
          </div>
          <div class="sheet-seals">
            {#if character.status}
              <span class="sheet-seal"><b>{statusLabel(character.status)}</b>{character.status === 'aprobado' ? ' por el consejo' : ' en revisión'}</span>
            {/if}
            <span class="sheet-seal"><b>{stories.length}</b> crónicas enlazadas</span>
            {#if character.rp_points != null}
              <span class="sheet-seal"><b>{character.rp_points}</b> puntos de rol</span>
            {/if}
            {#if sealYear}
              <span class="sheet-seal"><b>En mesa</b> desde {sealYear}</span>
            {/if}
          </div>
        </div>
      </section>

      <div class="mt-5 mb-5"></div>

      <section aria-labelledby="vinc-title">
        <span class="kicker">Referencias</span>
        <h2 id="vinc-title" class="page-title" style="font-size:1.15rem;margin:8px 0 12px">
          Vínculos y referencias
        </h2>
        <div class="panel">
          <div class="panel-body p-4">
            {#if primaryStory}
              <div class="vinc flex items-center gap-2 py-2 border-b border-azeroth-border">
                <FileText size={16} class="text-azeroth-gold shrink-0" />
                <span class="text-sm text-azeroth-muted">Crónica activa:</span>
                <a href={resolve(`/historias/${primaryStory.id}`)} class="link text-sm font-medium">
                  {primaryStory.title}
                </a>
              </div>
              {#each secondaryStories as story (story.id)}
                <div
                  class="vinc flex items-center gap-2 py-2 border-b border-azeroth-border last:border-b-0"
                >
                  <FileText size={16} class="text-azeroth-gold shrink-0" />
                  <a href={resolve(`/historias/${story.id}`)} class="link text-sm">
                    {story.title}
                  </a>
                  <span class="badge badge-xs {statusColor(story.status)} ml-auto">
                    {statusLabel(story.status)}
                  </span>
                </div>
              {/each}
            {:else}
              <p class="vinc text-sm text-azeroth-muted py-2">
                Sin vínculos registrados.
                {#if canCreateStory}
                  <a href={resolve('/historias/nueva')} class="link">Escribe una crónica</a>.
                {/if}
              </p>
            {/if}
            {#if character.reviewed_at}
              <div
                class="vinc flex items-center gap-2 py-2 border-b border-azeroth-border last:border-b-0"
              >
                <MessagesSquare size={16} class="text-azeroth-gold shrink-0" />
                <span class="text-sm text-azeroth-muted">Historia de aprobación: aprobada el</span>
                <span class="text-sm">{formatDate(character.reviewed_at)}</span>
              </div>
            {/if}
          </div>
        </div>
      </section>

      <section aria-labelledby="story-thread-title">
        <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <span class="kicker">Historia</span>
            <h2 id="story-thread-title" class="page-title" style="font-size:1.15rem;margin:8px 0 0">
              La historia como hilo del foro
            </h2>
          </div>
          {#if canCreateStory}
            <div class="flex gap-2">
              <a href={resolve('/foro/nuevo')} class="btn btn-secondary btn-sm">
                Nuevo acto en el foro
              </a>
              <a href={resolve('/foro')} class="btn btn-ghost btn-sm">Ir al foro</a>
            </div>
          {/if}
        </div>

        {#if stories.length > 0}
          <div class="stack space-y-3">
            {#each stories as story (story.id)}
              <a
                href={resolve(`/historias/${story.id}`)}
                class="panel hover:border-azeroth-gold transition-colors p-4 flex items-center justify-between gap-3"
              >
                <div class="min-w-0">
                  <p class="font-medium line-clamp-2">{story.title}</p>
                  <p class="text-xs text-azeroth-muted mt-1">Historia</p>
                </div>
                <span class="badge {statusColor(story.status)} shrink-0">
                  {statusLabel(story.status)}
                </span>
              </a>
            {/each}
          </div>
        {:else}
          <div class="panel">
            <div class="panel-body">
              <p class="text-azeroth-muted">
                Esta ficha todavía no tiene historia publicada. La historia vive como un hilo del
                foro y queda enlazada a la ficha.
              </p>
              {#if canCreateStory}
                <div class="flex gap-2 mt-3">
                  <a href={resolve('/historias/nueva')} class="btn btn-primary btn-sm">
                    Escribir la historia de {character.name}
                  </a>
                  <a href={resolve('/foro')} class="btn btn-ghost btn-sm">Explorar el foro</a>
                </div>
              {/if}
            </div>
          </div>
        {/if}
      </section>

      {#if canModerate && character.status === 'pendiente'}
        <div class="panel">
          <div class="panel-head"><h2>Moderación GM</h2></div>
          <div class="panel-body">
            <div class="flex flex-col gap-3 mt-2">
              <form method="POST" action="?/approve">
                <button type="submit" class="btn btn-success w-full">✓ Aprobar ficha</button>
              </form>
              <form method="POST" action="?/reject" class="flex gap-2">
                <button type="submit" class="btn btn-error">✕ Rechazar</button>
                <input name="notes" type="text" class="input flex-1" placeholder="Motivo del rechazo" />
              </form>
            </div>
          </div>
        </div>
      {/if}
    </div>

    <aside class="space-y-6">
      <div class="panel">
        <div class="panel-head"><h2>Información</h2></div>
        <div class="panel-body">
          <p class="text-sm text-azeroth-muted">Creado: {formatDate(character.created_at)}</p>
          <p class="text-sm text-azeroth-muted">
            Puntos restantes:
            <span class="text-azeroth-gold font-bold">{character.rp_points}</span>
          </p>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head"><h2>Notas</h2></div>
        <div class="panel-body">
          <p class="text-xs text-azeroth-muted leading-relaxed">
            Los valores se derivan de tus atributos y el nivel de tus habilidades según las reglas
            del censo. Sube de nivel entrenando en el foro.
          </p>
        </div>
      </div>
    </aside>
  </div>
</section>

<style>
  /* ==== Hoja de personaje · estilo rol de mesa ==== */
  .sheet {
    border: 1px solid var(--color-azeroth-border);
    border-radius: var(--radius-lg, 16px);
    overflow: hidden;
    background: var(--color-base-200, #141824);
  }
  .sheet-top {
    display: flex;
    gap: 20px;
    align-items: center;
    padding: var(--space-6, 24px);
    background: linear-gradient(180deg, var(--color-base-200, #141824), var(--color-base-100, #1a2030));
    border-bottom: 1px solid var(--color-azeroth-border);
  }
  .sheet-top .avatar-xl {
    width: 104px;
    height: 104px;
    font-size: 2.4rem;
    flex: none;
  }
  .avatar-xl-img {
    width: 104px;
    height: 104px;
    object-fit: cover;
    border-radius: var(--radius-lg, 16px);
    border: 3px solid var(--color-azeroth-gold);
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.4);
    flex: none;
  }
  .sheet-identity {
    flex: 1;
    min-width: 0;
  }
  .sheet-kicker {
    font-size: 0.72rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--color-azeroth-gold-dim);
    font-weight: 600;
  }
  .sheet-name {
    font-family: 'Cinzel', serif;
    font-size: 1.75rem;
    color: var(--color-azeroth-gold-bright);
    font-weight: 800;
    margin: 4px 0 2px;
    line-height: 1.1;
  }
  .sheet-bio {
    color: var(--color-azeroth-gold-soft);
    font-size: 0.95rem;
    font-weight: 600;
    letter-spacing: 0.04em;
  }
  .sheet-crest {
    width: 74px;
    height: 74px;
    flex: none;
    opacity: 0.9;
    filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.35));
  }
  @media (max-width: 560px) {
    .sheet-crest {
      display: none;
    }
  }
  .sheet-meta {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    border-bottom: 1px solid var(--color-azeroth-border);
  }
  .sheet-meta-cell {
    padding: 12px 16px;
    border-right: 1px solid var(--color-azeroth-border);
    background: var(--color-base-100, #1a2030);
  }
  .sheet-meta-cell:last-child {
    border-right: 0;
  }
  .sheet-meta-cell b {
    font-family: 'Cinzel', serif;
    color: var(--color-azeroth-gold-bright);
    font-size: 1.02rem;
    display: block;
  }
  .sheet-meta-cell span {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-azeroth-muted);
  }
  /* cuerpo: atributos + habilidades */
  .sheet-grid {
    display: grid;
    grid-template-columns: 220px 1fr;
    min-height: 0;
  }
  @media (max-width: 760px) {
    .sheet-grid {
      grid-template-columns: 1fr;
    }
  }
  .sheet-attr {
    padding: var(--space-5, 20px);
    border-right: 1px solid var(--color-azeroth-border);
    background: var(--color-base-200, #141824);
  }
  @media (max-width: 760px) {
    .sheet-attr {
      border-right: 0;
      border-bottom: 1px solid var(--color-azeroth-border);
    }
  }
  .sheet-skills {
    padding: var(--space-5, 20px);
    min-width: 0;
  }
  .sheet-col-title {
    margin: 0 0 12px;
    font-family: 'Cinzel', serif;
    font-size: 0.8rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--color-azeroth-gold-soft);
    font-weight: 600;
  }
  .attr-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 9px 0;
    border-bottom: 1px dashed var(--color-azeroth-border);
  }
  .attr-row:last-child {
    border-bottom: 0;
  }
  .attr-n {
    color: var(--color-azeroth-muted);
    font-size: 0.9rem;
    font-weight: 600;
  }
  .attr-val {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .attr-eq {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.66rem;
    color: var(--color-azeroth-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .attr-box {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 42px;
    height: 42px;
    border: 1px solid var(--color-azeroth-border-strong);
    border-radius: 9px;
    background: var(--color-base-100, #1a2030);
    font-family: 'Cinzel', serif;
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--color-azeroth-gold-bright);
  }
  .attr-mod {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.82rem;
    color: var(--color-azeroth-gold-dim);
  }
  .sheet-attr-note {
    font-size: 0.74rem;
    color: var(--color-azeroth-muted);
    margin: 16px 0 0;
    line-height: 1.5;
  }
  /* habilidades */
  .skill-blocks {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
    gap: 16px;
  }
  .skill-group {
    border: 1px solid var(--color-azeroth-border);
    border-radius: var(--radius-md);
    background: var(--color-base-100, #1a2030);
    overflow: hidden;
  }
  .skill-group-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 10px 14px;
    border-bottom: 1px solid var(--color-azeroth-border);
    background: linear-gradient(90deg, rgba(248, 183, 0, 0.05), rgba(248, 183, 0, 0) 70%);
  }
  .skill-group-head h4 {
    margin: 0;
    font-family: 'Cinzel', serif;
    font-size: 0.92rem;
    color: var(--color-azeroth-gold-soft);
    font-weight: 600;
  }
  .skill-count {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.72rem;
    color: var(--color-azeroth-muted);
  }
  .skill-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 10px 14px;
    border-bottom: 1px solid var(--color-azeroth-border);
  }
  .skill-row:last-child {
    border-bottom: 0;
  }
  .s-main {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .s-main b {
    color: var(--color-azeroth-gold-bright);
    font-weight: 600;
    font-size: 0.9rem;
  }
  .s-spec {
    font-size: 0.74rem;
    color: var(--color-azeroth-gold-dim);
    font-family: 'JetBrains Mono', monospace;
  }
  .s-rhs {
    display: flex;
    align-items: baseline;
    gap: 10px;
    flex: none;
  }
  .s-level {
    font-family: 'Cinzel', serif;
    font-size: 1.15rem;
    color: var(--color-azeroth-gold-bright);
  }
  .s-rank {
    font-size: 0.68rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--color-azeroth-muted);
  }
  /* ficha de combate integrada */
  .sheet-combat {
    padding: var(--space-5, 20px);
    border-top: 1px solid var(--color-azeroth-border);
    background: var(--color-base-100, #1a2030);
  }
  .sheet-combat-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 12px;
  }
  .sheet-combat-head .sheet-col-title {
    margin: 0;
  }
  .sheet-combat-sub {
    font-size: 0.76rem;
    color: var(--color-azeroth-muted);
  }
  .combat-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 12px;
  }
  .combat-tile {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 12px 14px;
    border: 1px solid var(--color-azeroth-border);
    border-radius: var(--radius-md);
    background: var(--color-base-200, #141824);
  }
  .combat-tile span {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-azeroth-muted);
  }
  .combat-tile b {
    font-family: 'Cinzel', serif;
    font-size: 1.55rem;
    font-weight: 700;
    color: var(--color-azeroth-gold-bright);
    line-height: 1.1;
  }
  .combat-tile small {
    font-size: 0.7rem;
    color: var(--color-azeroth-muted);
  }
  .resource-track {
    display: block;
    width: 100%;
    height: 8px;
    border-radius: 999px;
    background: var(--color-base-200, #141824);
    border: 1px solid var(--color-azeroth-border);
    overflow: hidden;
    margin: 4px 0 2px;
  }
  .resource-fill {
    display: block;
    height: 100%;
    border-radius: inherit;
  }
  .resource-fill.hp {
    background: linear-gradient(90deg, #c8a24a, #e8c766);
  }
  .resource-fill.mp {
    background: linear-gradient(90deg, #4a7fc8, #66a8e8);
  }
  /* narrativa al pie de la hoja */
  .sheet-back {
    padding: var(--space-5, 20px);
    border-top: 2px solid var(--color-azeroth-border);
    background: var(--color-base-200, #141824);
  }
  .sheet-back-cols {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 16px;
  }
  .sheet-back-col h4 {
    margin: 0 0 8px;
    font-family: 'Cinzel', serif;
    font-size: 0.82rem;
    color: var(--color-azeroth-gold-soft);
    font-weight: 600;
    letter-spacing: 0.05em;
  }
  .sheet-back-col p {
    font-size: 0.9rem;
    line-height: 1.55;
  }
  .sheet-seals {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px dashed var(--color-azeroth-border);
  }
  .sheet-seal {
    font-size: 0.78rem;
    color: var(--color-azeroth-muted);
    padding: 7px 12px;
    border: 1px solid var(--color-azeroth-border);
    border-radius: 999px;
    background: var(--color-base-100, #1a2030);
  }
  .sheet-seal b {
    color: var(--color-azeroth-gold-soft);
    font-weight: 700;
  }
  @media (max-width: 560px) {
    .sheet-seals {
      gap: 8px;
    }
  }
</style>

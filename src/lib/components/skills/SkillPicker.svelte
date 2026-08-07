<script lang="ts">
  import { ATTRIBUTE_LABELS } from '$lib/rules';

  interface SkillShape {
    id?: string;
    name?: string;
    attribute?: string;
    description?: string | null;
    requires_specialization?: boolean;
    specializations?: string[];
    skill_id?: string;
    level?: number;
    specialization?: string | null;
    skill?: SkillShape | null;
  }

  interface Props {
    skills?: SkillShape[];
    mode?: 'create' | 'upgrade';
    levels?: Record<string, number>;
    specs?: Record<string, string>;
    namePrefix?: string;
    size?: 'sm' | 'md';
    onLevelChange?: (skillId: string, level: number) => void;
    onSpecChange?: (skillId: string, spec: string) => void;
  }

  let {
    skills = [],
    mode = 'create',
    levels = {},
    specs = {},
    namePrefix = '',
    size = 'md',
    onLevelChange,
    onSpecChange,
  }: Props = $props();

  const sizeClass = $derived(size === 'sm' ? 'field-sm' : '');

  let grouped = $derived.by(() => {
    const groups: Record<string, SkillShape[]> = {};
    for (const s of skills) {
      const attr = s.attribute ?? s.skill?.attribute ?? 'O';
      (groups[attr] ??= []).push(s);
    }
    const attrOrder = Object.keys(ATTRIBUTE_LABELS);
    return Object.entries(groups)
      .sort(([a], [b]) => {
        const ia = attrOrder.indexOf(a);
        const ib = attrOrder.indexOf(b);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      })
      .map(([attr, list]) => ({ attr, label: ATTRIBUTE_LABELS[attr] ?? attr, list }));
  });

  function skillId(s: SkillShape): string {
    return s.skill_id ?? s.id ?? '';
  }

  function skillName(s: SkillShape): string {
    return s.name ?? s.skill?.name ?? 'Sin nombre';
  }

  function currentLevel(s: SkillShape): number {
    return s.level ?? 0;
  }

  function requiresSpec(s: SkillShape): boolean {
    return (s.requires_specialization ?? s.skill?.requires_specialization) ?? false;
  }

  function hasSpecInput(s: SkillShape): boolean {
    return requiresSpec(s) || (mode === 'upgrade' && !!s.specialization);
  }

  function handleLevel(s: SkillShape, e: Event) {
    const value = Number((e.currentTarget as HTMLInputElement).value);
    onLevelChange?.(skillId(s), value);
  }

  function handleSpec(s: SkillShape, e: Event) {
    const value = (e.currentTarget as HTMLInputElement).value ?? '';
    onSpecChange?.(skillId(s), value);
  }
</script>

{#if mode === 'create'}
  {#each grouped as group (group.attr)}
    <div class="skill-group">
      <div class="skill-group-head">
        <h3>{group.label}</h3>
        <span class="skill-count">{group.list.length}</span>
      </div>
      <div class="skill-group-body">
        {#each group.list as s (s.id ?? s.skill_id ?? s.skill?.id ?? '')}
          <div class="skill-row">
            <div class="s-name">
              <b>{skillName(s)}</b>
              {#if (s.description ?? s.skill?.description) != null}
                <span>{s.description ?? s.skill?.description}</span>
              {/if}
            </div>
            <div class="field s-up {sizeClass}">
              <label for="skill_level_{skillId(s)}">Nivel</label>
              <input
                id="skill_level_{skillId(s)}"
                name="{namePrefix}skill_level_{skillId(s)}"
                type="number"
                class="input"
                min="0"
                max="10"
                value={levels[skillId(s)] ?? 0}
                oninput={(e) => handleLevel(s, e)}
              />
            </div>
            {#if hasSpecInput(s)}
              <div class="field s-spec {sizeClass}">
                <label for="skill_spec_{skillId(s)}">Especialización</label>
                <input
                  id="skill_spec_{skillId(s)}"
                  name="{namePrefix}skill_spec_{skillId(s)}"
                  type="text"
                  class="input"
                  placeholder="Especialización"
                  value={specs[skillId(s)] ?? ''}
                  oninput={(e) => handleSpec(s, e)}
                />
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/each}
{:else}
  {#each grouped as group (group.attr)}
    <div class="skill-group">
      <div class="skill-group-head">
        <h3>{group.label}</h3>
        <span class="skill-count">{group.list.length}</span>
      </div>
      <div class="skill-group-body">
        {#each group.list as s (s.id ?? s.skill_id ?? s.skill?.id ?? '')}
          <div class="skill-row">
            <div class="s-name">
              <b>{skillName(s)}</b>
              <span>Actual: {currentLevel(s)} · {group.label}</span>
            </div>
            <div class="field s-up {sizeClass}">
              <label for="skill_level_{skillId(s)}">Subir a</label>
              <input
                id="skill_level_{skillId(s)}"
                name="{namePrefix}skill_level_{skillId(s)}"
                type="number"
                class="input"
                min={currentLevel(s)}
                max="10"
                value={levels[skillId(s)] ?? currentLevel(s)}
                oninput={(e) => handleLevel(s, e)}
              />
            </div>
            {#if hasSpecInput(s)}
              <div class="field s-spec {sizeClass}">
                <label for="skill_spec_{skillId(s)}">Especialización</label>
                <input
                  id="skill_spec_{skillId(s)}"
                  name="{namePrefix}skill_spec_{skillId(s)}"
                  type="text"
                  class="input"
                  placeholder="Especialización"
                  value={specs[skillId(s)] ?? s.specialization ?? ''}
                  oninput={(e) => handleSpec(s, e)}
                />
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/each}
{/if}
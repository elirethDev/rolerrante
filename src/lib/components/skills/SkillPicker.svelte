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
    onLevelChange?: (skillId: string, level: number) => void;
    onSpecChange?: (skillId: string, spec: string) => void;
  }

  let { skills = [], mode = 'create', levels = {}, specs = {}, namePrefix = '', onLevelChange, onSpecChange }: Props = $props();

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
    <div class="mb-4">
      <h3 class="font-cinzel text-azeroth-gold mb-2">{group.label}</h3>
      <div class="space-y-2">
        {#each group.list as s (s.id ?? s.skill_id ?? s.skill?.id ?? '')}
          <div class="flex flex-col md:flex-row md:items-center gap-2 p-2 bg-base-100 rounded border border-azeroth-border">
            <div class="flex-1">
              <p class="font-semibold">{skillName(s)}</p>
              {#if (s.description ?? s.skill?.description) != null}
                <p class="text-xs text-gray-400">{s.description ?? s.skill?.description}</p>
              {/if}
            </div>
            <div class="flex items-center gap-2">
              <label class="text-sm" for="skill_level_{skillId(s)}">Nivel</label>
              <input
                id="skill_level_{skillId(s)}"
                name="{namePrefix}skill_level_{skillId(s)}"
                type="number"
                class="input w-20 input-sm"
                min="0"
                max="10"
                value={levels[skillId(s)] ?? 0}
                oninput={(e) => handleLevel(s, e)}
              />
              {#if hasSpecInput(s)}
                <input
                  name="{namePrefix}skill_spec_{skillId(s)}"
                  type="text"
                  class="input input-sm"
                  placeholder="Especialización"
                  value={specs[skillId(s)] ?? ''}
                  oninput={(e) => handleSpec(s, e)}
                />
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/each}
{:else}
  {#each skills as s (s.id ?? s.skill_id ?? s.skill?.id ?? '')}
    <div class="flex flex-col md:flex-row md:items-center gap-2 p-2 bg-base-100 rounded border border-azeroth-border">
      <div class="flex-1">
        <p class="font-semibold">{skillName(s)}</p>
        <p class="text-xs text-gray-400">Actual: {currentLevel(s)} · {s.attribute ?? s.skill?.attribute ?? ''}</p>
      </div>
      <div class="flex items-center gap-2">
        <label class="text-sm" for="skill_level_{skillId(s)}">Subir a</label>
        <input
          id="skill_level_{skillId(s)}"
          name="{namePrefix}skill_level_{skillId(s)}"
          type="number"
          class="input w-20 input-sm"
          min={currentLevel(s)}
          max="10"
          value={levels[skillId(s)] ?? currentLevel(s)}
          oninput={(e) => handleLevel(s, e)}
        />
        {#if hasSpecInput(s)}
          <input
            name="{namePrefix}skill_spec_{skillId(s)}"
            type="text"
            class="input input-sm"
            placeholder="Especialización"
            value={specs[skillId(s)] ?? s.specialization ?? ''}
            oninput={(e) => handleSpec(s, e)}
          />
        {/if}
      </div>
    </div>
  {/each}
{/if}
<script lang="ts">
  import { ATTRIBUTE_LABELS } from '$lib/rules';
  import { Sword, Zap, Footprints, Crosshair, Shield, Swords } from 'lucide-svelte';

  interface Attrs {
    attr_fis: number;
    attr_des: number;
    attr_int: number;
    attr_per: number;
    attr_esp: number;
    mana_source?: 'I' | 'E';
  }

  interface SkillEntry {
    skill?: { name?: string; attribute?: string };
    level: number;
    specialization?: string | null;
  }

  let { attrs, skills }: { attrs: Attrs; skills?: SkillEntry[] } = $props();

  let pv = $derived((attrs.attr_fis ?? 0) * 4);
  let pm = $derived(((attrs.mana_source === 'I' ? attrs.attr_int : attrs.attr_esp) ?? 0) * 4);
  let iniciativa = $derived(attrs.attr_per ?? 0);
  let ataqueCC = $derived(attrs.attr_fis ?? 0);
  let ataqueCCSutil = $derived(attrs.attr_des ?? 0);
  let ataqueDistancia = $derived(attrs.attr_per ?? 0);
  let defensa = $derived(attrs.attr_des ?? 0);

  let stats: Array<{ label: string; icon: typeof Sword; value: number }> = $derived([
    { label: 'PV', icon: Sword, value: pv },
    { label: 'PM', icon: Zap, value: pm },
    { label: 'Iniciativa', icon: Footprints, value: iniciativa },
    { label: 'Ataque CC', icon: Swords, value: ataqueCC },
    { label: 'Ataque CC Sutil', icon: Swords, value: ataqueCCSutil },
    { label: 'Ataque Distancia', icon: Crosshair, value: ataqueDistancia },
    { label: 'Defensa', icon: Shield, value: defensa },
  ]);
</script>

<div class="card bg-base-200 border border-azeroth-border">
  <div class="card-body p-4">
    <h3 class="card-title font-cinzel text-azeroth-gold text-lg">Valores de combate</h3>

    <div class="grid grid-cols-2 gap-2">
      {#each stats as { label, icon: Icon, value }}
        <div class="flex items-center gap-2 text-sm">
          <Icon size={16} class="text-azeroth-gold" />
          <span class="text-base-content/70">{label}</span>
          <span class="ml-auto font-semibold text-base-content">{value}</span>
        </div>
      {/each}
    </div>

    {#if skills && skills.length > 0}
      <div class="divider my-2"></div>
      <h4 class="font-cinzel text-azeroth-gold text-sm mb-2">Habilidades</h4>
      <table class="table table-xs">
        <thead>
          <tr>
            <th class="text-base-content/60">Habilidad</th>
            <th class="text-base-content/60">Nivel</th>
            <th class="text-base-content/60">Especialización</th>
          </tr>
        </thead>
        <tbody>
          {#each skills as skill}
            <tr>
              <td class="text-base-content">{skill.skill?.name ?? '—'}</td>
              <td class="text-base-content">{skill.level}</td>
              <td class="text-base-content">{skill.specialization ?? '—'}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>
</div>
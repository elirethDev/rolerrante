<script lang="ts">
  import { resolve } from '$app/paths';
  import Avatar from '$lib/components/ui/Avatar.svelte';
  import { statusLabel, statusColor } from '$lib/utils';

  export interface CensusCharacter {
    id: string;
    name: string;
    age: number | null;
    status: string;
    avatar_url?: string | null;
    race?: { name: string } | null;
    player?: { display_name: string | null; username: string } | null;
  }

  let { char }: { char: CensusCharacter } = $props();

  const ownerName = $derived(char.player?.display_name ?? char.player?.username ?? 'Anónimo');
</script>

<a href={resolve(`/personajes/${char.id}`)} class="char-card">
  <div class="char-top">
    <Avatar src={char.avatar_url} name={char.name} size="lg" alt={char.name} />
    <div class="char-info">
      <span class="char-name">{char.name}</span>
      <span class="char-meta">{char.race?.name ?? 'Sin raza'} · {char.age ?? '?'} años</span>
    </div>
  </div>
  <div class="char-tags">
    <span class="badge {statusColor(char.status)} badge-sm no-dot">{statusLabel(char.status)}</span>
  </div>
  <div class="char-owner">por {ownerName}</div>
</a>

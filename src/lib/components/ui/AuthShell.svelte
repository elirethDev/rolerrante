<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    subtitle?: string;
    children: Snippet;
  }

  let { title, subtitle, children }: Props = $props();
</script>

<div class="min-h-[70vh] flex items-center justify-center px-4 py-12">
  <div class="panel w-full max-w-[440px] bg-linear-to-b from-azeroth-surface-2 to-azeroth-surface">
    <div class="px-8 pt-8 pb-2 text-center">
      <svg
        width="64"
        height="64"
        viewBox="0 0 64 64"
        fill="none"
        aria-hidden="true"
        class="mx-auto mb-4"
        style="filter:drop-shadow(0 0 14px rgba(248,183,0,0.35))"
      >
        <defs>
          <linearGradient id="auths" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#FFC940" />
            <stop offset="0.5" stop-color="#F8B700" />
            <stop offset="1" stop-color="#C8941A" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r="27.5" stroke="url(#auths)" stroke-width="2" />
        <circle cx="32" cy="32" r="22.5" stroke="url(#auths)" stroke-width="0.75" opacity="0.45" />
        <path d="M32 13.5 L36.2 27.8 L50.5 32 L36.2 36.2 L32 50.5 L27.8 36.2 L13.5 32 L27.8 27.8 Z" fill="url(#auths)" />
        <path d="M18.5 48 C 25 41, 41 26, 47 19.5" stroke="url(#auths)" stroke-width="2.4" stroke-linecap="round" opacity="0.85" />
        <circle cx="18.5" cy="48" r="2.5" fill="url(#auths)" />
        <circle cx="47" cy="19.5" r="2" fill="url(#auths)" />
      </svg>
      <h1 class="font-cinzel text-2xl font-bold text-azeroth-gold">{title}</h1>
      {#if subtitle}
        <p class="mt-1 text-sm text-azeroth-muted">{subtitle}</p>
      {/if}
    </div>
    <div class="px-8 pb-8 pt-3">
      {@render children()}
    </div>
  </div>
</div>

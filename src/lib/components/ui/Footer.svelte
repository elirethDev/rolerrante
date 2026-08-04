<script lang="ts">
  import { Mail } from '@lucide/svelte';
  import { resolve } from '$app/paths';

  interface NavItem {
    label: string;
    href: string;
  }

  const comunidad: NavItem[] = [
    { label: 'Índice de foros', href: resolve('/foro') },
    { label: 'Últimas crónicas', href: resolve('/historias') },
    { label: 'Personajes', href: resolve('/personajes') },
    { label: 'Normativa del reino', href: '#' },
  ];

  const acceso: NavItem[] = [
    { label: 'Iniciar sesión', href: resolve('/login') },
    { label: 'Crear cuenta', href: resolve('/registro') },
    { label: 'Recuperar acceso', href: '#' },
  ];
</script>

<footer class="relative mt-20 border-t border-azeroth-border bg-linear-to-b from-[rgba(7,9,16,0.4)] to-azeroth-bg-deep azeroth-hairline-top">
  <div class="mx-auto grid max-w-[1180px] grid-cols-1 gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.5fr_1fr_1fr_1.2fr]">
    <div class="min-w-0">
      <a
        href={resolve('/')}
        class="inline-flex items-center gap-2 font-cinzel text-[1.12rem] font-bold tracking-wide text-base-content hover:text-azeroth-gold-bright"
      >
        <span class="text-azeroth-gold-bright">Rol</span> Errante
      </a>
      <p class="mt-3 max-w-xs text-sm text-azeroth-muted">
        Una comunidad independiente de rol aficionado. Sin afiliación con Blizzard Entertainment.
      </p>
    </div>

    <div>
      <h4 class="mb-3.5 font-cinzel text-[0.95rem] tracking-wide text-azeroth-cream">Comunidad</h4>
      <ul class="flex list-none flex-col gap-2.5 text-sm">
        {#each comunidad as item (item.label)}
          <li><a href={item.href} class="text-azeroth-muted hover:text-azeroth-gold-bright">{item.label}</a></li>
        {/each}
      </ul>
    </div>

    <div>
      <h4 class="mb-3.5 font-cinzel text-[0.95rem] tracking-wide text-azeroth-cream">Acceso</h4>
      <ul class="flex list-none flex-col gap-2.5 text-sm">
        {#each acceso as item (item.label)}
          <li><a href={item.href} class="text-azeroth-muted hover:text-azeroth-gold-bright">{item.label}</a></li>
        {/each}
      </ul>
    </div>

    <div>
      <h4 class="mb-3.5 font-cinzel text-[0.95rem] tracking-wide text-azeroth-cream">Contacto y redes</h4>
      <div class="flex gap-2.5">
        <a class="soc-btn" href="#" aria-label="Discord">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path
              d="M20.3 4.4A19.8 19.8 0 0015.4 3l-.4.9c1.7.5 2.6 1.2 3.5 2a16.6 16.6 0 00-13.2 0c.9-.8 1.9-1.5 3.6-2L8.6 3a19.5 19.5 0 00-4.9 1.4A20.3 20.3 0 00.6 17.4a19.6 19.6 0 005.9 3l.8-1.3c-1.1-.4-2.1-1-3.1-1.7l.8-.6a13.9 13.9 0 0013 0l.8.6c-1 .7-2 1.3-3.1 1.7l.8 1.3a19.5 19.5 0 005.9-3A20 20 0 0020.3 4.4zM8.7 14.9c-.9 0-1.7-.9-1.7-2s.8-2 1.7-2 1.7.9 1.7 2-.8 2-1.7 2zm6.6 0c-.9 0-1.7-.9-1.7-2s.8-2 1.7-2 1.7.9 1.7 2-.8 2-1.7 2z"
            />
          </svg>
        </a>
        <a class="soc-btn" href="#" aria-label="Twitch">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M4 3h16v12h-4v4h-4l-4-4H4V3zm4 3v6h2V6H8zm4 0v6h2V6h-2z" />
          </svg>
        </a>
        <a class="soc-btn" href="mailto:consejo@rolerrante.com" aria-label="Correo">
          <Mail size={18} aria-hidden="true" />
        </a>
      </div>
      <p class="contact-note mt-3 text-[0.84rem] text-azeroth-faint">consejo@rolerrante.com</p>
    </div>
  </div>

  <div class="border-t border-azeroth-border px-4 py-4 text-center text-[0.78rem] text-azeroth-faint">
    © 2026 Rol Errante · Identidad original · <b class="font-semibold text-azeroth-muted">Contenido de demostración</b>
  </div>
</footer>

<style>
  .soc-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 9999px;
    border: 1px solid var(--color-azeroth-border-strong);
    color: var(--color-azeroth-text-soft);
    background: var(--color-azeroth-surface);
    transition:
      border-color 0.15s,
      color 0.15s,
      translate 0.12s;
  }
  .soc-btn:hover {
    color: var(--color-azeroth-gold-bright);
    border-color: var(--color-azeroth-gold-dim);
    translate: 0 -2px;
  }
</style>

<script lang="ts">
  import { Shield, Scroll, Sword } from 'lucide-svelte';
</script>

<svelte:head>
  <title>Rol Errante — Rol de World of Warcraft</title>
</svelte:head>

<section class="hero min-h-[70vh]">
  <div class="hero-content text-center">
    <div class="max-w-3xl">
      <h1 class="text-5xl md:text-7xl font-cinzel font-bold text-azeroth-gold mb-6">
        Rol Errante
      </h1>
      <p class="text-xl md:text-2xl mb-8 text-gray-300">
        Plataforma de rol ambientada en World of Warcraft.
      </p>
      <div class="flex flex-wrap justify-center gap-4">
        <a href="/registro" class="btn btn-primary btn-lg font-cinzel">Comenzar aventura</a>
        <a href="/historias" class="btn btn-outline btn-lg">Explorar historias</a>
      </div>
    </div>
  </div>
</section>

<section class="grid md:grid-cols-3 gap-6 mt-12">
  <div class="card bg-base-200 border border-azeroth-border shadow-xl">
    <div class="card-body items-center text-center">
      <Scroll size={48} class="text-azeroth-gold mb-4" />
      <h2 class="card-title font-cinzel">Historias</h2>
      <p>Escribe y comparte el trasfondo de tus personajes.</p>
    </div>
  </div>

  <div class="card bg-base-200 border border-azeroth-border shadow-xl">
    <div class="card-body items-center text-center">
      <Sword size={48} class="text-azeroth-gold mb-4" />
      <h2 class="card-title font-cinzel">Fichas</h2>
      <p>Sistema de juego diseñado para el rol en tiempo real.</p>
    </div>
  </div>

  <div class="card bg-base-200 border border-azeroth-border shadow-xl">
    <div class="card-body items-center text-center">
      <Shield size={48} class="text-azeroth-gold mb-4" />
      <h2 class="card-title font-cinzel">Eventos</h2>
      <p>Crea o únete a eventos y campañas. Gana experiencia y desarrolla a tu personaje.</p>
    </div>
  </div>
</section>

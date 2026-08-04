<script lang="ts">
  import { resolve } from '$app/paths';
</script>

<svelte:head>
  <title>Rol Errante — Comunidad de rol</title>
  <meta
    name="description"
    content="Foros, crónicas y personajes de rol en World of Warcraft. Un reino pequeño hecho por errantes, con un asiento esperándote."
  />
</svelte:head>

<section class="hero">
  <div class="hero-stage">
    <div class="cinema hero-zoom" aria-hidden="true"><div class="horizon"></div></div>
    <div class="embers" aria-hidden="true">
      <i style="left:8%; --d:8s"></i>
      <i style="left:20%; --d:11s; animation-delay:1s"></i>
      <i style="left:35%; --d:9s; animation-delay:.5s"></i>
      <i style="left:58%; --d:12s; animation-delay:2s"></i>
      <i style="left:72%; --d:8.5s; animation-delay:1.5s"></i>
      <i style="left:88%; --d:10s; animation-delay:.3s"></i>
    </div>
    <div class="hero-inner">
      <div class="hero-copy">
        <h1 class="hero-title">Construimos esta casa<br />para que en ella escribas tu <em>leyenda</em></h1>
        <p class="hero-sub">
          Somos una comunidad de rol en World of Warcraft: foros, crónicas y personajes para escribir
          historias juntos. Acércate y toma asiento: que tus días sean largos y tus contratiempos, escasos.
        </p>
        <div class="hero-cta">
          <a href={resolve('/foro')} class="btn btn-primary btn-lg">Explorar los foros</a>
          <a href={resolve('/personajes/nuevo')} class="btn btn-secondary btn-lg">Crear mi ficha</a>
        </div>
      </div>
      <div class="stage-art" aria-hidden="true">
        <div class="pane">
          <div class="art"></div>
          <div class="ridge"></div>
          <div class="cap"><span class="k">El Sexto Reino · Crónicas vivas</span></div>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="num-band" aria-label="Cifras de la comunidad">
  <div class="num-grid">
    <div class="kpi band-kpi"><span class="kpi-num">2.4k</span><span class="kpi-label">Roleros</span></div>
    <div class="kpi band-kpi"><span class="kpi-num">1.2M</span><span class="kpi-label">Mensajes</span></div>
    <div class="kpi band-kpi"><span class="kpi-num">340</span><span class="kpi-label">Crónicas completas</span></div>
    <div class="kpi band-kpi"><span class="kpi-num">4.6&#9733;</span><span class="kpi-label">Valoración de la mesa</span></div>
  </div>
  <p class="num-note">Cifras de demostración — datos ilustrativos.</p>
</section>

<section class="split" aria-labelledby="split-foros-title">
  <div class="copy">
    <span class="kicker">Foros vivos</span>
    <h2 class="landing-h2" id="split-foros-title">Del silencio a la sobremesa</h2>
    <p class="lead">
      Un foro clásico —categorías, hilos y respuestas— con el calor de una taberna al atardecer.
      Toma asiento, lee sin prisa y deja que el salón se llene.
    </p>
    <ul class="feat-list">
      <li><span class="n">01</span><div><b>Crónicas abiertas</b><span>Cada historia es un hilo que la comunidad escribe en común.</span></div></li>
      <li><span class="n">02</span><div><b>Revisión de personajes</b><span>Presenta tu ficha al consejo y, con su aprobación, entra al reino.</span></div></li>
      <li><span class="n">03</span><div><b>Eventos en vivo</b><span>Convocatorias, batallas de plaza y veladas en el Salón del Consejo.</span></div></li>
    </ul>
    <div class="hero-cta band-cta"><a href={resolve('/foro')} class="btn btn-primary">Entrar a los foros</a></div>
  </div>
  <div class="artpane" aria-hidden="true"><div class="art"></div><div class="inlay"></div></div>
</section>

<section class="split rev" aria-labelledby="split-fichas-title">
  <div class="copy">
    <span class="kicker">Personajes</span>
    <h2 class="landing-h2" id="split-fichas-title">Detrás de cada ficha, una historia con rostro</h2>
    <p class="lead">
      Fichas narrativas que crecen contigo: apariencia, personalidad, trasfondo y vínculos.
      Escribe tu historia poco a poco y déjala evolucionar.
    </p>
    <ul class="feat-list">
      <li><span class="n">&#10022;</span><div><b>Aprobación del consejo</b><span>Tu ficha cruza el umbral cuando el consejo la acoge.</span></div></li>
      <li><span class="n">&#10022;</span><div><b>Vínculos visibles</b><span>Los lazos se dibujan para que la historia se vea completa.</span></div></li>
    </ul>
    <div class="hero-cta band-cta"><a href={resolve('/personajes')} class="btn btn-secondary">Ver personajes</a></div>
  </div>
  <div class="artpane" aria-hidden="true"><div class="art"></div><div class="inlay"></div></div>
</section>

<section class="split" aria-labelledby="split-gm-title">
  <div class="copy">
    <span class="kicker">Para tu consejo de GMs</span>
    <h2 class="landing-h2" id="split-gm-title">Menos trámites, más aventura</h2>
    <p class="lead">
      Un panel pensado para acortar el trecho: aprueba fichas, cierra hilos y corrige crónicas
      en una sola acción, con cada paso registrado.
    </p>
    <div class="hero-cta band-cta">
      <a href={resolve('/gm')} class="btn btn-secondary">Ver el panel de GM</a>
      <a href={resolve('/admin')} class="btn btn-ghost">Panel de administración</a>
    </div>
  </div>
  <div class="artpane" aria-hidden="true"><div class="art"></div><div class="inlay"></div></div>
</section>

<style>
  .hero {
    position: relative;
    min-height: calc(100vh - var(--topbar-h, 64px));
    display: flex;
    align-items: stretch;
  }
  .hero-stage {
    position: relative;
    flex: 1;
    width: 100%;
    display: flex;
    align-items: center;
    border-bottom: 1px solid var(--color-azeroth-border);
    overflow: hidden;
  }
  .hero-stage .cinema {
    position: absolute;
    inset: 0;
  }

  .cinema {
    position: relative;
    overflow: hidden;
    background: var(--color-azeroth-bg-deep);
    background-image:
      radial-gradient(130% 90% at 50% -10%, #101a30 0%, rgba(16, 26, 48, 0) 55%),
      radial-gradient(90% 70% at 50% 30%, rgba(56, 96, 190, 0.16), rgba(56, 96, 190, 0) 60%);
  }
  .cinema::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      radial-gradient(46% 42% at 68% 30%, rgba(248, 183, 0, 0.2), rgba(248, 183, 0, 0) 62%),
      radial-gradient(30% 34% at 26% 62%, rgba(14, 134, 202, 0.14), rgba(14, 134, 202, 0) 60%);
  }
  .cinema::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: radial-gradient(120% 90% at 50% 108%, rgba(0, 0, 0, 0.85), transparent 58%),
      url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='.05'/%3E%3C/svg%3E");
    mix-blend-mode: soft-light;
  }
  .cinema .horizon {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 160px;
    background: linear-gradient(180deg, transparent, rgba(7, 9, 16, 0.9));
    pointer-events: none;
  }
  .hero-zoom {
    animation: zoom 22s ease-in-out infinite alternate;
  }
  @keyframes zoom {
    from {
      scale: 1;
    }
    to {
      scale: 1.06;
    }
  }

  .embers {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 1;
    opacity: 0.7;
  }
  .embers i {
    position: absolute;
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: var(--color-azeroth-gold-bright);
    box-shadow: 0 0 8px var(--color-azeroth-gold);
    animation: float var(--d, 9s) linear infinite;
    opacity: 0;
  }
  @keyframes float {
    0% {
      transform: translateY(6vh);
      opacity: 0;
    }
    12% {
      opacity: 0.9;
    }
    85% {
      opacity: 0.35;
    }
    100% {
      transform: translateY(-92vh);
      opacity: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .embers i,
    .hero-zoom {
      animation: none;
    }
  }

  .hero-inner {
    position: relative;
    z-index: 2;
    width: 100%;
    max-width: 1180px;
    margin-inline: auto;
    display: grid;
    grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
    gap: clamp(24px, 5vw, 72px);
    align-items: center;
    padding: clamp(44px, 6vw, 88px) clamp(16px, 3vw, 32px);
  }
  @media (max-width: 980px) {
    .hero-inner {
      grid-template-columns: 1fr;
      padding-top: clamp(32px, 5vw, 56px);
    }
    .stage-art .pane {
      width: min(84vw, 420px);
      aspect-ratio: 4 / 3;
      opacity: 0.95;
    }
  }

  .hero-title {
    font-family: var(--font-cinzel);
    font-size: clamp(2.4rem, 5vw + 1rem, 4.15rem);
    line-height: 1.05;
    font-weight: 700;
    color: var(--color-azeroth-text-high);
    margin: 0 0 18px;
    letter-spacing: 0.01em;
  }
  .hero-title em {
    font-style: normal;
    color: transparent;
    background: linear-gradient(180deg, var(--color-azeroth-gold-bright), var(--color-azeroth-gold));
    -webkit-background-clip: text;
    background-clip: text;
  }
  .hero-sub {
    max-width: 560px;
    font-size: 1.12rem;
    line-height: 1.66;
    color: var(--color-azeroth-text-soft);
    margin: 0 0 30px;
  }
  .hero-cta {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }
  @media (max-width: 760px) {
    .hero-sub {
      font-size: 1rem;
    }
  }
  @media (max-width: 380px) {
    .hero-title {
      font-size: clamp(2rem, 6vw + 0.75rem, 3rem);
    }
    .hero-sub {
      font-size: 0.95rem;
    }
  }

  .stage-art {
    position: relative;
    min-width: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .stage-art .pane {
    width: min(100%, 520px);
    aspect-ratio: 4 / 5;
    border: 1px solid rgba(200, 148, 26, 0.35);
    border-radius: var(--radius-xl);
    overflow: hidden;
    position: relative;
    box-shadow: 0 40px 90px -40px rgba(0, 0, 0, 0.9);
  }
  .stage-art .pane .art {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(70% 40% at 30% 20%, rgba(248, 183, 0, 0.28), transparent 60%),
      radial-gradient(60% 50% at 78% 72%, rgba(14, 134, 202, 0.22), transparent 60%),
      radial-gradient(140% 90% at 50% 120%, #12203a, #070910 70%);
  }
  .stage-art .pane .art::after {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(120% 80% at 50% 120%, rgba(0, 0, 0, 0.9), transparent 60%);
  }
  .stage-art .pane .ridge {
    position: absolute;
    left: -8%;
    right: -8%;
    bottom: -2%;
    height: 46%;
    background: radial-gradient(120% 100% at 50% 0%, #0d1a30, rgba(7, 10, 18, 0) 70%);
    clip-path: polygon(0 62%, 12% 40%, 26% 60%, 40% 30%, 54% 55%, 68% 24%, 82% 52%, 100% 34%, 100% 100%, 0 100%);
  }
  .stage-art .pane .cap {
    position: absolute;
    left: 14px;
    right: 14px;
    bottom: 14px;
    z-index: 3;
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .stage-art .pane .cap .k {
    font-size: 0.66rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--color-azeroth-gold-soft);
    font-weight: 700;
  }

  .num-band {
    border-top: 1px solid rgba(53, 65, 95, 0.45);
    border-bottom: 1px solid rgba(53, 65, 95, 0.45);
    background: linear-gradient(180deg, rgba(7, 9, 16, 0.6), var(--color-azeroth-bg));
  }
  .num-grid {
    max-width: 1180px;
    margin-inline: auto;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    padding: 32px clamp(16px, 3vw, 32px);
  }
  .band-kpi {
    background: none;
    border: 0;
    box-shadow: none;
    align-items: center;
    text-align: center;
  }
  @media (max-width: 760px) {
    .num-grid {
      grid-template-columns: 1fr 1fr;
    }
  }
  .kpi {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 18px 20px;
    border: 1px solid var(--color-azeroth-border);
    border-radius: var(--radius-lg);
    background: linear-gradient(180deg, var(--color-azeroth-surface-2), var(--color-azeroth-surface));
    box-shadow: var(--shadow-1);
  }
  .kpi-num {
    font-family: var(--font-cinzel);
    font-size: 1.9rem;
    font-weight: 700;
    color: var(--color-azeroth-gold-bright);
    line-height: 1;
  }
  .kpi-label {
    font-size: 0.76rem;
    color: var(--color-azeroth-muted);
    letter-spacing: 0.04em;
  }
  .num-note {
    text-align: center;
    margin: 0;
    padding: 0 20px 14px;
    font-size: 0.72rem;
    color: var(--color-azeroth-faint);
  }

  .split {
    display: grid;
    grid-template-columns: 1.1fr 1fr;
    gap: 48px;
    align-items: center;
    padding: 64px clamp(16px, 3vw, 32px);
    max-width: 1180px;
    margin-inline: auto;
  }
  .split.rev .copy {
    order: 2;
  }
  .split.rev .artpane {
    order: 1;
  }
  .split.rev {
    background: linear-gradient(180deg, transparent, rgba(7, 9, 16, 0.6), transparent);
  }
  @media (max-width: 900px) {
    .split {
      grid-template-columns: 1fr;
      gap: 24px;
    }
    .split.rev .copy {
      order: 1;
    }
    .split.rev .artpane {
      order: 2;
    }
  }

  .artpane {
    position: relative;
    border: 1px solid var(--color-azeroth-border-strong);
    border-radius: var(--radius-xl);
    overflow: hidden;
    aspect-ratio: 16 / 10;
    box-shadow: var(--shadow-2);
    min-height: 200px;
  }
  .artpane .art {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(60% 50% at 30% 30%, rgba(248, 183, 0, 0.2), transparent 62%),
      linear-gradient(180deg, #13203a, var(--color-azeroth-bg-deep));
  }
  .artpane .inlay {
    position: absolute;
    inset: 12px;
    border: 1px solid rgba(200, 148, 26, 0.28);
    border-radius: var(--radius-lg);
  }

  .kicker {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--color-azeroth-gold);
  }
  .kicker::before {
    content: '';
    width: 26px;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--color-azeroth-gold-dim));
  }
  .landing-h2 {
    font-family: var(--font-cinzel);
    font-size: clamp(1.9rem, 3.2vw + 0.45rem, 2.85rem);
    line-height: 1.1;
    font-weight: 700;
    color: var(--color-azeroth-text-high);
    margin: 12px 0 0;
  }
  .lead {
    font-size: 1.15rem;
    color: var(--color-azeroth-text-soft);
    line-height: 1.6;
    margin: 18px 0 0;
  }
  .feat-list {
    list-style: none;
    margin: 20px 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .feat-list li {
    display: flex;
    gap: 14px;
    align-items: flex-start;
  }
  .feat-list .n {
    flex: none;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    border: 1px solid var(--color-azeroth-gold-dim);
    color: var(--color-azeroth-gold-bright);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-mono);
    font-size: 0.85rem;
    background: rgba(248, 183, 0, 0.07);
  }
  .feat-list b {
    display: block;
    color: var(--color-azeroth-text-high);
    font-weight: 600;
    margin-bottom: 2px;
    font-family: var(--font-sans);
  }
  .feat-list span {
    color: var(--color-azeroth-muted);
    font-size: 0.9rem;
  }
  .band-cta {
    margin-top: 24px;
  }
</style>

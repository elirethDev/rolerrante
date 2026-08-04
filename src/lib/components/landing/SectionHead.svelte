<script lang="ts">
  let {
    kicker,
    title,
    linkLabel,
    linkHref,
    headingId,
  }: {
    kicker: string;
    title: string;
    linkLabel?: string;
    linkHref?: string;
    headingId?: string;
  } = $props();
</script>

<div class="section-head">
  <div>
    <span class="kicker">{kicker}</span>
    <h2 class="landing-h2" id={headingId}>{title}</h2>
  </div>
  {#if linkLabel && linkHref}
    <a class="btn btn-ghost btn-sm" href={linkHref}>{linkLabel} →</a>
  {/if}
</div>

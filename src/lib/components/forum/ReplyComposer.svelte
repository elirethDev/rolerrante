<script lang="ts">
  import { enhance } from '$app/forms';
  import { resolve } from '$app/paths';
  import TipTapEditor from '$lib/components/editor/TipTapEditor.svelte';
  import SubmitButton from '$lib/components/ui/SubmitButton.svelte';

  let {
    action = '?/reply',
    submitLabel = 'Responder',
    placeholder = 'Escribí tu respuesta…',
  }: { action?: string; submitLabel?: string; placeholder?: string } = $props();

  let pending = $state(false);
  let content = $state('');
</script>

<form
  method="POST"
  action={action}
  use:enhance={() => {
    pending = true;
    return async ({ update }) => {
      pending = false;
      await update();
    };
  }}
>
  <input type="hidden" name="content" bind:value={content} />
  <TipTapEditor {content} onChange={(html) => (content = html)} />
  <div class="mt-3 flex justify-end">
    <SubmitButton class="font-cinzel" {pending}>{submitLabel}</SubmitButton>
  </div>
</form>

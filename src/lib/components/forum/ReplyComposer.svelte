<script lang="ts">
  import { enhance } from '$app/forms';
  import TipTapEditor from '$lib/components/editor/TipTapEditor.svelte';
  import SubmitButton from '$lib/components/ui/SubmitButton.svelte';
  import { validateForumImageUrls } from '$lib/auth';

  let {
    action = '?/reply',
    submitLabel = 'Responder',
    placeholder = 'Escribí tu respuesta…',
  }: { action?: string; submitLabel?: string; placeholder?: string } = $props();

  let pending = $state(false);
  let content = $state('');

  // Client-side mirror of the server validateForumImageUrls() (REQ-FORUM-03.5).
  function isValidImageUrl(url: string): boolean {
    return validateForumImageUrls(`<img src="${url}">`).valid;
  }
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
  <TipTapEditor {content} onChange={(html) => (content = html)} validateImageUrl={isValidImageUrl} />
  <div class="mt-3 flex justify-end">
    <SubmitButton class="font-cinzel" {pending}>{submitLabel}</SubmitButton>
  </div>
</form>

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { enhance } from '$app/forms';
  import TipTapEditor from '$lib/components/editor/TipTapEditor.svelte';
  import SubmitButton from '$lib/components/ui/SubmitButton.svelte';
  import { validateForumImageUrls } from '$lib/auth';
  import type { QuotePayload } from '$lib/forum';
  import {
    REPLY_MAX_LENGTH,
    buildQuoteBlock,
    clearDraft,
    isOverLimit,
    loadDraft,
    plainTextLength,
    saveDraft,
    shouldClearDraft,
  } from '$lib/forum-compose';

  let {
    action = '?/reply',
    submitLabel = 'Responder',
    placeholder = 'Escribí tu respuesta…',
    draftKey = null,
    maxLength = REPLY_MAX_LENGTH,
    autosaveMs = 300,
    quotePayload = null,
    onClearQuote = undefined,
  }: {
    action?: string;
    submitLabel?: string;
    placeholder?: string;
    draftKey?: string | null;
    maxLength?: number;
    autosaveMs?: number;
    quotePayload?: QuotePayload | null;
    onClearQuote?: (() => void) | undefined;
  } = $props();

  let pending = $state(false);
  let content = $state('');
  let charCount = $state(0);
  let savedIndicator = $state(false);
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  // Content is "established" once a restored draft or user input fills the editor;
  // an incoming quote must never clobber it. Plain lets (not $state) so the
  // `$effect` below only re-runs on `quotePayload` changes.
  let contentEstablished = false;
  let appliedQuoteId = '';
  // Client-side mirror of the server validateForumImageUrls() (REQ-FORUM-03.5).
  function isValidImageUrl(url: string): boolean {
    return validateForumImageUrls(`<img src="${url}">`).valid;
  }

  function scheduleAutosave() {
    if (!draftKey) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveDraft(window.localStorage, draftKey, { content, timestamp: Date.now() });
      savedIndicator = true;
      setTimeout(() => {
        savedIndicator = false;
      }, 2000);
    }, autosaveMs);
  }

  function handleChange(html: string) {
    content = html;
    contentEstablished = true;
    scheduleAutosave();
  }

  function handleSubmitSuccess(resultType: string) {
    if (draftKey && shouldClearDraft(resultType)) {
      clearDraft(window.localStorage, draftKey);
    }
  }

  onMount(() => {
    const draft = draftKey ? loadDraft(window.localStorage, draftKey) : null;
    if (draft?.content) {
      content = draft.content;
      charCount = plainTextLength(content);
      savedIndicator = true;
      contentEstablished = true;
    } else if (quotePayload) {
      content = buildQuoteBlock(quotePayload, maxLength);
      charCount = plainTextLength(content);
      appliedQuoteId = quotePayload.post_id;
      contentEstablished = true;
    }
  });

  // Quote prefill must be reactive (REQ-FC-04): the route sets `quotePayload`
  // AFTER mount when the user clicks Citar, so an onMount-only branch never runs.
  // Apply the blockquote only for a NEW quote and only while the editor has no
  // restored draft or user-typed content — both of those always win.
  $effect(() => {
    if (quotePayload && !contentEstablished && appliedQuoteId !== quotePayload.post_id) {
      appliedQuoteId = quotePayload.post_id;
      content = buildQuoteBlock(quotePayload, maxLength);
      charCount = plainTextLength(content);
      contentEstablished = true;
    }
  });

  // Clear also removes the prefilled blockquote so × leaves no stale quoted text.
  function handleClearQuote() {
    if (quotePayload) {
      const block = buildQuoteBlock(quotePayload, maxLength);
      content = content.replace(block, '').trim();
      charCount = plainTextLength(content);
    }
    onClearQuote?.();
  }

  onDestroy(() => {
    clearTimeout(saveTimer);
  });
</script>

<div class="composer">
  <form
    method="POST"
    action={action}
    use:enhance={() => {
      pending = true;
      return async ({ update, result }) => {
        pending = false;
        handleSubmitSuccess(result.type);
        await update();
      };
    }}
  >
    <input type="hidden" name="content" bind:value={content} />
    {#if quotePayload}
      <input type="hidden" name="quote_author" value={quotePayload.author_display_name} />
      <input type="hidden" name="quote_excerpt" value={quotePayload.body_excerpt} />
      <input type="hidden" name="quote_post_id" value={quotePayload.post_id} />
    {/if}

    {#if quotePayload}
      <div style="padding:16px 16px 0">
        <span class="reply-to" role="status">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M19 10c0 4-3 7-8 7v3l-6-5 6-5v3c3 0 5-1 5-3h3z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" /></svg>
          Respondiendo a <b>{quotePayload.author_display_name}</b>
          {#if onClearQuote}
            <button
              type="button"
              class="btn btn-ghost btn-sm"
              aria-label="Cancelar cita"
              onclick={handleClearQuote}
            >
              ✕
            </button>
          {/if}
        </span>
      </div>
    {/if}

    <TipTapEditor
      {content}
      onChange={handleChange}
      onCharCount={(n) => (charCount = n)}
      validateImageUrl={isValidImageUrl}
    />

    <div class="composer-foot">
      <span class="count">
        <span role="status" data-testid="draft-indicator">
          {savedIndicator ? 'Borrador guardado' : ''}
        </span>
        {#if savedIndicator}<span aria-hidden="true"> · </span>{/if}
        <span data-testid="char-counter">
          {charCount}/{maxLength}
          {#if isOverLimit(charCount, maxLength)}
            <span class="text-error block" role="alert">
              Has superado el límite de {maxLength} caracteres.
            </span>
          {/if}
        </span>
      </span>
      <div class="row" style="gap:10px">
        <SubmitButton
          class="font-cinzel"
          {pending}
          disabled={isOverLimit(charCount, maxLength)}
        >
          {submitLabel}
        </SubmitButton>
      </div>
    </div>
  </form>
</div>

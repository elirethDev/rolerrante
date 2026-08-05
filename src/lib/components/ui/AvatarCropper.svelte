<script lang="ts">
  import Cropper from 'cropperjs';
  import 'cropperjs/dist/cropper.css';
  import { AVATAR_MAX_BYTES, AVATAR_OUTPUT_SIZE } from '$lib/avatars';

  const DEFAULT_QUALITY = 0.85;
  const QUALITY_STEPS = [0.85, 0.7, 0.55, 0.4, 0.3];

  interface Props {
    src: string;
    outputSize?: number;
    onavatarfile?: (file: File) => void;
  }

  let { src, outputSize = AVATAR_OUTPUT_SIZE, onavatarfile }: Props = $props();

  let imgEl: HTMLImageElement;
  let cropper: Cropper | null = null;
  let error = $state<string | null>(null);
  let busy = $state(false);

  $effect(() => {
    const el = imgEl;
    if (!el || !src) return;
    if (cropper) {
      cropper.destroy();
      cropper = null;
    }
    cropper = new Cropper(el, {
      viewMode: 1,
      aspectRatio: 1, // fixed 1:1 square frame (REQ-AVUP-01)
      autoCropArea: 1,
      background: false,
      cropBoxMovable: true,
      cropBoxResizable: false,
      zoomOnWheel: true,
      wheelZoomRatio: 0.05,
    });
    return () => {
      cropper?.destroy();
      cropper = null;
    };
  });

  function zoom(delta: number) {
    cropper?.zoom(delta);
  }

  function canvasToWebp(canvas: HTMLCanvasElement): Promise<Blob | null> {
    // Quality loop: step down WebP quality until the blob fits the max bytes
    // (REQ-AVUP-02). Ties to AVATAR_MAX_BYTES so the server cap is never hit.
    return new Promise((resolve) => {
      const tryQuality = (index: number) => {
        if (index >= QUALITY_STEPS.length) {
          resolve(null);
          return;
        }
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(null);
              return;
            }
            if (blob.size <= AVATAR_MAX_BYTES) {
              resolve(blob);
              return;
            }
            tryQuality(index + 1);
          },
          'image/webp',
          QUALITY_STEPS[index] ?? DEFAULT_QUALITY,
        );
      };
      tryQuality(0);
    });
  }

  async function confirm() {
    if (!cropper || busy) return;
    busy = true;
    error = null;
    try {
      const canvas = cropper.getCroppedCanvas({
        width: outputSize,
        height: outputSize,
        imageSmoothingQuality: 'high',
      });
      const blob = await canvasToWebp(canvas);
      if (!blob) {
        error = 'No se pudo ajustar la imagen al tamaño máximo permitido. Probá con otra imagen.';
        return;
      }
      onavatarfile?.(new File([blob], 'avatar.webp', { type: 'image/webp' }));
    } finally {
      busy = false;
    }
  }
</script>

<div class="flex flex-col gap-3">
  <div class="relative mx-auto max-h-72 w-full overflow-hidden rounded-lg border border-azeroth-border bg-base-200">
    <img
      data-testid="cropper-img"
      bind:this={imgEl}
      src={src}
      alt="Vista previa del avatar para recortar"
      class="max-h-72 w-full object-contain"
    />
  </div>

  <div class="flex flex-wrap items-center gap-2">
    <button type="button" class="btn btn-sm" onclick={() => zoom(0.1)} aria-label="Acercar">＋</button>
    <button type="button" class="btn btn-sm" onclick={() => zoom(-0.1)} aria-label="Alejar">－</button>
    <button type="button" class="btn btn-sm btn-primary ml-auto font-cinzel" onclick={confirm} disabled={busy}>
      Confirmar recorte
    </button>
  </div>

  {#if error}
    <p class="text-sm text-error" role="alert">{error}</p>
  {/if}
</div>

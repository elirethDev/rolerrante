// Vitest alias target for SvelteKit's virtual module `$app/forms`.
// In unit tests `use:enhance` is inert — we only need the action enhancer to
// exist as an identity function so SkillRequestForm.svelte compiles/renders.

export function enhance(): unknown {
  // use:enhance is inert in unit tests — the action enhancer is an identity
  // function so SkillRequestForm.svelte compiles/renders.
  return () => {};
}

export const applyAction = async (result: { type: string; status: number; data?: unknown }): Promise<void> => {
  throw new Error(
    `Unhandled SvelteKit action result in test: ${result.type} (${result.status})`,
  );
};

export const deserialize = (raw: string): unknown => raw;

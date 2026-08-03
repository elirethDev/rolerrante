import '@testing-library/jest-dom/vitest';
// Manual @testing-library/svelte cleanup: we disable the plugin's autoCleanup
// (svelteTesting({ autoCleanup: false })) so its injected setup path — which
// resolves through the junction-linked node_modules to an /@fs/ URL outside the
// project root — does not break the test runner in git-worktree checkouts.
import { act, cleanup, setup } from '@testing-library/svelte';
import { afterEach, beforeEach } from 'vitest';

beforeEach(async () => {
  await setup();
});

afterEach(async () => {
  await act();
  cleanup();
});

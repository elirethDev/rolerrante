import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import ThreadList from './ThreadList.svelte';

const thread = (p: Partial<Record<string, unknown>> = {}) => ({
  id: 't1',
  title: 'Mi hilo',
  content_type: 'debate',
  status: 'abierto',
  is_locked: false,
  is_sticky: false,
  created_at: '2026-08-02T00:00:00Z',
  edited_at: null,
  category_id: 'c1',
  ...p,
});

describe('ThreadList', () => {
  it('renders thread titles and author info', () => {
    render(ThreadList, { threads: [thread()] });
    expect(screen.getByText('Mi hilo')).toBeInTheDocument();
  });

  it('shows a lock badge on locked threads', () => {
    render(ThreadList, { threads: [thread({ is_locked: true })] });
    expect(screen.getByTestId('lock-badge')).toBeInTheDocument();
    expect(screen.getByText('Bloqueado')).toBeInTheDocument();
  });

  it('does not show lock badge on unlocked threads', () => {
    render(ThreadList, { threads: [thread({ is_locked: false })] });
    expect(screen.queryByTestId('lock-badge')).not.toBeInTheDocument();
  });

  it('shows a pin badge on sticky threads', () => {
    render(ThreadList, { threads: [thread({ is_sticky: true })] });
    expect(screen.getByTestId('pin-badge')).toBeInTheDocument();
    expect(screen.getByText('Fijado')).toBeInTheDocument();
  });

  it('does not show pin badge on non-sticky threads', () => {
    render(ThreadList, { threads: [thread({ is_sticky: false })] });
    expect(screen.queryByTestId('pin-badge')).not.toBeInTheDocument();
  });
});

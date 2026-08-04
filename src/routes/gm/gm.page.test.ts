/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import Page from './+page.svelte';
import type { WorklistItem } from '$lib/components/gm/types';

vi.mock('$app/navigation', () => ({
  goto: vi.fn(),
}));

import { goto } from '$app/navigation';

const item = (over: Partial<WorklistItem> = {}): WorklistItem => ({
  id: '1',
  type: 'ficha',
  name: 'Ficha de prueba',
  author: 'Autor GM',
  createdAt: '2026-01-01T00:00:00Z',
  stale: false,
  detailHref: '/fichas/1',
  entityId: '1',
  ...over,
});

const queue: WorklistItem[] = [
  item({ id: 'c1', type: 'ficha', name: 'Ficha Uno' }),
  item({ id: 'e1', type: 'evento', name: 'Evento Dos' }),
  item({ id: 's1', type: 'cronica', name: 'Cronica Tres' }),
];

const kpi = { pendientes: 3, aprobadasHoy: 1, tiempoMedio: 12, antiguedad48h: 0 };

function props(over: any = {}) {
  return {
    data: {
      queue,
      kpi,
      lastAction: null,
      ...over,
    },
  };
}

const gotoMock = goto as unknown as ReturnType<typeof vi.fn>;

describe('gm/+page.svelte wiring', () => {
  beforeEach(() => {
    gotoMock.mockClear();
  });

  it('renders the KPI grid with the loader analytics', () => {
    const { unmount } = render(Page, props());
    expect(screen.getByTestId('gm-analytics')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // Pendientes 3
    expect(screen.getByText('Aprobadas hoy')).toBeInTheDocument();
    expect(screen.getByText('12h')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // Aprobadas hoy 1
    unmount();
  });

  it('renders all pending rows as worklist cards', () => {
    const { unmount } = render(Page, props());
    expect(screen.getAllByTestId('wl-card')).toHaveLength(3);
    expect(screen.getByText('Ficha Uno')).toBeInTheDocument();
    expect(screen.getByText('Evento Dos')).toBeInTheDocument();
    expect(screen.getByText('Cronica Tres')).toBeInTheDocument();
    unmount();
  });

  it('filters the list client-side when a chip is selected (no reload)', async () => {
    const { unmount } = render(Page, props());
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Fichas' }));
    await waitFor(() => {
      expect(screen.getAllByTestId('wl-card')).toHaveLength(1);
    });
    expect(screen.getByText('Ficha Uno')).toBeInTheDocument();
    expect(screen.queryByText('Evento Dos')).not.toBeInTheDocument();
    unmount();
  });

  it('renders the audit banner when lastAction is present (reusing AuditBanner)', () => {
    const { unmount } = render(
      Page,
      props({
        lastAction: {
          action: 'aprobar',
          entityType: 'ficha',
          entityId: 'abc123456789',
          actor: 'Arthas',
          createdAt: '2026-08-03T09:00:00.000Z',
        },
      }),
    );
    // AuditActionBadge renders the label for the action
    expect(screen.getByText('Aprobación')).toBeInTheDocument();
    expect(screen.getByText('Arthas')).toBeInTheDocument();
    unmount();
  });
});

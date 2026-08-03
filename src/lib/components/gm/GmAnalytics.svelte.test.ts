import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import GmAnalytics from './GmAnalytics.svelte';
import type { GmKpi } from './types';

// Spec gm-analytics R1: KPI grid shows Pendientes, Aprobadas hoy, Tiempo medio (h),
// Antigüedad >48h. Scenario: KPI grid displays current metrics.

describe('GmAnalytics', () => {
  const kpi: GmKpi = { pendientes: 5, aprobadasHoy: 3, tiempoMedio: 12.5, antiguedad48h: 2 };

  it('renders pendientes count with its label', () => {
    render(GmAnalytics, { kpi });
    expect(screen.getByText('Pendientes')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders approved-today count with its label', () => {
    render(GmAnalytics, { kpi });
    expect(screen.getByText('Aprobadas hoy')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders average review time in hours', () => {
    render(GmAnalytics, { kpi });
    expect(screen.getByText('Tiempo medio')).toBeInTheDocument();
    expect(screen.getByText('12.5h')).toBeInTheDocument();
  });

  it('renders stale >48h count with its label', () => {
    render(GmAnalytics, { kpi });
    expect(screen.getByText('Antigüedad >48h')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Page from '../../src/routes/+page.svelte';

describe('landing page', () => {
  it('renders the cinema hero title with gold-gradient em and subtitle', () => {
    render(Page);
    const title = screen.getByRole('heading', { level: 1 });
    expect(title).toHaveTextContent('Leyendas');
    expect(title).toHaveTextContent('forjan en la palabra');
    expect(title.querySelector('em')).toBeInTheDocument();
    expect(screen.getByText(/comunidad de juego de rol en World of Warcraft/)).toBeInTheDocument();
  });

  it('renders the hero CTAs linking to the forum and character creation', () => {
    render(Page);
    expect(screen.getByRole('link', { name: 'Explorar los foros' })).toHaveAttribute('href', '/foro');
    expect(screen.getByRole('link', { name: 'Crear mi ficha' })).toHaveAttribute(
      'href',
      '/personajes/nuevo',
    );
  });

  it('renders the KPI band with community figures', () => {
    render(Page);
    const band = screen.getByLabelText(/Cifras de la comunidad/);
    expect(band.textContent).toContain('Roleros');
    expect(band.textContent).toContain('1.2M');
    expect(band.textContent).toContain('Crónicas completas');
    expect(screen.getByText('4.6★')).toBeInTheDocument();
  });

  it('renders the split feature sections with feat-list items', () => {
    render(Page);
    expect(screen.getByRole('heading', { name: 'Del silencio al salón' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Un rostro para cada historia' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Menos clics, más aventura' })).toBeInTheDocument();
    expect(screen.getByText('Crónicas abiertas')).toBeInTheDocument();
    expect(screen.getByText('Vínculos visibles')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Entrar a los foros' })).toBeInTheDocument();
  });

  it('mounts the canonical footer', () => {
    render(Page);
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByText(/© 2026 Rol Errante · Identidad original/i)).toBeInTheDocument();
  });
});

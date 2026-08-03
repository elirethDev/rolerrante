import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Footer from './Footer.svelte';

describe('Footer', () => {
  it('renders brand, section headings and footer-bottom line', () => {
    render(Footer);
    expect(screen.getByRole('link', { name: /Rol\s*Errante/i })).toBeInTheDocument();
    expect(screen.getByText('Comunidad')).toBeInTheDocument();
    expect(screen.getByText('Acceso')).toBeInTheDocument();
    expect(screen.getByText('Contacto y redes')).toBeInTheDocument();
    expect(screen.getByText(/© 2026 Rol Errante · Identidad original/i)).toBeInTheDocument();
  });

  it('renders the social contact note email and mailto link', () => {
    render(Footer);
    expect(screen.getByText('consejo@rolerrante.com')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Correo' })).toHaveAttribute(
      'href',
      'mailto:consejo@rolerrante.com',
    );
    expect(screen.getByRole('link', { name: 'Discord' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Twitch' })).toBeInTheDocument();
  });

  it('applies the gold hairline top border and the contact-note class', () => {
    render(Footer);
    expect(document.querySelector('footer')).toHaveClass('azeroth-hairline-top');
    expect(document.querySelector('.contact-note')).toBeInTheDocument();
  });
});

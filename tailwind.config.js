import daisyui from 'daisyui';
import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      fontFamily: {
        cinzel: ['Cinzel', 'serif'],
      },
      colors: {
        azeroth: {
          gold: '#C8AA6E',
          dark: '#0F1115',
          panel: '#1A1C23',
          border: '#3A2F1F',
        },
      },
    },
  },
  plugins: [daisyui, typography],
  daisyui: {
    themes: [
      {
        azeroth: {
          primary: '#C8AA6E',
          secondary: '#2C3E50',
          accent: '#8E44AD',
          neutral: '#1A1C23',
          'base-100': '#0F1115',
          'base-200': '#1A1C23',
          'base-300': '#2A2D36',
          info: '#3498DB',
          success: '#27AE60',
          warning: '#F1C40F',
          error: '#C0392B',
        },
      },
    ],
  },
};

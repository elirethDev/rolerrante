// See https://kit.svelte.dev/docs/types#app
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/supabase/database.types';

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient<Database>;
      session: import('@supabase/supabase-js').Session | null;
      safeGetSession: () => Promise<{
        session: import('@supabase/supabase-js').Session | null;
        user: import('@supabase/supabase-js').User | null;
      }>;
      user: import('@supabase/supabase-js').User | null;
      profile: {
        id: string;
        username: string;
        display_name: string | null;
        role: string;
        avatar_url: string | null;
      } | null;
    }
    interface PageData {
      user: import('@supabase/supabase-js').User | null;
      profile: {
        id: string;
        username: string;
        display_name: string | null;
        role: string;
        avatar_url: string | null;
      } | null;
    }
    // interface Error {}
    // interface Platform {}
  }

  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      remove: (widgetId: string) => void;
    };
  }
}

export {};
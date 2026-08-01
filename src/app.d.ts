// See https://kit.svelte.dev/docs/types#app
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/supabase/database.types';
import type { UserRole } from '$lib/types';

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
        role: UserRole;
        avatar_url: string | null;
        created_at: string;
        updated_at: string;
      } | null;
    }
    interface PageData {
      user: import('@supabase/supabase-js').User | null;
      profile: {
        id: string;
        username: string;
        display_name: string | null;
        role: UserRole;
        avatar_url: string | null;
        created_at: string;
        updated_at: string;
      } | null;
    }
    // interface Error {}
    // interface Platform {}
  }

  interface Window {
    turnstile?: {
      // eslint-disable-next-line no-unused-vars
      render: (_container: HTMLElement, _options: Record<string, unknown>) => string;
      // eslint-disable-next-line no-unused-vars
      remove: (_widgetId: string) => void;
    };
  }
}

export {};
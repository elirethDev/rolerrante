import { fail } from '@sveltejs/kit';
import { requireAuth, validateImageUrl } from '$lib/auth';
import { buildAvatarPath, avatarPublicUrl, validateAvatarUpload } from '$lib/avatars';
import type { Actions, PageServerLoad, RequestEvent } from './$types';

export interface ProfileKpis {
  personajes: number;
  cronicas: number;
  eventos: number;
  reputacion: number;
}

export type ActivityKind = 'crónica' | 'personaje' | 'evento' | 'notificación';

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  label: string;
  date: string;
  href?: string;
}

const ACTIVITY_LIMIT = 8;
const NOTIFICATION_LIMIT = 5;

const NOTIFICATION_LABELS: Record<string, string> = {
  new_reply: 'Nueva respuesta en un hilo del foro',
  new_reaction: 'Nueva reacción a tu mensaje',
  mention: 'Te mencionaron en el foro',
  follow: 'Alguien empezó a seguir tu hilo',
};

function notificationLabel(type: string): string {
  return NOTIFICATION_LABELS[type] ?? `Nueva notificación (${type})`;
}

export const load: PageServerLoad = async ({ locals: { supabase, profile, user } }) => {
  requireAuth({ user, profile });

  const [charactersRes, eventsRes, notificationsRes] = await Promise.all([
    supabase
      .from('characters')
      .select('id, name, rp_points, status, updated_at')
      .eq('player_id', user!.id)
      .order('updated_at', { ascending: false }),
    supabase
      .from('events')
      .select('id, title, status, created_at')
      .eq('creator_id', user!.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('notifications')
      .select('id, type, created_at')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(NOTIFICATION_LIMIT),
  ]);

  const characters = charactersRes.data ?? [];
  const events = eventsRes.data ?? [];
  const notifications = notificationsRes.data ?? [];

  const approvedCharacters = characters.filter((c) => c.status === 'aprobado');
  const characterIds = characters.map((c) => c.id);

  const stories =
    characterIds.length > 0
      ? (await supabase
          .from('stories')
          .select('id, title, status, updated_at')
          .in('character_id', characterIds)
          .order('updated_at', { ascending: false })).data ?? []
      : [];
  const approvedStories = stories.filter((s) => s.status === 'aprobado');
  const activeEvents = events.filter((e) => e.status !== 'cancelado');

  const personajes = approvedCharacters.length;
  const cronicas = approvedStories.length;
  const eventos = activeEvents.length;

  // reputación is a DERIVED demo proxy (design §4.6): there is no reputación
  // column in the schema yet. It is computed here as sum(RP points on approved
  // characters) + approved crónicas + active events, and must be clearly read
  // as a demo value until a real reputation rule is defined (follow-up: add a
  // reputación column once game design locks the formula).
  const reputacion =
    approvedCharacters.reduce((sum, c) => sum + (c.rp_points ?? 0), 0) +
    cronicas +
    eventos;

  const actividad: ActivityItem[] = [
    ...stories.map((s) => ({
      id: `story-${s.id}`,
      kind: 'crónica' as const,
      label: `Actualizaste la crónica «${s.title}»`,
      date: s.updated_at,
      href: `/historias/${s.id}`,
    })),
    ...approvedCharacters.map((c) => ({
      id: `character-${c.id}`,
      kind: 'personaje' as const,
      label: `Tu personaje «${c.name}» fue aprobado`,
      date: c.updated_at,
      href: `/personajes/${c.id}`,
    })),
    ...activeEvents.map((e) => ({
      id: `event-${e.id}`,
      kind: 'evento' as const,
      label: `Creaste el evento «${e.title}»`,
      date: e.created_at,
      href: `/eventos/${e.id}`,
    })),
    ...notifications.map((n) => ({
      id: `notif-${n.id}`,
      kind: 'notificación' as const,
      label: notificationLabel(n.type),
      date: n.created_at,
      href: '/notificaciones',
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, ACTIVITY_LIMIT);

  return {
    profile: profile!,
    kpis: { personajes, cronicas, eventos, reputacion },
    actividad,
  };
};

export const actions: Actions = {
  default: async ({ request, locals: { supabase, user, profile } }: RequestEvent) => {
    requireAuth({ user, profile });
    const form = await request.formData();
    const displayName = String(form.get('display_name') ?? '').trim();
    const file = form.get('avatar_file');

    let avatarUrl: string | null;
    if (file instanceof File && file.size > 0) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const validation = validateAvatarUpload({ bytes, size: file.size, name: file.name });
      if (!validation.ok) {
        return fail(400, { message: validation.error });
      }
      const path = buildAvatarPath('profile', user!.id, file.name);
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, bytes, {
          contentType: 'image/webp',
          upsert: true,
          cacheControl: '31536000',
        });
      if (uploadError) return fail(400, { message: uploadError.message });
      avatarUrl = avatarPublicUrl(path);
    } else {
      const rawAvatar = String(form.get('avatar_url') ?? '').trim();
      if (rawAvatar && !validateImageUrl(rawAvatar).valid) {
        return fail(400, { message: 'URL de avatar no válida' });
      }
      avatarUrl = rawAvatar || null;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName || profile?.username, avatar_url: avatarUrl, updated_at: new Date().toISOString() })
      .eq('id', user!.id);

    if (error) return fail(400, { message: error.message });
    return { success: true };
  },

  changePassword: async ({ request, locals: { supabase, user, profile } }: RequestEvent) => {
    requireAuth({ user, profile });
    const form = await request.formData();
    const currentPassword = String(form.get('current_password') ?? '');
    const newPassword = String(form.get('new_password') ?? '');
    const confirmPassword = String(form.get('confirm_password') ?? '');

    if (!newPassword || newPassword.length < 6) {
      return fail(400, { message: 'Mínimo 6 caracteres para la nueva contraseña' });
    }
    if (newPassword !== confirmPassword) {
      return fail(400, { message: 'Las contraseñas no coinciden' });
    }
    if (currentPassword) {
      const { error } = await supabase.auth.signInWithPassword({
        email: user?.email ?? '',
        password: currentPassword,
      });
      if (error) return fail(400, { message: 'La contraseña actual es incorrecta' });
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) return fail(400, { message: updateError.message });
    return { success: true, message: 'Contraseña actualizada' };
  },
};

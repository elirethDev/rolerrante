import { toExcerpt } from '$lib/forum-compose';
import type { Json } from '$lib/supabase/database.types';
import type { PageServerLoad } from './$types';

/**
 * Landing public data (landing-community). Every section degrades to its empty
 * state when the query fails or the DB has no rows — a Supabase error never
 * throws for the whole page. Only visible rows are read (status-gated).
 */

const EXCERPT_MAX = 120;
const HOT_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface LandingFeedItem {
  id: string;
  title: string;
  contentTypeLabel: string;
  isSticky: boolean;
  isLocked: boolean;
  isHot: boolean;
  authorName: string;
  categoryName: string | null;
  updatedAt: string;
  createdAt: string;
}

export interface LandingCronica {
  id: string;
  title: string;
  excerpt: string;
  authorName: string;
  tag: string;
}

export interface LandingEvento {
  id: string;
  title: string;
  excerpt: string;
  authorName: string;
  day: string;
  month: string;
  startsAt: string;
}

export interface LandingFicha {
  id: string;
  name: string;
  avatarUrl: string | null;
  meta: string;
  tag: string;
  tagKind: 'success' | 'info';
  ownerName: string;
  updatedAt: string;
}

const CONTENT_TYPE_LABEL: Record<string, string> = {
  historia: 'Crónica',
  ficha: 'Ficha',
  evento: 'Evento',
  debate: 'Hilo',
};

function contentTypeLabel(type: string | null | undefined): string {
  return (type && CONTENT_TYPE_LABEL[type]) || 'Hilo';
}

function displayName(a: { username?: string | null; display_name?: string | null } | null | undefined): string {
  return a?.display_name || a?.username || 'Anónimo';
}

function monthLabel(iso: string): string {
  const raw = new Date(iso).toLocaleDateString('es-ES', { month: 'short' });
  return raw.charAt(0).toUpperCase() + raw.slice(1, 3);
}

/** Extract plain text from a thread/event body: HTML string or TipTap JSON doc. */
function tiptapText(node: unknown): string {
  if (Array.isArray(node)) return node.map(tiptapText).join(' ');
  if (node && typeof node === 'object') {
    const n = node as Record<string, unknown>;
    const text = typeof n.text === 'string' ? n.text : '';
    const inner = Array.isArray(n.content) ? n.content.map(tiptapText).join(' ') : '';
    return [text, inner].filter(Boolean).join(' ');
  }
  return '';
}

function extractExcerpt(value: Json | null | undefined, max = EXCERPT_MAX): string {
  if (value == null) return '';
  const plain = typeof value === 'string' ? toExcerpt(value, max) : tiptapText(value);
  const normalized = plain.replace(/\s+/g, ' ').trim();
  return normalized.length <= max ? normalized : normalized.slice(0, max).trim();
}

/** Await any supabase query and coerce failures to an empty row array. */
async function rowsOrEmpty<T>(run: () => PromiseLike<{ data: unknown; error: unknown }>): Promise<T[]> {
  try {
    const res = await run();
    return (res.data ?? []) as T[];
  } catch (err) {
    console.error('[landing] consulta degradada a estado vacío', err);
    return [];
  }
}

type ThreadAuthor = { username?: string | null; display_name?: string | null };
type ThreadCategory = { name?: string | null };
type FeedThreadRow = {
  id: string;
  title: string;
  content_type: string | null;
  status: string;
  is_locked: boolean;
  is_sticky: boolean;
  updated_at: string;
  created_at: string;
  body: Json;
  author: ThreadAuthor | null;
  category: ThreadCategory | null;
};

type EventRow = {
  id: string;
  title: string;
  description: Json;
  starts_at: string | null;
  status: string;
  creator: ThreadAuthor | null;
};

type CharRow = {
  id: string;
  name: string;
  avatar_url: string | null;
  status: string;
  updated_at: string;
  race: { name?: string | null; group_name?: string | null } | null;
  owner: ThreadAuthor | null;
};

// --- Community presence (landing-community) ----------------------------------
// Discord widget: public JSON, fetched server-side only (the widget URL must
// never reach the client). No CSP change: member names only, Discord avatar
// URLs are discarded (REQ-DW-03). The static invite is the fallback when
// Discord is unreachable or returns non-2xx.
const DISCORD_WIDGET_URL = 'https://discord.com/api/guilds/1284639402273931355/widget.json';
const STATIC_DISCORD_INVITE = 'https://discord.gg/xDJTmZAxPU';
const PRESENCE_WINDOW_MS = 3 * 60_000;

export interface DiscordWidget {
  online: number | null;
  members: string[];
  invite: string;
}

export interface OnlineUser {
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

const EMPTY_DISCORD: DiscordWidget = {
  online: null,
  members: [],
  invite: STATIC_DISCORD_INVITE,
};

type DiscordWidgetRow = {
  presence_count?: number;
  instant_invite?: string | null;
  members?: Array<{ username?: string }>;
};

async function fetchDiscordWidget(): Promise<DiscordWidget> {
  try {
    const res = await fetch(DISCORD_WIDGET_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RolErrante/1.0)' },
    });
    if (!res.ok) return EMPTY_DISCORD;
    const json = (await res.json()) as DiscordWidgetRow;
    return {
      online: typeof json.presence_count === 'number' ? json.presence_count : null,
      members: (json.members ?? [])
        .map((m) => m.username)
        .filter((u): u is string => typeof u === 'string' && u.length > 0),
      invite:
        typeof json.instant_invite === 'string' && json.instant_invite.length > 0
          ? json.instant_invite
          : STATIC_DISCORD_INVITE,
    };
  } catch (err) {
    console.error('[landing] widget de Discord degradado a estado vacío', err);
    return EMPTY_DISCORD;
  }
}

type OnlineUserRow = {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
  const [feedRows, cronicaRows, eventRows, charRows, discordWidget, onlineRows] =
    await Promise.all([
      rowsOrEmpty<FeedThreadRow>(() =>
        supabase
          .from('threads')
          .select(
            'id, title, content_type, status, is_locked, is_sticky, updated_at, created_at, body, author:author_id(username, display_name), category:category_id(name)',
          )
          .in('status', ['abierto', 'aprobado'])
          .order('updated_at', { ascending: false })
          .limit(6),
      ),
      rowsOrEmpty<FeedThreadRow>(() =>
        supabase
          .from('threads')
          .select('id, title, status, updated_at, body, author:author_id(username, display_name)')
          .eq('content_type', 'historia')
          .in('status', ['abierto', 'aprobado'])
          .order('updated_at', { ascending: false })
          .limit(3),
      ),
      rowsOrEmpty<EventRow>(() =>
        supabase
          .from('events')
          .select('id, title, description, starts_at, status, creator:creator_id(username, display_name)')
          .in('status', ['publicado', 'en_curso', 'finalizacion_pendiente'])
          .order('starts_at', { ascending: true, nullsFirst: false })
          .limit(4),
      ),
      rowsOrEmpty<CharRow>(() =>
        supabase
          .from('characters')
          .select('id, name, avatar_url, status, updated_at, race:race_id(name, group_name), owner:player_id(username, display_name)')
          .in('status', ['aprobado', 'pendiente'])
          .order('updated_at', { ascending: false })
          .limit(8),
      ),
      fetchDiscordWidget(),
      rowsOrEmpty<OnlineUserRow>(() =>
        supabase
          .from('profiles')
          .select('username, display_name, avatar_url')
          .gt('last_active_at', new Date(Date.now() - PRESENCE_WINDOW_MS).toISOString())
          .order('last_active_at', { ascending: false })
          .limit(12),
      ),
    ]);

  const now = Date.now();
  const feed: LandingFeedItem[] = feedRows.map((t) => ({
    id: t.id,
    title: t.title,
    contentTypeLabel: contentTypeLabel(t.content_type),
    isSticky: t.is_sticky,
    isLocked: t.is_locked,
    isHot: now - Date.parse(t.updated_at) < HOT_WINDOW_MS,
    authorName: displayName(t.author),
    categoryName: t.category?.name ?? null,
    updatedAt: t.updated_at,
    createdAt: t.created_at,
  }));

  const cronicas: LandingCronica[] = cronicaRows.map((t) => ({
    id: t.id,
    title: t.title,
    excerpt: extractExcerpt(t.body),
    authorName: displayName(t.author),
    tag: t.status === 'abierto' ? 'Crónica · abierta' : 'Crónica · aprobada',
  }));

  const eventos: LandingEvento[] = eventRows
    .filter((e) => e.starts_at)
    .slice(0, 2)
    .map((e) => ({
      id: e.id,
      title: e.title,
      excerpt: extractExcerpt(e.description),
      authorName: displayName(e.creator),
      day: String(new Date(e.starts_at!).getDate()),
      month: monthLabel(e.starts_at!),
      startsAt: e.starts_at!,
    }));

  const fichas: LandingFicha[] = charRows
    .slice()
    .sort((a, b) => Number(b.status === 'aprobado') - Number(a.status === 'aprobado'))
    .slice(0, 4)
    .map((c) => ({
      id: c.id,
      name: c.name,
      avatarUrl: c.avatar_url,
      meta: `${c.race?.name ?? 'Sin raza'}${c.race?.group_name ? ` · ${c.race.group_name}` : ''}`,
      tag: c.status === 'aprobado' ? 'Canon' : 'En revisión',
      tagKind: c.status === 'aprobado' ? 'success' : 'info',
      ownerName: displayName(c.owner),
      updatedAt: c.updated_at,
    }));

  const onlineUsers: OnlineUser[] = onlineRows.map((r) => ({
    username: r.username,
    displayName: r.display_name || r.username,
    avatarUrl: r.avatar_url,
  }));

  return { feed, cronicas, eventos, fichas, discordWidget, onlineUsers };
};

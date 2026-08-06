import type { PageServerLoad } from './$types';

export const STORY_TABS = ['todas', 'aprobadas', 'revision', 'borradores', 'mias'] as const;
export type StoryTab = (typeof STORY_TABS)[number];

type StoryStatus = 'pendiente' | 'borrador' | 'aprobado' | 'rechazado';

const STORY_STATUS: Partial<Record<StoryTab, StoryStatus>> = {
  aprobadas: 'aprobado',
  revision: 'pendiente',
  borradores: 'borrador',
};

// El feed embebe el personaje (inner) y su autor, de modo que "Mis historias"
// se resuelve contra el dueño del personaje (character.player_id) y la tarjeta
// muestra el autor sin consultas extra.
const STORY_SELECT =
  '*, character:character_id!inner(id, name, status, player:player_id!inner(id, display_name, username))';

type StoryRow = {
  id: string;
  status: string;
  title: string;
  created_at: string;
  character?: {
    id: string;
    name: string;
    status: string;
    player?: { id: string; display_name: string | null; username: string } | null;
  } | null;
};

export const load: PageServerLoad = async ({ locals: { supabase, user, profile }, url }) => {
  const rawTab = url.searchParams.get('tab') ?? 'todas';
  const tab: StoryTab = (STORY_TABS as readonly string[]).includes(rawTab)
    ? (rawTab as StoryTab)
    : 'todas';
  const q = url.searchParams.get('q')?.trim() ?? '';
  const userId = user?.id ?? null;
  const status = STORY_STATUS[tab] ?? null;
  const mineOnly = tab === 'mias';

  // Feed de referencia (las más recientes visibles) usado para los contadores de
  // pestaña. RLS ya limita lo visible, así que aquí no se filtra por estado.
  const { data: feed } = await supabase
    .from('stories')
    .select(STORY_SELECT)
    .order('created_at', { ascending: false })
    .limit(100);
  const base = (feed ?? []) as StoryRow[];

  const counts = {
    todas: base.length,
    aprobado: base.filter((s) => s.status === 'aprobado').length,
    pendiente: base.filter((s) => s.status === 'pendiente').length,
    borrador: base.filter((s) => s.status === 'borrador').length,
    mias: userId ? base.filter((s) => s.character?.player?.id === userId).length : 0,
  };

  // Ids de los personajes del usuario para el filtro "Mis historias". Corren
  // del lado de PostgREST (IN character_id) sin depender de filtros anidados.
  let myCharacterIds: string[] = [];
  if (mineOnly && userId) {
    const { data: mine } = await supabase.from('characters').select('id').eq('player_id', userId);
    myCharacterIds = (mine ?? []).map((c) => c.id);
  }

  let stories: StoryRow[] = [];
  if (mineOnly && myCharacterIds.length === 0) {
    stories = [];
  } else if (q) {
    // Búsqueda sobre todo el feed visible: título O nombre de personaje (ILIKE),
    // unión + dedup por id — mismo patrón que searchThreads en /foro.
    const pattern = `%${q}%`;

    let byTitle = supabase.from('stories').select(STORY_SELECT).ilike('title', pattern);
    if (status) byTitle = byTitle.eq('status', status);
    if (mineOnly) byTitle = byTitle.in('character_id', myCharacterIds);

    const charSel = mineOnly ? 'id, player_id' : 'id';
    const { data: namedChars } = await supabase
      .from('characters')
      .select(charSel)
      .ilike('name', pattern);
    const namedIds = mineOnly
      ? ((namedChars ?? []) as unknown as Array<{ id: string; player_id?: string | null }>)
          .filter((c) => c.player_id === userId)
          .map((c) => c.id)
      : ((namedChars ?? []) as unknown as Array<{ id: string }>).map((c) => c.id);

    const [titleRes, charsRes] = await Promise.all([
      byTitle,
      namedIds.length
        ? supabase.from('stories').select(STORY_SELECT).in('character_id', namedIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    let byName = (charsRes.data ?? []) as StoryRow[];
    if (status) byName = byName.filter((s) => s.status === status);

    const byId = new Map<string, StoryRow>();
    for (const s of [...((titleRes.data ?? []) as StoryRow[]), ...byName]) byId.set(s.id, s);
    stories = [...byId.values()];
  } else {
    let query = supabase.from('stories').select(STORY_SELECT);
    if (status) query = query.eq('status', status);
    if (mineOnly) query = query.in('character_id', myCharacterIds);
    const { data } = await query.order('created_at', { ascending: false }).limit(100);
    stories = (data ?? []) as StoryRow[];
  }

  return { stories, counts, tab, q, profile };
};

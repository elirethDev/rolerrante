import type { PageServerLoad } from './$types';

type CensusCharacter = {
  id: string;
  name: string;
  age: number | null;
  status: string;
  avatar_url: string | null;
  race: { name: string } | null;
  player: { display_name: string | null; username: string } | null;
};

// Public realm census (design personajes.html): the index lists approved
// characters from ALL players, with server-side name search (?q= ILIKE) and a
// race filter (?race=). Guests can browse it. Logged-in players additionally
// keep their own characters (any status) for management, and the nueva ficha
// action stays reachable via the page UI.
export const load: PageServerLoad = async ({ locals: { supabase, user, profile }, url }) => {
  const q = url.searchParams.get('q')?.trim() ?? '';
  const race = url.searchParams.get('race')?.trim() ?? '';

  const censusSelect =
    'id, name, age, status, avatar_url, race:race_id(name), player:player_id(display_name, username)';

  let censusQuery = supabase
    .from('characters')
    .select(censusSelect)
    .eq('status', 'aprobado')
    .order('created_at', { ascending: false });

  if (q) censusQuery = censusQuery.ilike('name', `%${q}%`);
  if (race) censusQuery = censusQuery.eq('race_id', race);

  const { data: characters } = await censusQuery;

  const { data: races } = await supabase.from('races').select('id, name').order('name');

  const ownCharacters: CensusCharacter[] = user
    ? ((await supabase
        .from('characters')
        .select(censusSelect)
        .eq('player_id', user.id)
        .order('created_at', { ascending: false })).data ?? [])
    : [];

  return {
    characters: (characters ?? []) as CensusCharacter[],
    races: races ?? [],
    ownCharacters,
    query: q,
    race,
    profile,
  };
};

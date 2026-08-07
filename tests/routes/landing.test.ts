import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import Page from "../../src/routes/+page.svelte";
import { load } from "../../src/routes/+page.server";
import type {
  LandingCronica,
  LandingEvento,
  LandingFeedItem,
  LandingFicha,
} from "../../src/routes/+page.server";

const feed: LandingFeedItem[] = [
  {
    id: "t1",
    title: "La canción de la brisa — conquista del Paso Norte",
    contentTypeLabel: "Crónica",
    isSticky: true,
    isLocked: false,
    isHot: true,
    authorName: "Kareth",
    categoryName: "Crónicas",
    updatedAt: new Date(Date.now() - 2 * 60000).toISOString(),
    createdAt: new Date(Date.now() - 2 * 60000).toISOString(),
  },
];

const cronicas: LandingCronica[] = [
  {
    id: "t2",
    title: "El ascenso bajo la luna de cuerno",
    excerpt: "Tres noches acampados al pie del Paso Norte…",
    authorName: "Kareth",
    tag: "Crónica · abierta",
  },
];

const eventos: LandingEvento[] = [
  {
    id: "e1",
    title: "Torneo del Martillo Dorado",
    excerpt: "Combates de plaza a tres rondas…",
    authorName: "Mariela",
    day: "14",
    month: "Jun",
    startsAt: "2026-06-14T18:00:00Z",
  },
];

const fichas: LandingFicha[] = [
  {
    id: "c1",
    name: "Kareth de los Vientos",
    avatarUrl: null,
    meta: "Pícara · Humana",
    tag: "Canon",
    tagKind: "success",
    ownerName: "Kareth",
    updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
];

const emptyData = {
  user: null,
  session: null,
  unreadCount: 0,
  profile: null,
  feed: [],
  cronicas: [],
  eventos: [],
  fichas: [],
  discordWidget: {
    online: null,
    members: [],
    invite: "https://discord.gg/xDJTmZAxPU",
  },
  onlineUsers: [],
};

describe("landing page (landing-community)", () => {
  it("renders the hero copy identical, with a video background and poster", () => {
    render(Page, { data: { ...emptyData, feed } });
    const title = screen.getByRole("heading", { level: 1 }) as HTMLElement;
    expect(title).toHaveTextContent("Una casa");
    expect(title).toHaveTextContent("escribas tu leyenda");
    expect(title.querySelector("em")).toBeInTheDocument();

    const video = screen.getByTestId("hero-video") as HTMLVideoElement;
    expect(video.tagName).toBe("VIDEO");
    expect(video.muted).toBe(true);
    expect(video.loop).toBe(true);
    expect(video.autoplay).toBe(true);
    expect(video).toHaveAttribute("playsinline");
    expect(video).toHaveAttribute("poster", "/hero-poster.jpg");
    const sources = video.querySelectorAll("source");
    expect(Array.from(sources).map((s) => s.getAttribute("src"))).toEqual([
      "/hero-loop.webm",
      "/hero-loop.mp4",
    ]);
    expect(Array.from(sources).map((s) => s.getAttribute("type"))).toEqual([
      "video/webm",
      "video/mp4",
    ]);
  });

  it("renders the hero CTAs linking to the forum and character creation", () => {
    render(Page, { data: { ...emptyData, feed } });
    expect(
      screen.getByRole("link", { name: "Explorar los foros" }),
    ).toHaveAttribute("href", "/foro");
    expect(
      screen.getByRole("link", { name: "Crear mi ficha" }),
    ).toHaveAttribute("href", "/personajes/nuevo");
  });

  it("renders the data-backed section headings in order", () => {
    render(Page, { data: { ...emptyData, feed } });
    const headlines = screen
      .getAllByRole("heading", { level: 2 })
      .map((h) => h.textContent);
    expect(headlines).toEqual([
      "Actividad reciente",
      "Crónicas en curso",
      "Eventos activos",
      "Fichas de personaje",
    ]);
  });

  it("renders feed rows linked to the thread", () => {
    render(Page, { data: { ...emptyData, feed } });
    expect(
      screen.getByRole("link", {
        name: "La canción de la brisa — conquista del Paso Norte",
      }),
    ).toHaveAttribute("href", "/foro/t1");
    expect(screen.getAllByText("Kareth").length).toBeGreaterThan(0);
    expect(screen.getByText("Crónica")).toBeInTheDocument();
  });

  it("renders section empty states when the DB has no rows", () => {
    render(Page, { data: emptyData });
    expect(screen.getByText("Sin actividad todavía")).toBeInTheDocument();
    expect(screen.getByText("Sin crónicas todavía")).toBeInTheDocument();
    expect(screen.getByText("Sin eventos activos todavía")).toBeInTheDocument();
    expect(screen.getByText("Sin fichas todavía")).toBeInTheDocument();
  });

  it("renders the Discord widget with live data (online list, capped, invite) (REQ-DW)", () => {
    render(Page, {
      data: {
        ...emptyData,
        discordWidget: {
          online: 42,
          members: ["Kareth", "Mariela"],
          invite: "https://discord.gg/liveInvite",
        },
      },
    });
    expect(screen.getByText("Rol Errante · Discord")).toBeInTheDocument();
    expect(screen.getByText("42 en línea")).toBeInTheDocument();
    const list = screen.getByTestId("discord-online-members");
    expect(list).toHaveTextContent("Kareth");
    expect(list).toHaveTextContent("Mariela");
    // no static member total in the widget anymore
    expect(screen.queryByText("312")).not.toBeInTheDocument();
    // online rows carry a presence dot
    expect(list.querySelectorAll(".ds-dot").length).toBe(2);
    const join = screen.getByRole("link", { name: "Unirse a Discord" });
    expect(join).toHaveAttribute("href", "https://discord.gg/liveInvite");
  });

  it("caps the online member list and shows the overflow count (REQ-DW)", () => {
    const many = Array.from({ length: 9 }, (_, i) => `User${i}`);
    render(Page, {
      data: {
        ...emptyData,
        discordWidget: {
          online: 9,
          members: many,
          invite: "https://discord.gg/liveInvite",
        },
      },
    });
    const list = screen.getByTestId("discord-online-members");
    expect(list.querySelectorAll("li").length).toBe(6);
    expect(screen.getByText("y 3 más en línea")).toBeInTheDocument();
  });

  it("renders the Discord fallback state when live data is empty (REQ-DW-01)", () => {
    render(Page, { data: emptyData });
    expect(screen.getByText("Rol Errante · Discord")).toBeInTheDocument();
    const join = screen.getByRole("link", { name: "Unirse a Discord" });
    expect(join).toHaveAttribute("href", "https://discord.gg/xDJTmZAxPU");
    expect(
      screen.getByText("Sin miembros conectados ahora"),
    ).toBeInTheDocument();
  });

  it("renders the Conectados list from onlineUsers with names and empty state (REQ-CP-04)", () => {
    render(Page, {
      data: {
        ...emptyData,
        onlineUsers: [
          { username: "kareth", displayName: "Kareth", avatarUrl: null },
          { username: "mariela", displayName: "Mariela", avatarUrl: null },
        ],
      },
    });
    const online = screen.getByLabelText(/Quién está conectado/);
    expect(online).toHaveTextContent("Kareth");
    expect(online).toHaveTextContent("Mariela");

    render(Page, { data: emptyData });
    expect(
      screen.getByText("Nadie conectado en este momento."),
    ).toBeInTheDocument();
  });

  it("does not start a heartbeat timer for a guest (REQ-CP-05)", () => {
    const ping = vi.fn().mockResolvedValue({ ok: true, status: 204 });
    vi.stubGlobal("fetch", ping);
    render(Page, { data: emptyData }); // user: null
    expect(ping).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("renders the data cards (crónicas, eventos, fichas) when present", () => {
    render(Page, { data: { ...emptyData, feed, cronicas, eventos, fichas } });
    expect(
      screen.getByRole("link", { name: /El ascenso bajo la luna/ }),
    ).toHaveAttribute("href", "/foro/t2");
    expect(
      screen.getByRole("link", { name: /Torneo del Martillo Dorado/ }),
    ).toHaveAttribute("href", "/eventos/e1");
    expect(
      screen.getByRole("link", { name: /Kareth de los Vientos/ }),
    ).toHaveAttribute("href", "/personajes/c1");
    expect(screen.getByText("Canon")).toBeInTheDocument();
    expect(screen.getByText("14")).toBeInTheDocument();
  });

  it("does not mount its own footer (global layout renders it once)", () => {
    render(Page, { data: emptyData });
    expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
  });
});

describe("landing load()", () => {
  type QResult<T> = { data: T | null; error: unknown };

  function makeSupabase(
    rows: Record<string, unknown[]>,
    errors: Record<string, unknown> = {},
  ) {
    const from = vi.fn((table: string) => {
      const chain: Record<string, unknown> = {};
      const methods = ["select", "in", "order", "limit", "eq", "not", "gt"];
      for (const m of methods) chain[m] = vi.fn(() => chain);
      chain.then = (res: (r: QResult<unknown[]>) => void) =>
        res(
          errors[table]
            ? { data: null, error: errors[table] }
            : { data: rows[table] ?? null, error: null },
        );
      return chain;
    });
    return { from, calls: from } as {
      from: ReturnType<typeof vi.fn>;
      calls: ReturnType<typeof vi.fn>;
    };
  }

  const runLoad = (supabase: unknown) =>
    (load as unknown as (...a: unknown[]) => Promise<unknown>)({
      locals: { supabase },
    });

  beforeEach(() => {
    // Load() now fetches the public Discord widget; stub it to a benign 200 so
    // these data-mapping tests never hit the network.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            presence_count: 0,
            instant_invite: null,
            members: [],
          }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function thread(over: Partial<Record<string, unknown>> = {}) {
    return {
      id: "t1",
      title: "Una historia",
      content_type: "historia",
      status: "abierto",
      is_locked: false,
      is_sticky: true,
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      body: "<p>Un cuerpo de texto.</p>",
      author: { username: "kareth", display_name: null },
      category: { name: "Crónicas" },
      ...over,
    };
  }

  it("returns empty arrays for every section when the DB has no rows", async () => {
    const supabase = makeSupabase({});
    const result = await runLoad(supabase);
    expect(result).toEqual({
      feed: [],
      cronicas: [],
      eventos: [],
      fichas: [],
      discordWidget: {
        online: 0,
        members: [],
        invite: "https://discord.gg/xDJTmZAxPU",
      },
      onlineUsers: [],
    });
  });

  it("maps threads/events/characters into the landing DTOs", async () => {
    const supabase = makeSupabase({
      threads: [thread()],
      events: [
        {
          id: "e1",
          title: "Torneo",
          description: "<p>Combates de plaza.</p>",
          starts_at: "2026-06-14T18:00:00Z",
          status: "publicado",
          creator: { username: "mariela", display_name: "Mariela" },
        },
      ],
      characters: [
        {
          id: "c1",
          name: "Kareth de los Vientos",
          avatar_url: null,
          status: "aprobado",
          updated_at: new Date().toISOString(),
          race: { name: "Humana", group_name: "Neutral" },
          owner: { username: "kareth", display_name: "Kareth" },
        },
      ],
    });
    const result = (await runLoad(supabase)) as {
      feed: LandingFeedItem[];
      cronicas: LandingCronica[];
      eventos: LandingEvento[];
      fichas: LandingFicha[];
    };

    expect(result.feed).toHaveLength(1);
    expect(result.feed[0]).toMatchObject({
      id: "t1",
      isSticky: true,
      isLocked: false,
      contentTypeLabel: "Crónica",
      authorName: "kareth",
      categoryName: "Crónicas",
    });

    expect(result.cronicas).toHaveLength(1);
    expect(result.cronicas[0]).toMatchObject({
      tag: "Crónica · abierta",
      excerpt: "Un cuerpo de texto.",
    });

    expect(result.eventos).toHaveLength(1);
    expect(result.eventos[0]).toMatchObject({
      day: "14",
      month: "Jun",
      title: "Torneo",
      authorName: "Mariela",
    });

    expect(result.fichas).toHaveLength(1);
    expect(result.fichas[0]).toMatchObject({
      tag: "Canon",
      tagKind: "success",
      meta: "Humana · Neutral",
      ownerName: "Kareth",
    });
  });

  it("degrades a failing section to its empty state without throwing", async () => {
    const supabase = makeSupabase(
      { threads: [thread()] },
      {
        events: { message: "db down" },
        characters: { message: "db down" },
      },
    );
    const result = (await runLoad(supabase)) as {
      feed: LandingFeedItem[];
      eventos: LandingEvento[];
      fichas: LandingFicha[];
    };
    expect(result.feed).toHaveLength(1);
    expect(result.eventos).toEqual([]);
    expect(result.fichas).toEqual([]);
  });
});

describe("landing load(): discord widget + online users (REQ-DW / REQ-CP-04)", () => {
  const DISCORD_URL =
    "https://discord.com/api/guilds/1284639402273931355/widget.json";
  const STATIC_INVITE = "https://discord.gg/xDJTmZAxPU";

  type QResult<T> = { data: T | null; error: unknown };

  function makeSupabase(
    rows: Record<string, unknown[]>,
    errors: Record<string, unknown> = {},
  ) {
    const from = vi.fn((table: string) => {
      const chain: Record<string, unknown> = {};
      const methods = ["select", "in", "order", "limit", "eq", "not", "gt"];
      for (const m of methods) chain[m] = vi.fn(() => chain);
      chain.then = (res: (r: QResult<unknown[]>) => void) =>
        res(
          errors[table]
            ? { data: null, error: errors[table] }
            : { data: rows[table] ?? null, error: null },
        );
      return chain;
    });
    return from;
  }

  const runLoad = (supabase: unknown) =>
    (load as unknown as (...a: unknown[]) => Promise<unknown>)({
      locals: { supabase },
    });

  function mockFetch(status: number, body: unknown) {
    const res = {
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(res));
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  type ActiveRow = {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };

  it("maps a 200 Discord widget into discordWidget {online, members, invite}", async () => {
    mockFetch(200, {
      presence_count: 7,
      instant_invite: "https://discord.gg/liveInvite",
      members: [
        {
          username: "Kareth",
          avatar_url: "https://cdn.discordapp.com/avatars/a1.png",
        },
        {
          username: "Mariela",
          avatar_url: "https://cdn.discordapp.com/avatars/a2.png",
        },
        { id: "bot-id", username: undefined },
      ],
    });
    expect(globalThis.fetch).toHaveBeenCalledTimes(0); // stub in place, not yet called
    const supabase = makeSupabase({});
    const result = (await runLoad(supabase)) as {
      discordWidget: {
        online: number | null;
        members: string[];
        invite: string;
      };
    };
    // fetch was called once with the widget URL and a browser-like UA header
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0];
    expect(url).toBe(DISCORD_URL);
    expect(
      (init as { headers: Record<string, string> }).headers["User-Agent"],
    ).toMatch(/RolErrante/);
    expect(result.discordWidget.online).toBe(7);
    // members are username-only; the avatar_url is discarded (REQ-DW-03)
    expect(result.discordWidget.members).toEqual(["Kareth", "Mariela"]);
    expect(result.discordWidget.invite).toBe("https://discord.gg/liveInvite");
    expect(JSON.stringify(result)).not.toContain("cdn.discordapp.com");
  });

  it("degrades discordWidget to null/empty + static invite when Discord returns 403", async () => {
    mockFetch(403, { message: "forbidden" });
    const supabase = makeSupabase({});
    const result = (await runLoad(supabase)) as {
      discordWidget: {
        online: number | null;
        members: string[];
        invite: string;
      };
    };
    expect(result.discordWidget).toEqual({
      online: null,
      members: [],
      invite: STATIC_INVITE,
    });
  });

  it("degrades discordWidget when the Discord fetch throws (no network)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ENOTFOUND")));
    const supabase = makeSupabase({});
    const result = (await runLoad(supabase)) as {
      discordWidget: {
        online: number | null;
        members: string[];
        invite: string;
      };
    };
    expect(result.discordWidget).toEqual({
      online: null,
      members: [],
      invite: STATIC_INVITE,
    });
  });

  it("maps active profiles into onlineUsers with public-safe columns (REQ-CP-04)", async () => {
    mockFetch(200, { presence_count: 0, instant_invite: null, members: [] });
    const active: ActiveRow[] = [
      {
        username: "kareth",
        display_name: "Kareth",
        avatar_url: "https://x.supabase.co/avatar1.png",
      },
      { username: "mariela", display_name: null, avatar_url: null },
    ];
    const supabase = { from: makeSupabase({ profiles: active }) };
    const result = (await runLoad(supabase)) as {
      onlineUsers: {
        username: string;
        displayName: string;
        avatarUrl: string | null;
      }[];
    };
    expect(result.onlineUsers).toEqual([
      {
        username: "kareth",
        displayName: "Kareth",
        avatarUrl: "https://x.supabase.co/avatar1.png",
      },
      { username: "mariela", displayName: "mariela", avatarUrl: null },
    ]);
  });

  it("returns an empty onlineUsers array when no profiles are active (REQ-CP-04)", async () => {
    mockFetch(200, { presence_count: 0, instant_invite: null, members: [] });
    const supabase = { from: makeSupabase({ profiles: [] }) };
    const result = (await runLoad(supabase)) as { onlineUsers: unknown[] };
    expect(result.onlineUsers).toEqual([]);
  });

  it("degrades onlineUsers to [] when the profiles query throws (REQ-CP-04)", async () => {
    mockFetch(200, { presence_count: 0, instant_invite: null, members: [] });
    const supabase = {
      from: makeSupabase({}, { profiles: { message: "db down" } }),
    };
    const result = (await runLoad(supabase)) as { onlineUsers: unknown[] };
    expect(result.onlineUsers).toEqual([]);
  });
});

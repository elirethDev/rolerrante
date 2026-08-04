import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
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
};

describe("landing page (landing-community)", () => {
  it("renders the hero copy identical, with a video background and poster", () => {
    render(Page, { data: { ...emptyData, feed } });
    const title = screen.getByRole("heading", { level: 1 });
    expect(title).toHaveTextContent("Construimos esta casa");
    expect(title).toHaveTextContent("escribas tu leyenda");
    expect(title.querySelector("em")).toBeInTheDocument();
    expect(
      screen.getByText(/comunidad de rol en World of Warcraft/),
    ).toBeInTheDocument();

    const video = screen.getByTestId("hero-video") as HTMLVideoElement;
    expect(video.tagName).toBe("VIDEO");
    expect(video.muted).toBe(true);
    expect(video.loop).toBe(true);
    expect(video.autoplay).toBe(true);
    expect(video).toHaveAttribute("playsinline");
    expect(video).toHaveAttribute("poster", "/hero-poster.jpg");
    const sources = video.querySelectorAll("source");
    expect(Array.from(sources).map((s) => s.getAttribute("src"))).toEqual([
      "/hero-loop.mp4",
      "/hero-loop.webm",
    ]);
    expect(Array.from(sources).map((s) => s.getAttribute("type"))).toEqual([
      "video/mp4",
      "video/webm",
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

  it("renders the Discord widget with the configured invite and demo stats", () => {
    render(Page, { data: emptyData });
    expect(screen.getByText("Rol Errante · Discord")).toBeInTheDocument();
    const join = screen.getByRole("link", { name: "Unirse a Discord" });
    expect(join).toHaveAttribute("href", "https://discord.gg/xDJTmZAxPU");
    expect(screen.getByTestId("discord-stats").textContent).toContain("312");
    expect(screen.getByTestId("discord-stats").textContent).toContain("128");
    expect(screen.getAllByText(/en línea/).length).toBeGreaterThan(0);
  });

  it("renders the Conectados demo widget listing placeholder users", () => {
    render(Page, { data: emptyData });
    const online = screen.getByLabelText(/Quién está conectado/);
    expect(online).toHaveTextContent("Kareth");
    expect(online).toHaveTextContent("Mariela");
    expect(online).toHaveTextContent("escribiendo");
    expect(online.textContent).toContain("en Crónicas");
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
      const methods = ["select", "in", "order", "limit", "eq", "not"];
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
    expect(result).toEqual({ feed: [], cronicas: [], eventos: [], fichas: [] });
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

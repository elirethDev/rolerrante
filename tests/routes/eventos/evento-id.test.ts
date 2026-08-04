import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Page from "../../../src/routes/eventos/[id]/+page.svelte";
import {
  readPageSource,
  expectNoInlineFieldsetMarkup,
} from "../../../src/test/page-vision";

const event = {
  id: "evt-1",
  title: "Mazmorra del Dragón",
  creator_id: "u1",
  status: "publicado",
  starts_at: "2026-02-01T19:00:00Z",
  ends_at: "2026-02-01T22:00:00Z",
  type: "aventura",
  location: "Online",
  description: "<p>Una mazmorra clásica.</p>",
  max_players: 5,
  participants: [],
};

const baseData = {
  event,
  profile: { id: "u1", role: "admin" },
  characters: [{ id: "c1", name: "Aria" }],
  participant: null,
  sessions: [],
};

const renderPage = () =>
  render(Page, {
    data: baseData as never,
    form: null as never,
  });

describe("eventos/[id] page (forms-visual-pass / S-2)", () => {
  it("uses the Field primitive — no inline fieldset/legend markup remains", () => {
    expectNoInlineFieldsetMarkup(
      readPageSource(
        "../../../src/routes/eventos/[id]/+page.svelte",
        import.meta.url,
      ),
    );
  });

  it("renders the join form XP field via Field with legend 'Inscribir personaje'", () => {
    renderPage();

    const legend = [...document.querySelectorAll("legend")].find((l) =>
      l.textContent?.includes("Inscribir personaje"),
    );
    expect(legend).toBeInTheDocument();

    const select = document.querySelector(
      'select#character_id[name="character_id"]',
    ) as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select).toHaveClass("select");
  });

  it("renders the finalize form XP field via Field with legend 'XP por participante confirmado'", () => {
    renderPage();

    const legend = [...document.querySelectorAll("legend")].find((l) =>
      l.textContent?.includes("XP por participante confirmado"),
    );
    expect(legend).toBeInTheDocument();

    const input = document.querySelector(
      'input#xp[name="xp"]',
    ) as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass("input");
    expect(input).toHaveClass("w-32");
  });
});

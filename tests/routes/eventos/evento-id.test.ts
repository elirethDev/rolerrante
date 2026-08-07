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

describe("eventos/[id] page (OD detail anatomy)", () => {
  it("uses OD .field markup — no inline fieldset/legend markup remains", () => {
    expectNoInlineFieldsetMarkup(
      readPageSource(
        "../../../src/routes/eventos/[id]/+page.svelte",
        import.meta.url,
      ),
    );
  });

  it("renders the join form with OD .field + select#character_id 'Inscribir personaje'", () => {
    renderPage();

    const select = document.querySelector(
      'select#character_id[name="character_id"]',
    ) as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select).toHaveClass("select");

    const label = [...document.querySelectorAll("label")].find((l) =>
      l.textContent?.includes("Inscribir personaje"),
    );
    expect(label).toBeInTheDocument();
    expect(label?.htmlFor).toBe("character_id");
  });

  it("renders the finalize form XP field via OD .field + input#xp", () => {
    renderPage();

    const input = document.querySelector(
      'input#xp[name="xp"]',
    ) as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass("input");

    const label = [...document.querySelectorAll("label")].find((l) =>
      l.textContent?.includes("XP por participante confirmado"),
    );
    expect(label).toBeInTheDocument();
    expect(label?.htmlFor).toBe("xp");
  });
});

import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Page from "../../../src/routes/personajes/+page.svelte";

const approved = [
  {
    id: "c1",
    name: "Aragorn",
    age: 87,
    status: "aprobado",
    race: { name: "Humanos" },
    player: { display_name: "Pablo", username: "pablo" },
  },
  {
    id: "c2",
    name: "Legolas",
    age: 2931,
    status: "aprobado",
    race: { name: "Altos Elfos" },
    player: { display_name: null, username: "elrond" },
  },
];

const races = [
  { id: "r1", name: "Humanos" },
  { id: "r2", name: "Altos Elfos" },
];

function renderCensus(
  overrides: Partial<{
    characters: typeof approved;
    ownCharacters: typeof approved;
    profile: { id: string; role: string } | null;
    query: string;
    race: string;
    races: typeof races;
  }> = {},
) {
  return render(Page, {
    data: {
      characters: approved,
      ownCharacters: [],
      races,
      query: "",
      race: "",
      profile: null,
      ...overrides,
    } as never,
  });
}

describe("personajes index page — public census", () => {
  it("renders the census title and a card per approved character linking to its ficha", () => {
    renderCensus();
    expect(
      screen.getByRole("heading", { name: /censo del reino/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Aragorn")).toBeInTheDocument();
    expect(screen.getByText("Legolas")).toBeInTheDocument();
    const card = screen.getByText("Aragorn").closest("a");
    expect(card).toHaveAttribute("href", "/personajes/c1");
    expect(screen.getByText(/Humanos · 87 años/i)).toBeInTheDocument();
  });

  it("shows a fallback owner name when the player has no display_name", () => {
    renderCensus();
    expect(screen.getByText(/elrond/i)).toBeInTheDocument();
  });

  it("renders the name search input and the race filter", () => {
    renderCensus();
    expect(screen.getByLabelText(/buscar personaje/i)).toBeInTheDocument();
    const raceSelect = screen.getByLabelText(/filtrar por raza/i);
    expect(raceSelect).toBeInTheDocument();
    expect(raceSelect.querySelectorAll("option").length).toBe(races.length + 1);
  });

  it("does not show own-management tools to a guest", () => {
    renderCensus();
    expect(screen.queryByText("Mis fichas")).toBeNull();
    expect(screen.queryByText("Nueva ficha")).toBeNull();
  });

  it("shows the new-ficha action and own characters to a logged-in player", () => {
    renderCensus({
      profile: { id: "me", role: "rolero" },
      ownCharacters: [
        {
          id: "mine",
          name: "Borrador mío",
          age: 25,
          status: "borrador",
          race: { name: "Gnomos" },
          player: { display_name: "Pablo", username: "pablo" },
        },
      ],
    });
    expect(screen.getByText("Nueva ficha")).toHaveAttribute(
      "href",
      "/personajes/nuevo",
    );
    expect(screen.getByText("Borrador mío")).toBeInTheDocument();
  });
});

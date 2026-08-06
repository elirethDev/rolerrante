import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/svelte";
import ErrorPage from "../../src/routes/+error.svelte";
import { page } from "../../src/test/app-state";

describe("+error.svelte CTAs (OD error.html two actions)", () => {
  beforeEach(() => {
    page.status = 404;
    page.error = null;
  });

  it("renders both CTAs: home and /foro", () => {
    render(ErrorPage, {});
    const home = screen.getByRole("link", { name: "Volver al inicio" });
    expect(home).toBeInTheDocument();
    expect(home).toHaveAttribute("href", "/");
    const foro = screen.getByRole("link", { name: "Ir a los foros" });
    expect(foro).toBeInTheDocument();
    expect(foro).toHaveAttribute("href", "/foro");
  });
});
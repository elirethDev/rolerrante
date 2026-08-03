import { describe, expect, it } from "vitest";
import { validateImageUrl } from "./auth";

describe("validateImageUrl (REQ-CAV-01.2 / 01.3)", () => {
  it("accepts an https: avatar URL", () => {
    expect(validateImageUrl("https://img.example.com/char.png")).toEqual({ valid: true });
  });

  it("accepts an http: avatar URL", () => {
    expect(validateImageUrl("http://img.example.com/char.png")).toEqual({ valid: true });
  });

  it("accepts null (avatar cleared)", () => {
    expect(validateImageUrl(null)).toEqual({ valid: true });
  });

  it("accepts an empty string (avatar cleared)", () => {
    expect(validateImageUrl("")).toEqual({ valid: true });
  });

  it("rejects a javascript: protocol URL", () => {
    expect(validateImageUrl("javascript:alert(1)")).toEqual({
      valid: false,
      rejected: "javascript:alert(1)",
    });
  });

  it("rejects a data: protocol URL", () => {
    expect(validateImageUrl("data:text/html,<script>alert(1)</script>")).toEqual({
      valid: false,
      rejected: "data:text/html,<script>alert(1)</script>",
    });
  });

  it("rejects a file: protocol URL", () => {
    expect(validateImageUrl("file:///etc/passwd")).toEqual({
      valid: false,
      rejected: "file:///etc/passwd",
    });
  });

  it("rejects an unknown/scheme-less URL", () => {
    expect(validateImageUrl("ftp://example.com/img.png")).toEqual({
      valid: false,
      rejected: "ftp://example.com/img.png",
    });
  });
});

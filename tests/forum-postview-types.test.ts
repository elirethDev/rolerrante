import { describe, expect, it } from "vitest";
import type { PostView } from "../src/lib/forum";

// RED test (REQ-REACT-01.2): PostView must carry like_count + viewer_has_liked.
// Compile-time guarantee: the typed fixture below fails `npm run check` until the
// fields exist on PostView (excess-property / missing-property error). Runtime
// assertions verify the values flow through the type.
describe("PostView reaction fields", () => {
  it("types like_count as number|null and viewer_has_liked as boolean|null", () => {
    const liked: PostView = {
      id: "p1",
      post_number: 1,
      body: {},
      author_id: "u1",
      created_at: "2026-08-02T00:00:00Z",
      edited_at: null,
      edited_by: null,
      like_count: 3,
      viewer_has_liked: true,
    };
    expect(liked.like_count).toBe(3);
    expect(liked.viewer_has_liked).toBe(true);

    // Guest view: no identity -> no like state (null), count still numeric.
    const guest: PostView = {
      ...liked,
      like_count: 2,
      viewer_has_liked: null,
    };
    expect(guest.like_count).toBe(2);
    expect(guest.viewer_has_liked).toBeNull();
  });
});

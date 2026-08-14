import { describe, expect, it } from "vitest";
import { isSectionActive } from "./Sidebar";

/**
 * The sidebar used to compare paths for equality, so opening any item inside a
 * section (`/architecture/cache-system`) dropped the section's highlight and the
 * reader lost track of where they were.
 */
describe("isSectionActive", () => {
  it("keeps the section lit on its detail routes", () => {
    expect(isSectionActive("/architecture", "/architecture")).toBe(true);
    expect(isSectionActive("/architecture/cache-system", "/architecture")).toBe(true);
    expect(isSectionActive("/blog/first-post", "/blog")).toBe(true);
    expect(isSectionActive("/apis/goal-controller", "/apis")).toBe(true);
    expect(isSectionActive("/projects/beyou", "/projects")).toBe(true);
  });

  it("does not light a section from a path that merely shares its prefix", () => {
    expect(isSectionActive("/architecture-notes", "/architecture")).toBe(false);
    expect(isSectionActive("/blogging", "/blog")).toBe(false);
  });

  it("keeps home exact, since every path starts with a slash", () => {
    expect(isSectionActive("/", "/")).toBe(true);
    expect(isSectionActive("/architecture", "/")).toBe(false);
    expect(isSectionActive("/blog/first-post", "/")).toBe(false);
  });

  it("lights only the section the reader is in", () => {
    expect(isSectionActive("/architecture/cache-system", "/blog")).toBe(false);
    expect(isSectionActive("/settings", "/search")).toBe(false);
  });
});

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

/*
 * The dark theme lives in index.css twice on purpose: once as `.dark` (an
 * explicit pin) and once inside `@media (prefers-color-scheme: dark)` as
 * `:root:not(.light)` (so "system" needs no JS class). They are hand-synced,
 * which is exactly the kind of duplicate that drifts. This test parses both
 * blocks and compares var names AND values, so an edit to one copy without the
 * other fails loudly.
 */

const css = readFileSync(resolve(process.cwd(), "src/index.css"), "utf8");

/** Slice out the body of the first `selector {` block. Neither dark block
 *  nests further braces, so the first `}` after the `{` closes it. */
function extractBlock(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`selector not found in index.css: ${selector}`);
  const open = css.indexOf("{", start);
  const close = css.indexOf("}", open);
  return css.slice(open + 1, close);
}

/** Collect `--name: value;` declarations, values whitespace-trimmed. */
function parseCssVars(block: string): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const match of block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    vars[match[1]] = match[2].trim();
  }
  return vars;
}

describe("index.css dark block parity", () => {
  it("`.dark` and the media-guarded `:root:not(.light)` define the same vars with the same values", () => {
    const explicitDark = parseCssVars(extractBlock(".dark"));
    const mediaDark = parseCssVars(extractBlock(":root:not(.light)"));

    // Sanity: the parser actually found the blocks.
    expect(Object.keys(explicitDark).length).toBeGreaterThan(20);

    // toEqual compares both directions: same names, same values, no extras.
    expect(mediaDark).toEqual(explicitDark);
  });
});

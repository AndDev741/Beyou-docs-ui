import { describe, it, expect } from "vitest";
import { buildLocaleRedirects, MAX_STATIC_REDIRECTS } from "../seo/localeRedirects";

function rules(file: string): string[] {
  return file.split("\n").filter((line) => line && !line.startsWith("#"));
}

describe("buildLocaleRedirects", () => {
  it("sends each bare page URL to its default-locale page", () => {
    const file = buildLocaleRedirects(["/en/blog", "/en/blog/n+1-problem-solved", "/en/architecture"]);

    expect(rules(file)).toEqual([
      "/architecture /en/architecture 302",
      "/blog /en/blog 302",
      "/blog/n+1-problem-solved /en/blog/n+1-problem-solved 302",
    ]);
  });

  it("writes no rule for the bare root, which is its own page", () => {
    // `/en` is the home page. Its bare form is `/`, and `/` is the language
    // picker that index.html serves; a rule there would take the picker away.
    expect(rules(buildLocaleRedirects(["/en", "/en/blog"]))).toEqual(["/blog /en/blog 302"]);
  });

  it("leaves other locales alone", () => {
    expect(rules(buildLocaleRedirects(["/pt/blog", "/en/blog"]))).toEqual(["/blog /en/blog 302"]);
  });

  it("does not treat a path that only starts with the locale letters as localized", () => {
    // `/enterprise` is not under `/en/`.
    expect(rules(buildLocaleRedirects(["/enterprise/x", "/en/blog"]))).toEqual(["/blog /en/blog 302"]);
  });

  it("writes each rule once when a page is written twice", () => {
    expect(rules(buildLocaleRedirects(["/en/blog", "/en/blog"]))).toEqual(["/blog /en/blog 302"]);
  });

  it("skips a path whose characters Cloudflare would read as a pattern", () => {
    const file = buildLocaleRedirects(["/en/blog/a*b", "/en/blog/c:d", "/en/blog/ok"]);

    expect(rules(file)).toEqual(["/blog/ok /en/blog/ok 302"]);
  });

  it("fails the build rather than ship more rules than Cloudflare reads", () => {
    const paths = Array.from({ length: MAX_STATIC_REDIRECTS + 1 }, (_, i) => `/en/blog/post-${i}`);

    expect(() => buildLocaleRedirects(paths)).toThrow(/exceed/);
  });
});

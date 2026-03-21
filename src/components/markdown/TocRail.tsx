import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

/* ── types ────────────────────────────────────────────────── */

export interface TocEntry {
  level: number;
  text: string;
  id: string;
}

/* ── helpers ──────────────────────────────────────────────── */

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export function extractToc(markdown: string): TocEntry[] {
  const entries: TocEntry[] = [];
  for (const line of markdown.split("\n")) {
    const match = /^(#{1,3})\s+(.+)$/.exec(line.trim());
    if (match) {
      entries.push({
        level: match[1].length,
        text: match[2],
        id: slugify(match[2]),
      });
    }
  }
  return entries;
}

/* ── line widths per heading level ────────────────────────── */

const LINE_W: Record<number, string> = {
  1: "w-5",
  2: "w-3.5",
  3: "w-2",
};

/* ── component ───────────────────────────────────────────── */

export function TocRail({
  toc,
  scrollRoot,
  onNavigate,
}: {
  toc: TocEntry[];
  scrollRoot: React.RefObject<HTMLDivElement>;
  onNavigate: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const show = useCallback(() => setHovered(true), []);
  const hide = useCallback(() => setHovered(false), []);

  useEffect(() => {
    if (!toc.length || !scrollRoot.current) return;

    const root = scrollRoot.current;
    const headingIds = toc.map((e) => e.id);
    let lastId = "";
    let rafId = 0;

    const computeActive = () => {
      const scrollTop = root.scrollTop;
      const offset = root.clientHeight * 0.15;
      let current = headingIds[0];

      for (const id of headingIds) {
        const el = root.querySelector(`#${CSS.escape(id)}`);
        if (!el) continue;
        const top = (el as HTMLElement).offsetTop - root.offsetTop;
        if (top <= scrollTop + offset) {
          current = id;
        } else {
          break;
        }
      }

      if (current && current !== lastId) {
        lastId = current;
        setActiveHeadingId(current);
      }
    };

    const handleScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(computeActive);
    };

    const timeout = setTimeout(() => {
      computeActive();
      root.addEventListener("scroll", handleScroll, { passive: true });
    }, 300);

    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(rafId);
      root.removeEventListener("scroll", handleScroll);
    };
  }, [toc, scrollRoot]);

  return (
    <div
      ref={containerRef}
      onMouseEnter={show}
      onMouseLeave={hide}
      className="fixed right-0 top-1/2 -translate-y-1/2 z-30 hidden md:flex items-center"
    >
      {/* expanded popover (on hover) */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="mr-1 max-h-[70vh] overflow-y-auto rounded-xl border border-glass-border/30 bg-background/90 backdrop-blur-xl shadow-xl py-2 px-1"
            style={{ minWidth: 200, maxWidth: 300 }}
          >
            {toc.map((entry) => {
              const isActive = activeHeadingId === entry.id;
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => onNavigate(entry.id)}
                  className={cn(
                    "flex items-center gap-2 w-full text-left rounded-lg px-3 py-1.5 text-[13px] leading-snug transition-colors duration-100",
                    entry.level === 2 && "pl-6",
                    entry.level === 3 && "pl-9",
                    isActive
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5",
                  )}
                >
                  <span
                    className={cn(
                      "w-0.5 self-stretch rounded-full shrink-0 transition-colors",
                      isActive ? "bg-primary" : "bg-transparent",
                    )}
                  />
                  <span className={cn(
                    "line-clamp-2",
                    entry.level === 1 && "font-medium",
                    entry.level === 3 && "text-xs",
                  )}>
                    {entry.text}
                  </span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* line rail (always visible) */}
      <div className="flex flex-col items-end gap-[5px] py-2 px-2.5 cursor-pointer">
        {toc.map((entry) => {
          const isActive = activeHeadingId === entry.id;
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => onNavigate(entry.id)}
              className={cn(
                "h-[3px] rounded-full transition-all duration-200",
                LINE_W[entry.level] ?? "w-2",
                isActive
                  ? "bg-primary"
                  : "bg-muted-foreground/30 hover:bg-muted-foreground/60",
              )}
            />
          );
        })}
      </div>
    </div>
  );
}

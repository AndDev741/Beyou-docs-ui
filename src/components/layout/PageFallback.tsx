/**
 * Shown while a route chunk downloads.
 *
 * Deliberately no spinner and no text: route chunks resolve in a few frames on
 * a warm cache, and anything that appears then immediately disappears reads as a
 * flicker. It paints the page background so the swap is invisible rather than a
 * flash of white, and reserves the viewport height so the layout does not jump
 * when the real page arrives.
 */
export function PageFallback() {
  return (
    <div
      className="min-h-screen w-full animated-gradient particles-bg"
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading</span>
    </div>
  );
}

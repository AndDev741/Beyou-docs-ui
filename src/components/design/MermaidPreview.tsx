import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

let mermaidInitialized = false;

const mermaidConfig = {
  startOnLoad: false,
  theme: "dark",
  themeVariables: {
    primaryColor: "#a855f7",
    primaryTextColor: "#fff",
    primaryBorderColor: "#9333ea",
    lineColor: "#ec4899",
    secondaryColor: "#1e1b4b",
    tertiaryColor: "#0f0a1e",
    background: "#0a0812",
    mainBkg: "#1a1625",
    secondBkg: "#2d2640",
    nodeBorder: "#9333ea",
    clusterBkg: "#1e1b4b",
    clusterBorder: "#7c3aed",
    titleColor: "#f0abfc",
    edgeLabelBackground: "#1a1625",
    nodeTextColor: "#f5f5f5",
  },
  flowchart: {
    curve: "basis",
    padding: 20,
  },
  sequence: {
    actorMargin: 50,
    boxMargin: 10,
    boxTextMargin: 5,
  },
};

interface MermaidPreviewProps {
  code: string;
  className?: string;
  interactive?: boolean;
  showControls?: boolean;
}

export function MermaidPreview({
  code,
  className,
  interactive = false,
  showControls = false,
}: MermaidPreviewProps) {
  const [svg, setSvg] = useState<string>("");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const panStartRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!mermaidInitialized) {
      mermaid.initialize(mermaidConfig);
      mermaidInitialized = true;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!code.trim()) {
      setSvg("");
      return;
    }

    mermaid
      .parse(code)
      .then(() => mermaid.render(`mermaid-${Math.random().toString(36).slice(2)}`, code))
      .then((result) => {
        if (cancelled) return;
        setSvg(result.svg);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Mermaid render error:", err);
        setSvg("");
      });

    return () => {
      cancelled = true;
    };
  }, [code]);

  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setIsPanning(false);
  }, [code, interactive]);

  if (!svg) {
    return null;
  }

  const content = (
    <div
      className={cn("rounded-lg border border-border/50 bg-muted/10 p-4 overflow-auto", className)}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );

  if (!interactive) {
    return content;
  }

  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

  const handleWheel: React.WheelEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;
    const delta = event.deltaY < 0 ? 1.12 : 0.9;
    const nextZoom = clamp(zoom * delta, 0.35, 3.5);
    const scaleChange = nextZoom / zoom;
    setZoom(nextZoom);
    setPan((prev) => ({
      x: pointerX - scaleChange * (pointerX - prev.x),
      y: pointerY - scaleChange * (pointerY - prev.y),
    }));
  };

  const handlePointerDown: React.PointerEventHandler<HTMLDivElement> = (event) => {
    if (event.button !== 0) return;
    setIsPanning(true);
    panStartRef.current = { x: event.clientX - pan.x, y: event.clientY - pan.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove: React.PointerEventHandler<HTMLDivElement> = (event) => {
    if (!isPanning) return;
    setPan({
      x: event.clientX - panStartRef.current.x,
      y: event.clientY - panStartRef.current.y,
    });
  };

  const handlePointerUp: React.PointerEventHandler<HTMLDivElement> = (event) => {
    setIsPanning(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <div className={cn("relative rounded-lg border border-border/50 bg-muted/10", className)}>
      <div
        ref={containerRef}
        className="relative h-full w-full overflow-hidden touch-none select-none"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{ cursor: isPanning ? "grabbing" : "grab" }}
      >
        <div
          className="p-4"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
          }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
      {showControls && (
        <div className="absolute right-3 top-3 flex items-center gap-2">
          <Button
            size="icon"
            variant="outline"
            onClick={() => setZoom((value) => clamp(value * 1.12, 0.35, 3.5))}
          >
            +
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={() => setZoom((value) => clamp(value * 0.9, 0.35, 3.5))}
          >
            −
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
          >
            Reset
          </Button>
        </div>
      )}
    </div>
  );
}

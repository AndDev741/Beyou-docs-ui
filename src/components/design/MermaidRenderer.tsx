import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

mermaid.initialize({
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
});

interface MermaidRendererProps {
  chart: string;
  className?: string;
}

export function MermaidRenderer({ chart, className = "" }: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");

  useEffect(() => {
    const renderChart = async () => {
      if (!chart.trim()) {
        setSvg("");
        return;
      }

      try {
        await mermaid.parse(chart);
        const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
        const { svg: renderedSvg } = await mermaid.render(id, chart);
        setSvg(renderedSvg);
      } catch (err) {
        console.error("Mermaid render error:", err);
        setSvg("");
      }
    };

    renderChart();
  }, [chart]);

  if (!svg) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={`mermaid-container overflow-auto ${className}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

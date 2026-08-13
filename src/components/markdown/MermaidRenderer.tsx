import { useEffect, useState, type CSSProperties } from "react";
import mermaid from "mermaid";
import { useTheme } from "@/context/ThemeContext";
import { buildMermaidConfig, resolveMermaidTextColors } from "@/lib/mermaidTheme";

interface MermaidRendererProps {
  chart: string;
  className?: string;
}

export function MermaidRenderer({ chart, className = "" }: MermaidRendererProps) {
  const { resolvedBase } = useTheme();
  const [svg, setSvg] = useState<string>("");
  const { textOnBackground, textOnPrimary, edgeLabelBackground } =
    resolveMermaidTextColors(resolvedBase);

  useEffect(() => {
    mermaid.initialize(buildMermaidConfig(resolvedBase));
  }, [resolvedBase]);

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
  }, [chart, resolvedBase]);

  if (!svg) {
    return null;
  }

  return (
    <div
      className={`mermaid-container overflow-auto ${className}`}
      style={
        {
          "--mermaid-text": textOnBackground,
          "--mermaid-node-text": textOnPrimary,
          "--mermaid-edge-label-bg": edgeLabelBackground,
          color: textOnBackground,
        } as CSSProperties
      }
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

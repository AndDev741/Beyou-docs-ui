import { useState } from "react";
import { Maximize2 } from "lucide-react";
import { MermaidRenderer } from "./MermaidRenderer";
import { MermaidPreview } from "./MermaidPreview";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface MermaidBlockProps {
  code: string;
  className?: string;
}

export function MermaidBlock({ code, className }: MermaidBlockProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="relative">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setOpen(true)}
          className="absolute right-2 top-2 z-10 h-8 w-8 bg-background/70 border border-border/50"
        >
          <Maximize2 className="w-4 h-4" />
        </Button>
        <MermaidRenderer chart={code} className={className ?? "max-w-full"} />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[96vw] w-[96vw] h-[92vh] p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-border/50">
            <DialogTitle>Mermaid diagram</DialogTitle>
            <DialogDescription>Drag to pan. Scroll to zoom.</DialogDescription>
          </DialogHeader>
          <div className="p-6 h-[calc(92vh-96px)] overflow-hidden">
            <MermaidPreview code={code} className="h-full min-h-0" interactive showControls />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

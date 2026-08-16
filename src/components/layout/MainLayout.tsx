import { ReactNode, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen flex w-full animated-gradient particles-bg">
      <div className="hidden md:flex">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onOpenSidebar={() => setMobileNavOpen(true)} />
        {/* No overflow-auto here: the document is the scroller. An overflow
            value on <main> makes it the containing scrollport for any sticky
            descendant, and since <main> grows with its content and never
            actually scrolls, those elements would stick to a box that itself
            scrolls away. */}
        <main className="flex-1">
          {children}
        </main>
      </div>

      <AnimatePresence>
        {mobileNavOpen && (
          <motion.div
            className="fixed inset-0 z-50 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              aria-label="Close menu"
              className="absolute inset-0 bg-black/40"
              onClick={() => setMobileNavOpen(false)}
            />
            <Sidebar variant="mobile" onClose={() => setMobileNavOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

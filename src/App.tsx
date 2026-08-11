import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/context/ThemeContext";
import { LocaleLayout } from "@/components/routing/LocaleLayout";
import { LocaleRedirect } from "@/components/routing/LocaleRedirect";
import { PageFallback } from "@/components/layout/PageFallback";

// Route-level splitting. The heavy renderers live behind these boundaries --
// mermaid (which drags in cytoscape and katex) and react-syntax-highlighter
// together dwarf the rest of the app, and the landing page needs neither.
// Eagerly bundling them pushed the first paint of every page behind a download
// most visitors never use.
const Index = lazy(() => import("./pages/Index"));
const GettingStarted = lazy(() => import("./pages/GettingStarted"));
const Architecture = lazy(() => import("./pages/Architecture"));
const Blog = lazy(() => import("./pages/Blog"));
const APIs = lazy(() => import("./pages/APIs"));
const Projects = lazy(() => import("./pages/Projects"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                {/* Detail pages are real paths, not query params: `/blog/:postKey`
                    rather than `/blog?post=`. A query string reads as a variant of
                    the listing page, so no individual post could ever rank on its
                    own. The listing and the detail share a component -- the
                    presence of the param is what switches the view. */}
                <Route path="/:lang" element={<LocaleLayout />}>
                  <Route index element={<Index />} />
                  <Route path="getting-started" element={<GettingStarted />} />
                  <Route path="architecture" element={<Architecture />} />
                  <Route path="architecture/:topicKey" element={<Architecture />} />
                  <Route path="blog" element={<Blog />} />
                  <Route path="blog/:postKey" element={<Blog />} />
                  <Route path="apis" element={<APIs />} />
                  <Route path="apis/:controllerKey" element={<APIs />} />
                  <Route path="projects" element={<Projects />} />
                  <Route path="projects/:projectKey" element={<Projects />} />
                  <Route path="search" element={<SearchPage />} />
                  <Route path="settings" element={<Settings />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Route>

                {/* `/` and anything else without a locale segment. Never renders
                    a page -- it only works out which locale to send you to. */}
                <Route path="*" element={<LocaleRedirect />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;

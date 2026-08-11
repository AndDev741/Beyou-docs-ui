// Self-hosted rather than loaded from fonts.googleapis.com.
//
// The three <link rel="stylesheet"> tags this replaces were render-blocking on
// a third-party origin: the browser had to resolve DNS, open a TLS connection
// and download a stylesheet before it could paint a single character, and then
// do it again on fonts.gstatic.com for the files themselves. Bundling them
// removes two connection setups from the critical path and keeps visitor IPs
// from being handed to Google on every page view.
//
// Variable fonts, so one file covers every weight the design uses instead of
// four static cuts per family.
import "@fontsource-variable/inter";
import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource-variable/plus-jakarta-sans/wght-italic.css";
import "@fontsource-variable/jetbrains-mono";

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./translations/i18n";

createRoot(document.getElementById("root")!).render(<App />);

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { getSurface } from "./lib/electron";

// Electron's own OS-level window transparency only shows through where the
// page itself is transparent — the browser demo's opaque paper background
// would otherwise fill every Electron surface window edge-to-edge.
if (getSurface()) document.documentElement.classList.add("electron-surface");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import AdminApp from "./admin/AdminApp";
import "maplibre-gl/dist/maplibre-gl.css";
import "./styles.css";

// One extra page doesn't earn a routing library - a plain pathname check
// picks between the public map and the moderation dashboard. Both the Vite
// dev server and a standard SPA-fallback static host serve index.html for
// /admin, so this is the only routing needed (see README's deploy note).
const isAdmin = window.location.pathname.startsWith("/admin");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>{isAdmin ? <AdminApp /> : <App />}</React.StrictMode>
);

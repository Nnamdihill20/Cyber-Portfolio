import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import AdminApp from "./admin/AdminApp";
import NotFound from "./NotFound";
import PrivacyPolicy from "./legal/PrivacyPolicy";
import Terms from "./legal/Terms";
import "maplibre-gl/dist/maplibre-gl.css";
import "./styles.css";

// A handful of routes doesn't earn a routing library - a plain pathname
// check picks the right page. Both the Vite dev server and a standard
// SPA-fallback static host serve index.html for all of these (see
// README's deploy note), so this is the only routing needed.
function pickPage() {
  // Tolerate a trailing slash (/admin/ as well as /admin) without treating
  // every sub-path as a distinct route - this app has no nested routes.
  const path = window.location.pathname.replace(/\/$/, "") || "/";
  switch (path) {
    case "/":
      return <App />;
    case "/admin":
      return <AdminApp />;
    case "/privacy":
      return <PrivacyPolicy />;
    case "/terms":
      return <Terms />;
    default:
      return <NotFound />;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>{pickPage()}</React.StrictMode>
);

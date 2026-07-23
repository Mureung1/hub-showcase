import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import App from "./App";
import ComparisonApp from "./ComparisonApp";
import BackgroundEditorApp from "./BackgroundEditorApp";

const currentPath = window.location.pathname.replace(/\/+$/, "");
const RootApp = currentPath.endsWith("/compare") ? ComparisonApp : currentPath.endsWith("/background-editor") ? BackgroundEditorApp : App;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <RootApp />
  </StrictMode>,
);

import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ProjectionMode } from "./components/ProjectionMode";
import { SpriteSheetReviewTool } from "./components/SpriteSheetReviewTool";
import "./styles.css";

const searchParams = new URLSearchParams(window.location.search);
const RootComponent =
  searchParams.get("projection") === "pepper"
    ? ProjectionMode
    : searchParams.get("review") === "sprites"
      ? SpriteSheetReviewTool
      : App;

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RootComponent />
  </React.StrictMode>,
);

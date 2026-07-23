import cors from "cors";
import express from "express";
import { createMusicRecordsRouter } from "./routes/musicRecords.js";
import { createSpotifyRouter } from "./routes/spotifyRoutes.js";

export function createApp(options = {}) {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/health", (_request, response) => {
    response.status(200).json({ status: "ok" });
  });

  app.use(
    "/api/music-records",
    createMusicRecordsRouter({
      getSupabase: options.getSupabase,
      getAuthenticatedSupabase: options.getAuthenticatedSupabase,
      getCurrentDate: options.getCurrentDate,
    }),
  );
  app.use("/api/spotify", createSpotifyRouter(options.searchSpotifyTracks));

  return app;
}

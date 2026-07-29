import cors from "cors";
import express from "express";
import { createFeedRouter } from "./routes/feed.js";
import { createFollowsRouter } from "./routes/follows.js";
import { createMusicRecordsRouter } from "./routes/musicRecords.js";
import { createRecapsRouter } from "./routes/recaps.js";
import { createSpotifyRouter } from "./routes/spotifyRoutes.js";
import { createUsersRouter } from "./routes/users.js";

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
  app.use("/api/spotify", createSpotifyRouter({
    searchSpotifyTracks: options.searchSpotifyTracks,
    getSupabase: options.getSupabase,
    getAdminSupabase: options.getAdminSupabase,
    getAuthenticatedSupabase: options.getAuthenticatedSupabase,
    getSpotifyUserAccessToken: options.getSpotifyUserAccessToken,
    exportMonthlyRecapPlaylist: options.exportMonthlyRecapPlaylist,
    fetchImpl: options.spotifyFetch,
    now: options.getSpotifyNow?.(),
    randomBytesFn: options.spotifyRandomBytes,
    env: options.env,
  }));
  app.use(
    "/api/feed",
    createFeedRouter({
      getSupabase: options.getSupabase,
      getAuthenticatedSupabase: options.getAuthenticatedSupabase,
    }),
  );
  app.use(
    "/api/follows",
    createFollowsRouter({
      getSupabase: options.getSupabase,
      getAuthenticatedSupabase: options.getAuthenticatedSupabase,
    }),
  );
  app.use(
    "/api/users",
    createUsersRouter({
      getSupabase: options.getSupabase,
      getAuthenticatedSupabase: options.getAuthenticatedSupabase,
      getCurrentDate: options.getCurrentDate,
    }),
  );
  app.use(
    "/api/recaps",
    createRecapsRouter({
      getSupabase: options.getSupabase,
      getAuthenticatedSupabase: options.getAuthenticatedSupabase,
    }),
  );

  return app;
}

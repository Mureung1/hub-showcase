import { Router } from "express";
import { createSpotifyController } from "../controllers/spotifyController.js";
import { createSpotifyOAuthController } from "../controllers/spotifyOAuthController.js";
import { createRequireAuth } from "../middleware/requireAuth.js";

export function createSpotifyRouter(options = {}) {
  const router = Router();
  const normalizedOptions = typeof options === "function"
    ? { searchSpotifyTracks: options }
    : options;
  const spotifyController = createSpotifyController(normalizedOptions.searchSpotifyTracks);
  const oauthController = createSpotifyOAuthController(normalizedOptions);
  const requireAuth = createRequireAuth(normalizedOptions.getSupabase);

  router.get("/tracks/search", spotifyController.search);
  router.get("/search", spotifyController.search);
  router.get("/callback", oauthController.callback);
  router.get("/connect", requireAuth, oauthController.connect);
  router.get("/connection", requireAuth, oauthController.connection);
  router.delete("/connection", requireAuth, oauthController.disconnect);

  return router;
}

import { Router } from "express";
import { createSpotifyController } from "../controllers/spotifyController.js";

export function createSpotifyRouter(searchSpotifyTracks) {
  const router = Router();
  const spotifyController = createSpotifyController(searchSpotifyTracks);

  router.get("/tracks/search", spotifyController.search);
  router.get("/search", spotifyController.search);

  return router;
}

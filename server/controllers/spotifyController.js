import { searchSpotifyTracks } from "../services/spotifyService.js";
import { validateSearchQuery } from "./validateSearchQuery.js";

const SEARCH_ERROR_MESSAGE = "음악 검색 중 오류가 발생했습니다.";

export function createSpotifyController(searchTracks = searchSpotifyTracks) {
  return {
    async search(request, response) {
      const validation = validateSearchQuery(request.query.q);

      if (validation.errorMessage) {
        return response.status(400).json({ message: validation.errorMessage });
      }

      try {
        const data = await searchTracks(validation.query);
        return response.status(200).json(data);
      } catch (error) {
        console.error("Failed to search Spotify tracks:", error);
        return response.status(500).json({ message: SEARCH_ERROR_MESSAGE });
      }
    },
  };
}

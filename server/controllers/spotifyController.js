import { searchSpotifyTracks } from "../services/spotifyService.js";

const REQUIRED_QUERY_MESSAGE = "검색어를 입력해주세요.";
const MIN_LENGTH_QUERY_MESSAGE = "검색어는 2글자 이상 입력해주세요.";
const SEARCH_ERROR_MESSAGE = "음악 검색 중 오류가 발생했습니다.";

function getValidatedQuery(rawQuery) {
  if (typeof rawQuery !== "string" || rawQuery.trim().length === 0) {
    return { errorMessage: REQUIRED_QUERY_MESSAGE };
  }

  const query = rawQuery.trim();

  if (query.length < 2) {
    return { errorMessage: MIN_LENGTH_QUERY_MESSAGE };
  }

  return { query };
}

export function createSpotifyController(searchTracks = searchSpotifyTracks) {
  return {
    async search(request, response) {
      const validation = getValidatedQuery(request.query.q);

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

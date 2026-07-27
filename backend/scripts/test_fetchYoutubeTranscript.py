import unittest
from types import SimpleNamespace

from fetchYoutubeTranscript import fetch_transcript


class FakeYoutubeTranscriptApi:
    def __init__(self):
        self.video_ids = []

    def fetch(self, video_id):
        self.video_ids.append(video_id)

        return [
            SimpleNamespace(text="김치 200g"),
            SimpleNamespace(text="10분간 끓인다."),
        ]


class FetchYoutubeTranscriptTest(unittest.TestCase):
    def test_fetches_once_and_joins_transcript_text(self):
        api = FakeYoutubeTranscriptApi()

        result = fetch_transcript(
            "dQw4w9WgXcQ",
            api_factory=lambda: api,
        )

        self.assertEqual(
            result,
            "김치 200g\n10분간 끓인다.",
        )
        self.assertEqual(
            api.video_ids,
            ["dQw4w9WgXcQ"],
        )


if __name__ == "__main__":
    unittest.main()

import re
import sys


VIDEO_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{11}$")
MAX_TRANSCRIPT_LENGTH = 20_000


def fetch_transcript(video_id, api_factory=None):
      if not VIDEO_ID_PATTERN.fullmatch(video_id):
          raise ValueError("invalid video ID")

      if api_factory is None:
          from youtube_transcript_api import YouTubeTranscriptApi

          api_factory = YouTubeTranscriptApi

      transcript = api_factory().fetch(video_id)

      lines = [
          segment.text.strip()
          for segment in transcript
          if isinstance(segment.text, str)
          and segment.text.strip()
      ]

      result = "\n".join(lines)

      if (
          not result
          or len(result) > MAX_TRANSCRIPT_LENGTH
      ):
          raise RuntimeError("invalid transcript")

      return result


def main(argv):
      if len(argv) != 2:
          return 1

      try:
          result = fetch_transcript(argv[1])
      except Exception:
          return 1

      if hasattr(sys.stdout, "reconfigure"):
          sys.stdout.reconfigure(encoding="utf-8")

      print(result, end="")
      return 0


if __name__ == "__main__":
      raise SystemExit(main(sys.argv))
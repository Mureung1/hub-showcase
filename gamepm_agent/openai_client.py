from __future__ import annotations

import json
import os
from typing import Any

from .agent_engine import AgentEngineError


DEFAULT_OPENAI_MODEL = "gpt-4o-mini"


class OpenAIJSONClient:
    def __init__(
        self,
        model: str = DEFAULT_OPENAI_MODEL,
        api_key: str | None = None,
        sdk_client: Any | None = None,
    ) -> None:
        self.model = model
        if sdk_client is not None:
            self.client = sdk_client
            return

        resolved_api_key = api_key or os.environ.get("OPENAI_API_KEY")
        if not resolved_api_key:
            raise AgentEngineError(
                "OPENAI_API_KEY is required for the OpenAI prompt agent. "
                "Set it in your environment; do not hardcode API keys."
            )

        try:
            from openai import OpenAI
        except ImportError as exc:
            raise AgentEngineError(
                "The openai package is required. Install it with "
                "`python3 -m pip install -r requirements.txt`."
            ) from exc

        self.client = OpenAI(api_key=resolved_api_key)

    def complete_json(self, system_prompt: str, payload: dict[str, object]) -> dict[str, object]:
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {
                        "role": "user",
                        "content": json.dumps(payload, ensure_ascii=False),
                    },
                ],
                response_format={"type": "json_object"},
                temperature=0,
            )
            content = self._extract_content(response)
            parsed = json.loads(content)
        except AgentEngineError:
            raise
        except json.JSONDecodeError as exc:
            raise AgentEngineError("OpenAI returned invalid JSON.") from exc
        except Exception as exc:
            raise AgentEngineError(f"OpenAI API request failed: {exc}") from exc

        if not isinstance(parsed, dict):
            raise AgentEngineError("OpenAI response must be a JSON object.")
        return parsed

    def _extract_content(self, response: Any) -> str:
        try:
            content = response.choices[0].message.content
        except (AttributeError, IndexError, KeyError, TypeError) as exc:
            raise AgentEngineError("OpenAI response did not include message content.") from exc

        if isinstance(content, list):
            text_parts: list[str] = []
            for item in content:
                if isinstance(item, dict) and item.get("type") == "text":
                    text_parts.append(str(item.get("text", "")))
                elif hasattr(item, "text"):
                    text_parts.append(str(item.text))
            content = "".join(text_parts)

        if not isinstance(content, str) or not content.strip():
            raise AgentEngineError("OpenAI response content was empty.")
        return content

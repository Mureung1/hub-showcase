from __future__ import annotations

import os
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from gamepm_agent.agent_engine import AgentEngineError
from gamepm_agent.cli import build_engine, build_parser
from gamepm_agent.openai_client import OpenAIJSONClient


class FakeCompletions:
    def __init__(self, response: object | None = None, error: Exception | None = None) -> None:
        self.response = response
        self.error = error
        self.calls: list[dict[str, object]] = []

    def create(self, **kwargs: object) -> object:
        self.calls.append(kwargs)
        if self.error:
            raise self.error
        return self.response


class FakeOpenAIClient:
    def __init__(self, response: object | None = None, error: Exception | None = None) -> None:
        self.chat = SimpleNamespace(
            completions=FakeCompletions(response=response, error=error)
        )


def response_with_content(content: object) -> object:
    return SimpleNamespace(
        choices=[
            SimpleNamespace(
                message=SimpleNamespace(content=content),
            )
        ]
    )


class OpenAIJSONClientTests(unittest.TestCase):
    def test_parses_json_object_response(self) -> None:
        sdk_client = FakeOpenAIClient(response_with_content('{"ok": true}'))
        client = OpenAIJSONClient(model="test-model", sdk_client=sdk_client)

        result = client.complete_json("system", {"input": "값"})

        self.assertEqual(result, {"ok": True})
        call = sdk_client.chat.completions.calls[0]
        self.assertEqual(call["model"], "test-model")
        self.assertEqual(call["response_format"], {"type": "json_object"})
        self.assertEqual(call["temperature"], 0)

    def test_invalid_json_raises_agent_error(self) -> None:
        client = OpenAIJSONClient(
            sdk_client=FakeOpenAIClient(response_with_content("not json"))
        )

        with self.assertRaises(AgentEngineError):
            client.complete_json("system", {"input": "value"})

    def test_non_object_json_raises_agent_error(self) -> None:
        client = OpenAIJSONClient(
            sdk_client=FakeOpenAIClient(response_with_content('["not", "object"]'))
        )

        with self.assertRaises(AgentEngineError):
            client.complete_json("system", {"input": "value"})

    def test_api_error_is_wrapped(self) -> None:
        client = OpenAIJSONClient(sdk_client=FakeOpenAIClient(error=RuntimeError("boom")))

        with self.assertRaisesRegex(AgentEngineError, "OpenAI API request failed"):
            client.complete_json("system", {"input": "value"})

    def test_missing_api_key_raises_clear_error_before_import(self) -> None:
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaisesRegex(AgentEngineError, "OPENAI_API_KEY"):
                OpenAIJSONClient()

    def test_cli_openai_prompt_path_builds_openai_engine(self) -> None:
        args = build_parser().parse_args(
            [
                "--agent",
                "prompt",
                "--llm",
                "openai",
                "--model",
                "test-model",
                "proposals",
                "project-a",
            ]
        )

        with patch.dict(os.environ, {"OPENAI_API_KEY": "test-key"}):
            with patch("gamepm_agent.openai_client.OpenAIJSONClient.__init__", return_value=None):
                engine = build_engine(args)

        self.assertEqual(engine.name, "prompt-agent")


if __name__ == "__main__":
    unittest.main()

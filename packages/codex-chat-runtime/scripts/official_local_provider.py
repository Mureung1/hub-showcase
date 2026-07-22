"""Test-only controller for the exact official SDK local Responses harness."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shlex
import sys
import threading
from pathlib import Path
from typing import Any

from app_server_harness import (
    CapturedResponsesRequest,
    MockResponsesServer,
    MockSseResponse,
    ev_assistant_message,
    ev_completed,
    ev_failed,
    ev_function_call,
    ev_message_item_added,
    ev_output_text_delta,
    ev_response_created,
    sse,
)
from app_server_helpers import streaming_response


_PRODUCT_EXEC_CALL_ID = "call-product-exec"
_PRODUCT_MCP_CALL_ID = "call-product-proposal"
_PRODUCT_REVIEW_CALL_ID = "call-product-review"
_PRODUCT_REPLACEMENT_MCP_CALL_ID = "call-product-replacement-proposal"
_PRODUCT_REPLACEMENT_REVIEW_CALL_ID = "call-product-replacement-review"
_PRODUCT_MCP_NAMESPACE = "mcp__ay_ple"
_PRODUCT_MCP_NAME = "propose_state_patch"
_PRODUCT_MARKER_NAME = "exact-runtime-product-command.txt"
_PRODUCT_MARKER_CONTENT = "exact-runtime-product-command-ok\n"
_PRODUCT_REVISION_FEEDBACK = "제안 설명을 더 명확하게 작성해 주세요."
_PRODUCT_REVIEW_QUESTION = {
    "id": "assignment_review_decision",
    "header": "변경 제안 검토",
    "question": "이 Assignment 변경 제안을 어떻게 처리할까요?",
    "options": [
        {
            "label": "수락",
            "description": "근거와 값을 확인하고 학기 상태에 반영합니다.",
        },
        {
            "label": "AY에게 수정 요청",
            "description": "피드백을 전달하고 새 변경 제안을 기다립니다.",
        },
        {
            "label": "거절",
            "description": "제안을 반영하지 않고 결정 기록만 남깁니다.",
        },
    ],
    "acceptsFreeform": True,
}
_PRODUCT_REQUEST_USER_INPUT = {
    "questions": [
        {
            key: value
            for key, value in _PRODUCT_REVIEW_QUESTION.items()
            if key != "acceptsFreeform"
        }
    ]
}


class _ProductProviderFailure(Exception):
    def __init__(self, code: str) -> None:
        super().__init__(code)
        self.code = code


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser()
    commands = parser.add_subparsers(dest="command", required=True)

    policy = commands.add_parser("policy")
    policy.add_argument("--codex-bin", required=True)
    policy.add_argument("--workspace", required=True)
    policy.add_argument("--codex-home", required=True)
    policy.add_argument("--codex-sqlite-home", required=True)
    policy.add_argument("--home", required=True)
    policy.add_argument("--temp-directory", required=True)
    policy.add_argument("--thread-id", required=True)

    serve = commands.add_parser("serve")
    serve.add_argument("--ready-file", required=True)
    serve.add_argument("--journal-file", required=True)

    serve_product = commands.add_parser("serve-product")
    serve_product.add_argument("--ready-file", required=True)
    serve_product.add_argument("--journal-file", required=True)
    serve_product.add_argument("--active-workspace", required=True)
    serve_product.add_argument("--app-data-root", required=True)
    return parser


def _atomic_json(path: Path, value: object) -> None:
    temporary = path.with_name(f".{path.name}.{os.getpid()}.tmp")
    temporary.write_text(
        json.dumps(value, separators=(",", ":"), sort_keys=True),
        encoding="utf-8",
    )
    os.replace(temporary, path)


def _policy(args: argparse.Namespace) -> int:
    from openai_codex import CodexConfig
    from openai_codex.client import CodexClient
    from openai_codex.generated.v2_all import ThreadResumeParams

    config = CodexConfig(
        codex_bin=args.codex_bin,
        cwd=args.workspace,
        env={
            "CODEX_APP_SERVER_DISABLE_MANAGED_CONFIG": "1",
            "CODEX_HOME": args.codex_home,
            "CODEX_SQLITE_HOME": args.codex_sqlite_home,
            "HOME": args.home,
            "TMPDIR": args.temp_directory,
        },
    )
    with CodexClient(config) as client:
        client.initialize()
        response = client.thread_resume(
            args.thread_id,
            ThreadResumeParams(thread_id=args.thread_id),
        )
    value = response.model_dump(by_alias=True, mode="json")
    print(
        json.dumps(
            {
                "approvalPolicy": value["approvalPolicy"],
                "sandbox": value["sandbox"],
                "threadId": value["thread"]["id"],
            },
            separators=(",", ":"),
            sort_keys=True,
        ),
        flush=True,
    )
    return 0


def _request_journal(responses: MockResponsesServer) -> dict[str, Any]:
    requests = []
    for request in responses.requests():
        requests.append(
            {
                "method": request.method,
                "path": request.path,
                "userTexts": request.message_input_texts("user"),
            }
        )
    return {"requests": requests}


def _publish_journal(
    responses: MockResponsesServer,
    path: Path,
    stop: threading.Event,
) -> None:
    previous = -1
    while not stop.is_set():
        current = len(responses.requests())
        if current != previous:
            _atomic_json(path, _request_journal(responses))
            previous = current
        stop.wait(0.01)
    _atomic_json(path, _request_journal(responses))


def _empty_product_journal() -> dict[str, Any]:
    return {
        "requestCount": 0,
        "stages": [],
        "managedSkillObserved": False,
        "toolSurfaceObserved": False,
        "activeWorkspaceCwdObserved": False,
        "scratchWriteObserved": False,
        "selectedSourcesRead": False,
        "proposalCommittedOutputObserved": False,
        "revisionRequestedOutputObserved": False,
        "replacementProposalCommittedOutputObserved": False,
        "reviewAcceptedOutputObserved": False,
        "planResponseServed": False,
        "replacementPlanResponseServed": False,
        "terminalServed": False,
        "failureCode": None,
    }


def _is_within(path: Path, parent: Path) -> bool:
    try:
        path.relative_to(parent)
    except ValueError:
        return False
    return True


def _required_match(text: str, pattern: str, failure_code: str) -> str:
    matches = re.findall(pattern, text, flags=re.MULTILINE)
    if len(matches) != 1:
        raise _ProductProviderFailure(failure_code)
    match = matches[0]
    if not isinstance(match, str):
        raise _ProductProviderFailure(failure_code)
    return match


def _request_body(request: CapturedResponsesRequest) -> dict[str, Any]:
    if request.method != "POST" or not request.path.endswith("/responses"):
        raise _ProductProviderFailure("request_envelope_invalid")
    try:
        body = request.body_json()
    except (UnicodeDecodeError, json.JSONDecodeError):
        raise _ProductProviderFailure("request_json_invalid") from None
    if not isinstance(body, dict):
        raise _ProductProviderFailure("request_json_invalid")
    return body


def _tool_names(body: dict[str, Any]) -> set[str]:
    tools = body.get("tools")
    if not isinstance(tools, list):
        return set()
    return {
        name
        for tool in tools
        if isinstance(tool, dict) and isinstance((name := tool.get("name")), str)
    }


def _has_product_tool_surface(body: dict[str, Any]) -> bool:
    tools = body.get("tools")
    if not isinstance(tools, list):
        return False
    namespace = next(
        (
            tool
            for tool in tools
            if isinstance(tool, dict)
            and tool.get("type") == "namespace"
            and tool.get("name") == _PRODUCT_MCP_NAMESPACE
        ),
        None,
    )
    if namespace is None:
        return False
    children = namespace.get("tools")
    if not isinstance(children, list):
        return False
    return {
        "exec_command",
        "request_user_input",
    }.issubset(_tool_names(body)) and any(
        isinstance(tool, dict)
        and tool.get("type") == "function"
        and tool.get("name") == _PRODUCT_MCP_NAME
        for tool in children
    )


def _function_output(body: dict[str, Any], call_id: str) -> str:
    inputs = body.get("input")
    if not isinstance(inputs, list):
        raise _ProductProviderFailure("tool_output_missing")
    matches = [
        item
        for item in inputs
        if isinstance(item, dict)
        and item.get("type") == "function_call_output"
        and item.get("call_id") == call_id
    ]
    if len(matches) != 1:
        raise _ProductProviderFailure("tool_output_missing")
    output = matches[0].get("output")
    if isinstance(output, str):
        return output
    if isinstance(output, list):
        texts = [
            item.get("text")
            for item in output
            if isinstance(item, dict) and isinstance(item.get("text"), str)
        ]
        if texts:
            return "\n".join(texts)
    raise _ProductProviderFailure("tool_output_invalid")


def _json_object_line(output: str, failure_code: str) -> dict[str, Any]:
    for line in output.splitlines():
        candidate = line.strip()
        if not candidate.startswith("{") or not candidate.endswith("}"):
            continue
        try:
            value = json.loads(candidate)
        except json.JSONDecodeError:
            continue
        if isinstance(value, dict):
            return value
    raise _ProductProviderFailure(failure_code)


def _review_answers(body: dict[str, Any], call_id: str) -> list[str]:
    output = _function_output(body, call_id)
    try:
        answer = json.loads(output)
    except json.JSONDecodeError:
        raise _ProductProviderFailure("review_answer_output_invalid") from None
    if not isinstance(answer, dict) or set(answer) != {"answers"}:
        raise _ProductProviderFailure("review_answer_output_invalid")
    answer_map = answer["answers"]
    if not isinstance(answer_map, dict) or set(answer_map) != {
        "assignment_review_decision"
    }:
        raise _ProductProviderFailure("review_answer_output_invalid")
    question_answer = answer_map["assignment_review_decision"]
    if not isinstance(question_answer, dict) or set(question_answer) != {"answers"}:
        raise _ProductProviderFailure("review_answer_output_invalid")
    answers = question_answer["answers"]
    if not isinstance(answers, list) or not all(
        isinstance(value, str) for value in answers
    ):
        raise _ProductProviderFailure("review_answer_output_invalid")
    return answers


def _response_with_call(
    response_id: str,
    call_id: str,
    name: str,
    arguments: dict[str, Any],
) -> MockSseResponse:
    return MockSseResponse(
        body=sse(
            [
                ev_response_created(response_id),
                ev_function_call(
                    call_id,
                    name,
                    json.dumps(
                        arguments,
                        ensure_ascii=False,
                        separators=(",", ":"),
                        sort_keys=True,
                    ),
                ),
                ev_completed(response_id),
            ]
        )
    )


def _namespaced_response_with_call(
    response_id: str,
    call_id: str,
    namespace: str,
    name: str,
    arguments: dict[str, Any],
) -> MockSseResponse:
    call = ev_function_call(
        call_id,
        name,
        json.dumps(
            arguments,
            ensure_ascii=False,
            separators=(",", ":"),
            sort_keys=True,
        ),
    )
    item = call.get("item")
    if not isinstance(item, dict):
        raise _ProductProviderFailure("provider_event_invalid")
    item["namespace"] = namespace
    return MockSseResponse(
        body=sse(
            [
                ev_response_created(response_id),
                call,
                ev_completed(response_id),
            ]
        )
    )


class _ProductController:
    def __init__(
        self,
        *,
        active_workspace: Path,
        app_data_root: Path,
        journal_path: Path,
    ) -> None:
        try:
            self._active_workspace = active_workspace.resolve(strict=True)
            self._app_data_root = app_data_root.resolve(strict=True)
        except OSError:
            raise _ProductProviderFailure("workspace_unavailable") from None
        if (
            not self._active_workspace.is_dir()
            or not self._app_data_root.is_dir()
            or any(
                _is_within(left, right) or _is_within(right, left)
                for index, left in enumerate(
                    (
                        self._active_workspace,
                        self._app_data_root,
                    )
                )
                for right in (
                    self._active_workspace,
                    self._app_data_root,
                )[index + 1 :]
            )
        ):
            raise _ProductProviderFailure("workspace_invalid")
        self._journal_path = journal_path
        self._journal = _empty_product_journal()
        self._lock = threading.Lock()
        self._scratch_path: Path | None = None
        self._proposal: dict[str, Any] | None = None
        self._replacement_proposal: dict[str, Any] | None = None
        self._publish()

    def response_for(self, request: CapturedResponsesRequest) -> MockSseResponse:
        with self._lock:
            self._journal["requestCount"] += 1
            try:
                if self._journal["failureCode"] is not None:
                    raise _ProductProviderFailure("request_after_failure")
                request_index = self._journal["requestCount"]
                body = _request_body(request)
                if request_index == 1:
                    response = self._serve_exec_command(request, body)
                    self._record_stage("exec_command")
                elif request_index == 2:
                    response = self._serve_mcp_proposal(body)
                    self._record_stage("mcp_proposal")
                elif request_index == 3:
                    response = self._serve_review_question(body)
                    self._record_stage("review_question")
                elif request_index == 4:
                    response = self._serve_replacement_mcp_proposal(body)
                    self._record_stage("replacement_mcp_proposal")
                elif request_index == 5:
                    response = self._serve_replacement_review_question(body)
                    self._record_stage("replacement_review_question")
                elif request_index == 6:
                    response = self._serve_terminal(body)
                    self._record_stage("terminal")
                else:
                    raise _ProductProviderFailure("unexpected_request_count")
                self._publish()
                return response
            except _ProductProviderFailure as error:
                self._journal["failureCode"] = error.code
            except Exception:
                self._journal["failureCode"] = "provider_internal_error"
            self._publish()
            failure_code = self._journal["failureCode"]
            response_id = f"product-failure-{self._journal['requestCount']}"
            return MockSseResponse(
                body=sse(
                    [
                        ev_response_created(response_id),
                        ev_failed(response_id, str(failure_code)),
                    ]
                )
            )

    def _serve_exec_command(
        self,
        request: CapturedResponsesRequest,
        body: dict[str, Any],
    ) -> MockSseResponse:
        user_texts = request.message_input_texts("user")
        prompts = [
            text
            for text in user_texts
            if text.startswith("AY-PLE First Assignment ModelingInvocation\n")
        ]
        skill_blocks = [text for text in user_texts if text.startswith("<skill>")]
        if len(prompts) != 1:
            raise _ProductProviderFailure("product_prompt_missing")
        prompt = prompts[0]
        if len(skill_blocks) != 1:
            raise _ProductProviderFailure("managed_skill_missing")
        skill_block = skill_blocks[0]
        if "<name>ay-ple-first-assignment</name>" not in skill_block:
            raise _ProductProviderFailure("managed_skill_identity_invalid")
        if (
            "Call the AY-PLE MCP tool" not in skill_block
            or "propose_state_patch" not in skill_block
        ):
            raise _ProductProviderFailure("managed_skill_body_invalid")
        skill_path_value = _required_match(
            skill_block,
            r"<path>([^<]+)</path>",
            "managed_skill_path_invalid",
        )
        try:
            skill_path = Path(skill_path_value).resolve(strict=True)
        except OSError:
            raise _ProductProviderFailure("managed_skill_path_invalid") from None
        if (
            not skill_path.is_file()
            or skill_path.name != "SKILL.md"
            or not _is_within(skill_path, self._app_data_root)
        ):
            raise _ProductProviderFailure("managed_skill_path_invalid")
        self._journal["managedSkillObserved"] = True

        if not _has_product_tool_surface(body):
            raise _ProductProviderFailure("product_tool_surface_invalid")
        self._journal["toolSurfaceObserved"] = True

        if str(self._active_workspace) not in prompt:
            raise _ProductProviderFailure("product_workspace_prompt_invalid")
        expected_question = json.dumps(
            _PRODUCT_REQUEST_USER_INPUT["questions"][0],
            ensure_ascii=False,
            separators=(",", ":"),
        )
        if (
            "Use exactly these two read-only source snapshots:" not in prompt
            or f"After the proposal, request exactly this review question: {expected_question}"
            not in prompt
        ):
            raise _ProductProviderFailure("product_prompt_contract_invalid")

        request_key = _required_match(
            prompt,
            r"^requestKey: (proposal_[0-9a-f]{32})$",
            "proposal_context_invalid",
        )
        workspace_id = _required_match(
            prompt,
            r"^workspaceId: (workspace_[0-9a-f]{32})$",
            "proposal_context_invalid",
        )
        course_id = _required_match(
            prompt,
            r"^courseId: (course_[0-9a-f]{32})$",
            "proposal_context_invalid",
        )
        base_revision_text = _required_match(
            prompt,
            r"^baseRevision: ([0-9]+)$",
            "proposal_context_invalid",
        )
        sources = re.findall(
            r"^[12]\. RawMaterial (material_[0-9a-f]{32}) "
            r"\(([0-9a-f]{64})\)\n"
            r"   \[selected-source-[12]\]\(<([^>]+)>\)$",
            prompt,
            flags=re.MULTILINE,
        )
        if len(sources) != 2 or len({source[0] for source in sources}) != 2:
            raise _ProductProviderFailure("selected_sources_invalid")

        source_records: list[tuple[str, str, str, str]] = []
        for material_id, digest, source_value in sources:
            try:
                source_path = Path(source_value).resolve(strict=True)
                source_bytes = source_path.read_bytes()
                source_text = source_bytes.decode("utf-8")
            except (OSError, UnicodeDecodeError):
                raise _ProductProviderFailure("selected_source_unreadable") from None
            if not _is_within(source_path, self._app_data_root):
                raise _ProductProviderFailure("selected_source_outside_app_data")
            if hashlib.sha256(source_bytes).hexdigest() != digest:
                raise _ProductProviderFailure("selected_source_digest_invalid")
            source_records.append((material_id, digest, source_text, str(source_path)))

        notice = next(
            (
                source
                for source in source_records
                if "RFC 3339 마감 시각은 2026-07-12T23:59:00+09:00입니다." in source[2]
            ),
            None,
        )
        syllabus = next(
            (
                source
                for source in source_records
                if "과제: 개요 작성하기" in source[2]
                and "제출 방식: LMS 과제함 업로드" in source[2]
            ),
            None,
        )
        if notice is None or syllabus is None or notice == syllabus:
            raise _ProductProviderFailure("selected_source_content_invalid")
        scratch_value = _required_match(
            prompt,
            r"^Use scratch only for transient writes: (.+)$",
            "scratch_path_invalid",
        )
        try:
            scratch_path = Path(scratch_value).resolve(strict=True)
        except OSError:
            raise _ProductProviderFailure("scratch_path_invalid") from None
        if not scratch_path.is_dir() or not _is_within(
            scratch_path,
            self._active_workspace,
        ):
            raise _ProductProviderFailure("scratch_path_invalid")
        self._scratch_path = scratch_path
        self._proposal = {
            "requestKey": request_key,
            "workspaceId": workspace_id,
            "courseId": course_id,
            "baseRevision": int(base_revision_text),
            "summary": "선택 자료에서 개요 작성 과제를 확인했습니다.",
            "changes": {
                "operation": "assignment.upsert",
                "values": {
                    "title": "개요 작성하기",
                    "dueAt": "2026-07-12T23:59:00+09:00",
                    "submissionMethod": "LMS 과제함 업로드",
                },
            },
            "evidence": [
                {
                    "field": "title",
                    "rawMaterialId": syllabus[0],
                    "digest": syllabus[1],
                    "quote": "과제: 개요 작성하기",
                },
                {
                    "field": "dueAt",
                    "rawMaterialId": notice[0],
                    "digest": notice[1],
                    "quote": "RFC 3339 마감 시각은 2026-07-12T23:59:00+09:00입니다.",
                },
                {
                    "field": "submissionMethod",
                    "rawMaterialId": syllabus[0],
                    "digest": syllabus[1],
                    "quote": "제출 방식: LMS 과제함 업로드",
                },
            ],
        }
        marker_path = scratch_path / _PRODUCT_MARKER_NAME
        python_source = (
            "from pathlib import Path;import json,sys;"
            "target=Path(sys.argv[1])/'exact-runtime-product-command.txt';"
            "target.write_text('exact-runtime-product-command-ok\\n',encoding='utf-8');"
            "notice=Path(sys.argv[2]).read_text(encoding='utf-8');"
            "syllabus=Path(sys.argv[3]).read_text(encoding='utf-8');"
            "print(json.dumps({'cwd':str(Path.cwd().resolve()),"
            "'marker':'exact-runtime-product-command-ok',"
            "'noticeDueQuote':"
            "'RFC 3339 마감 시각은 2026-07-12T23:59:00+09:00입니다.' in notice,"
            "'syllabusTitleQuote':'과제: 개요 작성하기' in syllabus,"
            "'syllabusSubmissionQuote':"
            "'제출 방식: LMS 과제함 업로드' in syllabus},"
            "ensure_ascii=False,separators=(',',':'),sort_keys=True))"
        )
        command = " ".join(
            [
                "/usr/bin/python3",
                "-c",
                shlex.quote(python_source),
                shlex.quote(str(scratch_path)),
                shlex.quote(
                    next(
                        source[3] for source in source_records if source[0] == notice[0]
                    )
                ),
                shlex.quote(
                    next(
                        source[3]
                        for source in source_records
                        if source[0] == syllabus[0]
                    )
                ),
            ]
        )
        if marker_path.exists():
            raise _ProductProviderFailure("scratch_marker_preexisting")
        return _response_with_call(
            "product-exec-response",
            _PRODUCT_EXEC_CALL_ID,
            "exec_command",
            {
                "cmd": command,
                "login": False,
                "yield_time_ms": 10_000,
            },
        )

    def _serve_mcp_proposal(self, body: dict[str, Any]) -> MockSseResponse:
        if self._scratch_path is None or self._proposal is None:
            raise _ProductProviderFailure("provider_stage_invalid")
        output = _function_output(body, _PRODUCT_EXEC_CALL_ID)
        marker_path = self._scratch_path / _PRODUCT_MARKER_NAME
        try:
            marker_content = marker_path.read_text(encoding="utf-8")
            marker_resolved = marker_path.resolve(strict=True)
        except (OSError, UnicodeDecodeError):
            raise _ProductProviderFailure("scratch_write_missing") from None
        command_evidence = _json_object_line(
            output,
            "exec_command_output_invalid",
        )
        if (
            marker_content != _PRODUCT_MARKER_CONTENT
            or not _is_within(marker_resolved, self._scratch_path)
            or command_evidence
            != {
                "cwd": str(self._active_workspace),
                "marker": "exact-runtime-product-command-ok",
                "noticeDueQuote": True,
                "syllabusSubmissionQuote": True,
                "syllabusTitleQuote": True,
            }
        ):
            raise _ProductProviderFailure("exec_command_output_invalid")
        self._journal["activeWorkspaceCwdObserved"] = True
        self._journal["scratchWriteObserved"] = True
        self._journal["selectedSourcesRead"] = True
        return _namespaced_response_with_call(
            "product-proposal-response",
            _PRODUCT_MCP_CALL_ID,
            _PRODUCT_MCP_NAMESPACE,
            _PRODUCT_MCP_NAME,
            self._proposal,
        )

    def _serve_review_question(self, body: dict[str, Any]) -> MockSseResponse:
        _function_output(body, _PRODUCT_MCP_CALL_ID)
        self._journal["proposalCommittedOutputObserved"] = True
        plan = (
            "<proposed_plan>\n"
            "- 선택한 두 자료의 근거로 Assignment StatePatch를 제안했습니다.\n"
            "- 앱의 Assignment Review 결정을 기다립니다.\n"
            "</proposed_plan>"
        )
        self._journal["planResponseServed"] = True
        plan_parts = [
            "<proposed_plan>\n",
            "- 선택한 두 자료의 근거로 Assignment StatePatch를 제안했습니다.\n",
            "- 앱의 Assignment Review 결정을 기다립니다.\n",
            "</proposed_plan>",
        ]
        return MockSseResponse(
            body=sse(
                [
                    ev_response_created("product-review-response"),
                    ev_message_item_added("product-plan-message"),
                    *[ev_output_text_delta(part) for part in plan_parts],
                    ev_assistant_message("product-plan-message", plan),
                    ev_function_call(
                        _PRODUCT_REVIEW_CALL_ID,
                        "request_user_input",
                        json.dumps(
                            _PRODUCT_REQUEST_USER_INPUT,
                            ensure_ascii=False,
                            separators=(",", ":"),
                        ),
                    ),
                    ev_completed("product-review-response"),
                ]
            )
        )

    def _serve_replacement_mcp_proposal(
        self,
        body: dict[str, Any],
    ) -> MockSseResponse:
        if self._proposal is None:
            raise _ProductProviderFailure("provider_stage_invalid")
        answers = _review_answers(body, _PRODUCT_REVIEW_CALL_ID)
        if (
            len(answers) != 3
            or answers[0] != "AY에게 수정 요청"
            or answers[1] != _PRODUCT_REVISION_FEEDBACK
        ):
            raise _ProductProviderFailure("review_revision_output_invalid")
        replacement_match = re.fullmatch(
            r"replacement requestKey: (proposal_[0-9a-f]{32})",
            answers[2],
        )
        if replacement_match is None:
            raise _ProductProviderFailure("replacement_request_key_invalid")
        replacement_request_key = replacement_match.group(1)
        if replacement_request_key == self._proposal["requestKey"]:
            raise _ProductProviderFailure("replacement_request_key_reused")
        self._replacement_proposal = {
            **self._proposal,
            "requestKey": replacement_request_key,
            "summary": "수정 요청을 반영해 선택 자료의 Assignment 근거를 다시 확인했습니다.",
        }
        self._journal["revisionRequestedOutputObserved"] = True
        return _namespaced_response_with_call(
            "product-replacement-proposal-response",
            _PRODUCT_REPLACEMENT_MCP_CALL_ID,
            _PRODUCT_MCP_NAMESPACE,
            _PRODUCT_MCP_NAME,
            self._replacement_proposal,
        )

    def _serve_replacement_review_question(
        self,
        body: dict[str, Any],
    ) -> MockSseResponse:
        if self._replacement_proposal is None:
            raise _ProductProviderFailure("provider_stage_invalid")
        _function_output(body, _PRODUCT_REPLACEMENT_MCP_CALL_ID)
        self._journal["replacementProposalCommittedOutputObserved"] = True
        plan = (
            "<proposed_plan>\n"
            "- 수정 요청을 반영해 Assignment StatePatch를 다시 제안했습니다.\n"
            "- 앱의 대체 Assignment Review 결정을 기다립니다.\n"
            "</proposed_plan>"
        )
        plan_parts = [
            "<proposed_plan>\n",
            "- 수정 요청을 반영해 Assignment StatePatch를 다시 제안했습니다.\n",
            "- 앱의 대체 Assignment Review 결정을 기다립니다.\n",
            "</proposed_plan>",
        ]
        self._journal["replacementPlanResponseServed"] = True
        return MockSseResponse(
            body=sse(
                [
                    ev_response_created("product-replacement-review-response"),
                    ev_message_item_added("product-replacement-plan-message"),
                    *[ev_output_text_delta(part) for part in plan_parts],
                    ev_assistant_message("product-replacement-plan-message", plan),
                    ev_function_call(
                        _PRODUCT_REPLACEMENT_REVIEW_CALL_ID,
                        "request_user_input",
                        json.dumps(
                            _PRODUCT_REQUEST_USER_INPUT,
                            ensure_ascii=False,
                            separators=(",", ":"),
                        ),
                    ),
                    ev_completed("product-replacement-review-response"),
                ]
            )
        )

    def _serve_terminal(self, body: dict[str, Any]) -> MockSseResponse:
        answers = _review_answers(body, _PRODUCT_REPLACEMENT_REVIEW_CALL_ID)
        if answers != ["수락"]:
            raise _ProductProviderFailure("review_answer_output_invalid")
        self._journal["reviewAcceptedOutputObserved"] = True
        self._journal["terminalServed"] = True
        return MockSseResponse(
            body=streaming_response(
                "product-terminal-response",
                "product-terminal-message",
                ["Assignment ", "변경 제안 검토가 완료되었습니다."],
            )
        )

    def _record_stage(self, stage: str) -> None:
        stages = self._journal["stages"]
        if not isinstance(stages, list):
            raise _ProductProviderFailure("provider_journal_invalid")
        stages.append(stage)

    def _publish(self) -> None:
        _atomic_json(self._journal_path, self._journal)


class _ProductResponsesServer(MockResponsesServer):
    def __init__(self, controller: _ProductController) -> None:
        self._product_controller = controller
        super().__init__()

    def _next_response(self) -> MockSseResponse:
        requests = self.requests()
        if not requests:
            raise RuntimeError("recorded request missing")
        return self._product_controller.response_for(requests[-1])


def _serve(args: argparse.Namespace) -> int:
    ready_path = Path(args.ready_file)
    journal_path = Path(args.journal_file)
    stop = threading.Event()
    with MockResponsesServer() as responses:
        responses.enqueue_sse(
            streaming_response(
                "exact-t0-response",
                "exact-t0-message",
                ["hello ", "exact ", "runtime"],
            )
        )
        responses.enqueue_sse(
            streaming_response(
                "exact-interrupt-response",
                "exact-interrupt-message",
                ["still ", "running"],
            ),
            delay_between_events_s=0.4,
        )
        responses.enqueue_sse(
            streaming_response(
                "exact-follow-up-response",
                "exact-follow-up-message",
                ["after ", "interrupt"],
            )
        )
        journal = threading.Thread(
            target=_publish_journal,
            args=(responses, journal_path, stop),
            name="local-provider-journal",
        )
        journal.start()
        try:
            _atomic_json(ready_path, {"url": responses.url})
            for line in sys.stdin:
                if line.strip() == "close":
                    break
        finally:
            stop.set()
            journal.join(timeout=2)
            if journal.is_alive():
                raise RuntimeError("local provider journal did not stop")
    return 0


def _serve_product(args: argparse.Namespace) -> int:
    ready_path = Path(args.ready_file)
    journal_path = Path(args.journal_file)
    try:
        controller = _ProductController(
            active_workspace=Path(args.active_workspace),
            app_data_root=Path(args.app_data_root),
            journal_path=journal_path,
        )
    except _ProductProviderFailure as error:
        journal = _empty_product_journal()
        journal["failureCode"] = error.code
        _atomic_json(journal_path, journal)
        return 2

    with _ProductResponsesServer(controller) as responses:
        _atomic_json(ready_path, {"url": responses.url})
        for line in sys.stdin:
            if line.strip() == "close":
                break
    return 0


def main(argv: list[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    if args.command == "policy":
        return _policy(args)
    if args.command == "serve":
        return _serve(args)
    if args.command == "serve-product":
        return _serve_product(args)
    raise AssertionError(f"unexpected command {args.command}")


if __name__ == "__main__":
    raise SystemExit(main())

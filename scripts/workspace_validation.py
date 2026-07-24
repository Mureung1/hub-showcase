"""GamePM 문서 작업장의 결정적 무결성 규칙을 검사한다."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import re
from urllib.parse import unquote


PROJECTS_SECTION_RE = re.compile(
    r"^## Projects\s*$([\s\S]*?)(?=^## |\Z)",
    re.MULTILINE,
)
APPROVAL_HEADING_RE = re.compile(
    r"^### (?P<id>APPR-\d{8}-\d{3})(?::|\s|$).*$",
    re.MULTILINE,
)
APPROVAL_ID_RE = re.compile(
    r"^- ID:\s*`?(?P<id>APPR-\d{8}-\d{3})`?\s*$",
    re.MULTILINE,
)
STATUS_RE = re.compile(
    r"^- 상태:\s*`?(?P<status>[a-z_]+)`?\s*$",
    re.MULTILINE,
)
APPROVAL_REFERENCE_RE = re.compile(
    r"^- 관련 승인 큐:\s*`?(?P<id>APPR-\d{8}-\d{3})`?\s*$",
    re.MULTILINE,
)
MARKDOWN_LINK_RE = re.compile(
    r"!?\[[^\]]*\]\(\s*(?P<target><[^>]+>|[^)\s]+)"
    r"(?:\s+(?:\"[^\"]*\"|'[^']*'))?\s*\)"
)
FENCE_RE = re.compile(r"^\s*(?P<fence>`{3,}|~{3,})")
MANIFEST_FIELD_RE = re.compile(
    r"^- (?P<key>[^:]+):\s*(?P<value>.*?)\s*$",
    re.MULTILINE,
)

TEST_FIXTURE_LABEL = "[TEST FIXTURE: SYNTHETIC]"
INFORMATION_ORIGINS = (
    "current_user_input",
    "prior_user_input",
    "confirmed_document",
    "proposal_input",
    "synthetic_test_fixture",
)
INFORMATION_CATEGORIES = (
    "user_fact",
    "confirmed_fact",
    "proposal_input",
    "test_fixture_assumption",
)
BEHAVIOR_TEST_ENVIRONMENTS = (
    "dedicated_fixture",
    "temporary_project_copy",
)
BEHAVIOR_REPORT_FIELDS = (
    "데이터 출처",
    "실행 환경",
    "원본 변경",
    "실제 프로젝트 사실로 채택",
)
REQUIRED_BEHAVIOR_MANIFEST_FIELDS = (
    "테스트 ID",
    "표시 라벨",
    "데이터 출처",
    "실행 환경",
    "픽스처 원본",
    "실행 작업 경로",
    "실제 프로젝트 복사 필요 이유",
    "허용된 쓰기",
    "원본 변경",
    "실제 프로젝트 사실로 채택",
    "테스트 입력",
    "결과 보고",
)


@dataclass(frozen=True)
class ValidationIssue:
    """한 개의 무결성 위반."""

    code: str
    path: Path
    message: str

    def __str__(self) -> str:
        return f"[{self.code}] {self.path}: {self.message}"


@dataclass(frozen=True)
class ProjectRecord:
    """프로젝트 레지스트리의 한 행."""

    project_id: str
    root: str


@dataclass(frozen=True)
class ApprovalRecord:
    """Approval Queue에서 검사에 필요한 최소 메타데이터."""

    heading_id: str
    metadata_id: str | None
    status: str | None


@dataclass(frozen=True)
class MarkdownLink:
    """Markdown 문서에서 발견한 로컬 링크 후보."""

    source: Path
    line: int
    target: str


@dataclass(frozen=True)
class ProvenanceRecord:
    """Task Packet에서 전달하는 사실 또는 입력 한 건."""

    content: str
    category: str
    origin: str
    evidence: str


REQUIRED_PROJECT_DIRECTORIES = (
    "design",
    "ideas",
    "approvals",
    "approvals/assets",
    "decisions",
    "versions",
)

REQUIRED_PROJECT_FILES = (
    "README.md",
    "project_brief.md",
    "design/README.md",
    "ideas/temporary_ideas.md",
    "approvals/approval_queue.md",
    "decisions/decision_log.md",
    "versions/version_history.md",
)


def read_text(path: Path) -> str:
    """UTF-8 Markdown 파일을 읽는다."""

    return path.read_text(encoding="utf-8")


def parse_project_registry(registry_path: Path) -> list[ProjectRecord]:
    """레지스트리의 ``Projects`` 표를 프로젝트 목록으로 변환한다."""

    text = read_text(registry_path)
    match = PROJECTS_SECTION_RE.search(text)
    if not match:
        return []

    projects: list[ProjectRecord] = []
    for line in match.group(1).splitlines():
        if not line.strip().startswith("|"):
            continue

        columns = [column.strip() for column in line.strip().strip("|").split("|")]
        if len(columns) < 5:
            continue
        if columns[0] in {"프로젝트 ID", "---"} or set(columns[0]) <= {"-", ":"}:
            continue

        project_id = _strip_code_span(columns[0])
        project_root = _strip_code_span(columns[4])
        if project_id or project_root:
            projects.append(ProjectRecord(project_id=project_id, root=project_root))

    return projects


def validate_project_registry(
    registry_path: Path,
    repo_root: Path,
) -> tuple[list[ProjectRecord], list[ValidationIssue]]:
    """레지스트리 중복과 프로젝트 루트 범위를 검사한다."""

    repo_root = repo_root.resolve()
    issues: list[ValidationIssue] = []

    if not registry_path.is_file():
        return [], [
            ValidationIssue(
                "missing-registry",
                registry_path,
                "프로젝트 레지스트리 파일이 없습니다.",
            )
        ]

    projects = parse_project_registry(registry_path)
    if not projects:
        issues.append(
            ValidationIssue(
                "empty-registry",
                registry_path,
                "Projects 표에 등록된 프로젝트가 없습니다.",
            )
        )
        return projects, issues

    seen_ids: set[str] = set()
    expected_parent = (repo_root / "workspace/projects").resolve()
    for project in projects:
        if not project.project_id:
            issues.append(
                ValidationIssue(
                    "missing-project-id",
                    registry_path,
                    "프로젝트 ID가 비어 있습니다.",
                )
            )
        elif project.project_id in seen_ids:
            issues.append(
                ValidationIssue(
                    "duplicate-project-id",
                    registry_path,
                    f"프로젝트 ID가 중복되었습니다: {project.project_id}",
                )
            )
        seen_ids.add(project.project_id)

        if not project.root:
            issues.append(
                ValidationIssue(
                    "missing-project-root",
                    registry_path,
                    f"{project.project_id or '(ID 없음)'}의 프로젝트 루트가 비어 있습니다.",
                )
            )
            continue

        project_root = _resolve_repo_path(repo_root, project.root)
        if not _is_within(project_root, expected_parent):
            issues.append(
                ValidationIssue(
                    "project-root-outside-workspace",
                    registry_path,
                    f"{project.project_id}의 루트가 workspace/projects 밖입니다: "
                    f"{project.root}",
                )
            )

    return projects, issues


def validate_project_structure(
    project: ProjectRecord,
    repo_root: Path,
) -> list[ValidationIssue]:
    """한 프로젝트의 필수 디렉터리와 파일을 검사한다."""

    repo_root = repo_root.resolve()
    project_root = _resolve_repo_path(repo_root, project.root)
    issues: list[ValidationIssue] = []
    expected_parent = (repo_root / "workspace/projects").resolve()

    if not _is_within(project_root, expected_parent):
        return [
            ValidationIssue(
                "project-root-outside-workspace",
                project_root,
                f"{project.project_id}의 루트가 workspace/projects 밖입니다.",
            )
        ]

    if not project_root.is_dir():
        return [
            ValidationIssue(
                "missing-project-root",
                project_root,
                f"등록 프로젝트 루트가 없습니다: {project.project_id}",
            )
        ]

    for relative_path in REQUIRED_PROJECT_DIRECTORIES:
        target = project_root / relative_path
        if not target.is_dir():
            issues.append(
                ValidationIssue(
                    "missing-project-directory",
                    target,
                    f"{project.project_id}의 필수 디렉터리가 없습니다: {relative_path}",
                )
            )

    for relative_path in REQUIRED_PROJECT_FILES:
        target = project_root / relative_path
        if not target.is_file():
            issues.append(
                ValidationIssue(
                    "missing-project-file",
                    target,
                    f"{project.project_id}의 필수 파일이 없습니다: {relative_path}",
                )
            )

    return issues


def navigation_markdown_files(
    repo_root: Path,
    projects: list[ProjectRecord],
) -> list[Path]:
    """사용자가 실제로 탐색하는 확정 문서 목록을 반환한다."""

    repo_root = repo_root.resolve()
    paths: set[Path] = set()
    root_readme = repo_root / "README.md"
    if root_readme.is_file():
        paths.add(root_readme)

    for project in projects:
        project_root = _resolve_repo_path(repo_root, project.root)
        expected_parent = (repo_root / "workspace/projects").resolve()
        if not _is_within(project_root, expected_parent):
            continue

        for relative_path in ("README.md", "project_brief.md"):
            path = project_root / relative_path
            if path.is_file():
                paths.add(path)

        design_root = project_root / "design"
        if design_root.is_dir():
            paths.update(path for path in design_root.rglob("*.md") if path.is_file())

    return sorted(paths)


def extract_markdown_links(path: Path) -> list[MarkdownLink]:
    """코드 블록 밖의 Markdown 링크를 추출한다."""

    links: list[MarkdownLink] = []
    for line_number, line in _visible_markdown_lines(read_text(path)):
        for match in MARKDOWN_LINK_RE.finditer(line):
            target = match.group("target").strip()
            if target.startswith("<") and target.endswith(">"):
                target = target[1:-1].strip()
            links.append(
                MarkdownLink(source=path, line=line_number, target=unquote(target))
            )
    return links


def validate_markdown_links(
    paths: list[Path],
    repo_root: Path,
) -> list[ValidationIssue]:
    """로컬 Markdown 링크가 저장소 안의 실제 경로를 가리키는지 검사한다."""

    repo_root = repo_root.resolve()
    issues: list[ValidationIssue] = []

    for path in paths:
        for link in extract_markdown_links(path):
            local_target = _local_link_target(link.target)
            if local_target is None:
                continue

            resolved = (link.source.parent / local_target).resolve()
            if not _is_within(resolved, repo_root):
                issues.append(
                    ValidationIssue(
                        "link-outside-repository",
                        link.source,
                        f"{link.line}행 링크가 저장소 밖을 가리킵니다: {link.target}",
                    )
                )
            elif not resolved.exists():
                issues.append(
                    ValidationIssue(
                        "broken-markdown-link",
                        link.source,
                        f"{link.line}행 링크 대상이 없습니다: {link.target}",
                    )
                )

    return issues


def parse_approval_records(queue_path: Path) -> list[ApprovalRecord]:
    """Approval Queue의 최상위 승인 항목을 읽는다."""

    visible_text = "\n".join(
        line for _, line in _visible_markdown_lines(read_text(queue_path))
    )
    headings = list(APPROVAL_HEADING_RE.finditer(visible_text))
    records: list[ApprovalRecord] = []

    for index, heading in enumerate(headings):
        end = headings[index + 1].start() if index + 1 < len(headings) else len(visible_text)
        block = visible_text[heading.end() : end]
        metadata = _first_metadata_block(block)
        metadata_id_match = APPROVAL_ID_RE.search(metadata)
        status_match = STATUS_RE.search(metadata)
        records.append(
            ApprovalRecord(
                heading_id=heading.group("id"),
                metadata_id=(
                    metadata_id_match.group("id") if metadata_id_match else None
                ),
                status=status_match.group("status") if status_match else None,
            )
        )

    return records


def validate_approval_records(queue_path: Path) -> list[ValidationIssue]:
    """승인 ID 중복과 제목/Metadata 일치를 검사한다."""

    if not queue_path.is_file():
        return [
            ValidationIssue(
                "missing-approval-queue",
                queue_path,
                "Approval Queue 파일이 없습니다.",
            )
        ]

    records = parse_approval_records(queue_path)
    issues: list[ValidationIssue] = []
    seen_ids: set[str] = set()

    for record in records:
        if record.heading_id in seen_ids:
            issues.append(
                ValidationIssue(
                    "duplicate-approval-id",
                    queue_path,
                    f"승인 ID가 중복되었습니다: {record.heading_id}",
                )
            )
        seen_ids.add(record.heading_id)

        if record.metadata_id is None:
            issues.append(
                ValidationIssue(
                    "missing-approval-metadata-id",
                    queue_path,
                    f"{record.heading_id}의 Metadata ID가 없습니다.",
                )
            )
        elif record.metadata_id != record.heading_id:
            issues.append(
                ValidationIssue(
                    "approval-id-mismatch",
                    queue_path,
                    f"제목 ID {record.heading_id}와 Metadata ID "
                    f"{record.metadata_id}가 다릅니다.",
                )
            )

        if record.status is None:
            issues.append(
                ValidationIssue(
                    "missing-approval-status",
                    queue_path,
                    f"{record.heading_id}의 Metadata 상태가 없습니다.",
                )
            )

    return issues


def extract_approval_references(path: Path) -> set[str]:
    """Decision Log 또는 Version History의 승인 참조를 추출한다."""

    if not path.is_file():
        return set()
    visible_text = "\n".join(
        line for _, line in _visible_markdown_lines(read_text(path))
    )
    return {
        match.group("id")
        for match in APPROVAL_REFERENCE_RE.finditer(visible_text)
    }


def validate_applied_approval_references(
    project: ProjectRecord,
    repo_root: Path,
) -> list[ValidationIssue]:
    """적용된 승인 항목에 결정·버전 기록이 모두 있는지 검사한다."""

    project_root = _resolve_repo_path(repo_root.resolve(), project.root)
    queue_path = project_root / "approvals/approval_queue.md"
    decision_path = project_root / "decisions/decision_log.md"
    version_path = project_root / "versions/version_history.md"

    if not queue_path.is_file():
        return [
            ValidationIssue(
                "missing-approval-queue",
                queue_path,
                "Approval Queue 파일이 없습니다.",
            )
        ]

    decision_references = extract_approval_references(decision_path)
    version_references = extract_approval_references(version_path)
    issues: list[ValidationIssue] = []

    for record in parse_approval_records(queue_path):
        if record.status != "applied":
            continue
        approval_id = record.heading_id

        if approval_id not in decision_references:
            issues.append(
                ValidationIssue(
                    "applied-approval-missing-decision",
                    decision_path,
                    f"적용된 승인 {approval_id}의 Decision Log 기록이 없습니다.",
                )
            )
        if approval_id not in version_references:
            issues.append(
                ValidationIssue(
                    "applied-approval-missing-version",
                    version_path,
                    f"적용된 승인 {approval_id}의 Version History 기록이 없습니다.",
                )
            )

    return issues


def validate_provenance_record(
    record: ProvenanceRecord,
    path: Path,
) -> list[ValidationIssue]:
    """사실·입력의 분류와 출처가 서로 일치하는지 검사한다."""

    issues: list[ValidationIssue] = []

    if not record.content.strip():
        issues.append(
            ValidationIssue(
                "missing-provenance-content",
                path,
                "출처를 검사할 사실·입력 내용이 비어 있습니다.",
            )
        )
    if record.category not in INFORMATION_CATEGORIES:
        issues.append(
            ValidationIssue(
                "invalid-provenance-category",
                path,
                f"허용되지 않은 사실·입력 분류입니다: {record.category or '(없음)'}",
            )
        )
    if record.origin not in INFORMATION_ORIGINS:
        issues.append(
            ValidationIssue(
                "missing-or-invalid-provenance-origin",
                path,
                f"허용되지 않거나 누락된 출처 유형입니다: {record.origin or '(없음)'}",
            )
        )
    if not record.evidence.strip():
        issues.append(
            ValidationIssue(
                "missing-provenance-evidence",
                path,
                "사실·입력의 발화 또는 파일 근거가 비어 있습니다.",
            )
        )

    if record.origin not in INFORMATION_ORIGINS:
        return issues

    if record.origin == "synthetic_test_fixture":
        if record.category != "test_fixture_assumption":
            issues.append(
                ValidationIssue(
                    "synthetic-misclassified-as-project-fact",
                    path,
                    "합성 테스트 데이터는 테스트 픽스처 가정으로만 분류할 수 "
                    "있습니다.",
                )
            )
        if TEST_FIXTURE_LABEL not in f"{record.content}\n{record.evidence}":
            issues.append(
                ValidationIssue(
                    "missing-synthetic-test-label",
                    path,
                    f"합성 테스트 데이터에 {TEST_FIXTURE_LABEL} 표시가 없습니다.",
                )
            )
        return issues

    if record.category == "test_fixture_assumption":
        issues.append(
            ValidationIssue(
                "test-fixture-category-origin-mismatch",
                path,
                "테스트 픽스처 가정의 출처 유형은 synthetic_test_fixture여야 "
                "합니다.",
            )
        )
    elif record.category == "user_fact" and record.origin not in {
        "current_user_input",
        "prior_user_input",
    }:
        issues.append(
            ValidationIssue(
                "user-fact-origin-mismatch",
                path,
                "user_fact는 현재 또는 이전 사용자 입력에서만 가져올 수 있습니다.",
            )
        )
    elif (
        record.category == "confirmed_fact"
        and record.origin != "confirmed_document"
    ):
        issues.append(
            ValidationIssue(
                "confirmed-fact-origin-mismatch",
                path,
                "confirmed_fact의 출처 유형은 confirmed_document여야 합니다.",
            )
        )
    elif record.category == "proposal_input" and record.origin != "proposal_input":
        issues.append(
            ValidationIssue(
                "proposal-input-origin-mismatch",
                path,
                "proposal_input 분류와 출처 유형이 일치해야 합니다.",
            )
        )

    return issues


def parse_behavior_test_manifest(manifest_path: Path) -> dict[str, str]:
    """Behavior Test Manifest의 한 줄 필드를 읽는다."""

    fields: dict[str, str] = {}
    for match in MANIFEST_FIELD_RE.finditer(read_text(manifest_path)):
        fields[match.group("key").strip()] = _strip_code_span(
            match.group("value").strip()
        )
    return fields


def validate_behavior_test_manifest(
    manifest_path: Path,
    repo_root: Path,
) -> list[ValidationIssue]:
    """합성 동작 테스트의 출처, 격리 경로와 결과 보고 계약을 검사한다."""

    if not manifest_path.is_file():
        return [
            ValidationIssue(
                "missing-behavior-test-manifest",
                manifest_path,
                "Behavior Test Manifest가 없습니다.",
            )
        ]

    text = read_text(manifest_path)
    fields = parse_behavior_test_manifest(manifest_path)
    issues: list[ValidationIssue] = []

    for field in REQUIRED_BEHAVIOR_MANIFEST_FIELDS:
        if not fields.get(field, "").strip():
            issues.append(
                ValidationIssue(
                    "missing-behavior-test-field",
                    manifest_path,
                    f"Behavior Test Manifest 필드가 비어 있습니다: {field}",
                )
            )

    first_content = next(
        (line.strip() for line in text.splitlines() if line.strip()),
        "",
    )
    if first_content != TEST_FIXTURE_LABEL:
        issues.append(
            ValidationIssue(
                "missing-synthetic-test-label",
                manifest_path,
                f"매니페스트의 첫 내용은 {TEST_FIXTURE_LABEL}이어야 합니다.",
            )
        )
    if fields.get("표시 라벨") != TEST_FIXTURE_LABEL:
        issues.append(
            ValidationIssue(
                "invalid-synthetic-test-label",
                manifest_path,
                "표시 라벨이 합성 테스트 표준과 일치하지 않습니다.",
            )
        )
    if fields.get("데이터 출처") != "synthetic_test_fixture":
        issues.append(
            ValidationIssue(
                "invalid-behavior-test-origin",
                manifest_path,
                "합성 동작 테스트의 데이터 출처는 synthetic_test_fixture여야 "
                "합니다.",
            )
        )

    environment = fields.get("실행 환경", "")
    if environment not in BEHAVIOR_TEST_ENVIRONMENTS:
        issues.append(
            ValidationIssue(
                "invalid-behavior-test-environment",
                manifest_path,
                f"허용되지 않은 실행 환경입니다: {environment or '(없음)'}",
            )
        )

    work_path_value = fields.get("실행 작업 경로", "")
    work_path = Path(work_path_value) if work_path_value else Path(".")
    temp_root = Path("/tmp").resolve()
    resolved_work_path = work_path.resolve()
    if (
        not work_path.is_absolute()
        or resolved_work_path == temp_root
        or not _is_within(resolved_work_path, temp_root)
    ):
        issues.append(
            ValidationIssue(
                "behavior-test-work-path-not-isolated",
                manifest_path,
                "실행 작업 경로는 /tmp 아래의 전용 절대경로여야 합니다.",
            )
        )

    if fields.get("허용된 쓰기") != "실행 작업 경로 내부만":
        issues.append(
            ValidationIssue(
                "behavior-test-write-scope-too-broad",
                manifest_path,
                "허용된 쓰기는 실행 작업 경로 내부로 제한해야 합니다.",
            )
        )
    if fields.get("원본 변경") != "없음":
        issues.append(
            ValidationIssue(
                "behavior-test-original-change-declared",
                manifest_path,
                "동작 테스트는 원본 변경 없음으로 계획해야 합니다.",
            )
        )
    if fields.get("실제 프로젝트 사실로 채택") != "아님":
        issues.append(
            ValidationIssue(
                "synthetic-test-adoption-forbidden",
                manifest_path,
                "합성 테스트 데이터는 실제 프로젝트 사실로 채택할 수 없습니다.",
            )
        )

    test_input = fields.get("테스트 입력", "")
    if test_input and not test_input.startswith(TEST_FIXTURE_LABEL):
        issues.append(
            ValidationIssue(
                "missing-synthetic-test-label",
                manifest_path,
                "테스트 입력은 합성 테스트 표시로 시작해야 합니다.",
            )
        )

    result_report = fields.get("결과 보고", "")
    for report_field in BEHAVIOR_REPORT_FIELDS:
        if report_field not in result_report:
            issues.append(
                ValidationIssue(
                    "missing-behavior-result-report-field",
                    manifest_path,
                    f"결과 보고에 필수 필드가 없습니다: {report_field}",
                )
            )

    fixture_source = fields.get("픽스처 원본", "")
    if fixture_source:
        resolved_source = _resolve_repo_path(repo_root.resolve(), fixture_source)
        if environment == "dedicated_fixture":
            fixture_root = (repo_root / "tests/fixtures/behavior").resolve()
            if (
                not _is_within(resolved_source, fixture_root)
                or not resolved_source.exists()
            ):
                issues.append(
                    ValidationIssue(
                        "invalid-dedicated-fixture-source",
                        manifest_path,
                        "dedicated_fixture 원본은 tests/fixtures/behavior 안의 "
                        "실제 경로여야 합니다.",
                    )
                )
        elif (
            environment == "temporary_project_copy"
            and fields.get("실제 프로젝트 복사 필요 이유") == "없음"
        ):
            issues.append(
                ValidationIssue(
                    "missing-temporary-copy-reason",
                    manifest_path,
                    "temporary_project_copy에는 실제 구조가 필요한 이유가 "
                    "있어야 합니다.",
                )
            )

    return issues


def format_issues(issues: list[ValidationIssue]) -> str:
    """테스트 실패 메시지로 읽기 좋은 문자열을 만든다."""

    if not issues:
        return "무결성 위반 없음"
    return "\n".join(str(issue) for issue in issues)


def _strip_code_span(value: str) -> str:
    value = value.strip()
    if len(value) >= 2 and value.startswith("`") and value.endswith("`"):
        return value[1:-1].strip()
    return value


def _resolve_repo_path(repo_root: Path, raw_path: str) -> Path:
    path = Path(raw_path)
    if path.is_absolute():
        return path.resolve()
    return (repo_root / path).resolve()


def _is_within(path: Path, parent: Path) -> bool:
    try:
        path.relative_to(parent)
    except ValueError:
        return False
    return True


def _visible_markdown_lines(text: str) -> list[tuple[int, str]]:
    """펜스 코드 블록을 제외하고 원래 행 번호를 유지한다."""

    visible: list[tuple[int, str]] = []
    active_fence: str | None = None

    for line_number, line in enumerate(text.splitlines(), start=1):
        fence_match = FENCE_RE.match(line)
        if fence_match:
            fence = fence_match.group("fence")
            marker = fence[0]
            if active_fence is None:
                active_fence = marker
                continue
            if marker == active_fence:
                active_fence = None
                continue

        if active_fence is None:
            visible.append((line_number, line))

    return visible


def _local_link_target(target: str) -> str | None:
    lowered = target.lower()
    if (
        not target
        or target.startswith("#")
        or lowered.startswith(("http://", "https://", "mailto:", "data:"))
        or target.startswith("//")
    ):
        return None

    path_part = target.split("#", 1)[0].split("?", 1)[0]
    return path_part or None


def _first_metadata_block(block: str) -> str:
    metadata_heading = re.search(r"^#### Metadata\s*$", block, re.MULTILINE)
    if not metadata_heading:
        return ""
    remaining = block[metadata_heading.end() :]
    next_heading = re.search(r"^#{1,4}\s+", remaining, re.MULTILINE)
    return remaining[: next_heading.start()] if next_heading else remaining

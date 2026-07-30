from pathlib import Path
from hashlib import sha256
import shutil
from tempfile import TemporaryDirectory
import unittest

from scripts.workspace_validation import (
    ProjectRecord,
    ProvenanceRecord,
    SPECIALIST_AGENT_TYPES,
    format_issues,
    navigation_markdown_files,
    parse_approval_records,
    parse_project_creative_agent_rule,
    validate_applied_approval_references,
    validate_approval_records,
    validate_behavior_test_manifest,
    validate_markdown_links,
    validate_project_creative_agents,
    validate_project_registry,
    validate_project_structure,
    validate_provenance_record,
)


REPO_ROOT = Path(__file__).resolve().parents[1]
REGISTRY_PATH = REPO_ROOT / "workspace/project_registry.md"


class WorkspaceFixture:
    """각 테스트가 독립적으로 바꿀 수 있는 최소 작업장."""

    def __init__(self, root: Path) -> None:
        self.root = root
        self.project_id = "sample-project"
        self.project_relative_root = f"workspace/projects/{self.project_id}/"
        self.project_root = self.root / self.project_relative_root
        self.registry_path = self.root / "workspace/project_registry.md"
        self.queue_path = self.project_root / "approvals/approval_queue.md"
        self.decision_path = self.project_root / "decisions/decision_log.md"
        self.version_path = self.project_root / "versions/version_history.md"
        self.creative_index_rows: list[str] = []
        self.creative_snapshot_rows: list[str] = []

    def create(self, approval_status: str = "applied") -> "WorkspaceFixture":
        self._write(self.root / "README.md", "# Fixture Workspace\n")
        self._write_registry([(self.project_id, self.project_relative_root)])

        for directory in (
            "design",
            "ideas",
            "approvals/assets",
            "decisions",
            "versions",
        ):
            (self.project_root / directory).mkdir(parents=True, exist_ok=True)

        self._write(
            self.project_root / "README.md",
            "# Sample Project\n\n[Brief](project_brief.md)\n",
        )
        self._write(self.project_root / "project_brief.md", "# Project Brief\n")
        self._write(
            self.project_root / "design/README.md",
            "# Design\n\n[Brief](../project_brief.md)\n",
        )
        self._write(
            self.project_root / "ideas/temporary_ideas.md",
            "# Temporary Ideas\n",
        )
        self._write_approval_queue(approval_status)
        self._write(
            self.decision_path,
            "# Decision Log\n\n"
            "## Entries\n\n"
            "- 관련 승인 큐: `APPR-20260724-001`\n",
        )
        self._write(
            self.version_path,
            "# Version History\n\n"
            "## Entries\n\n"
            "- 관련 승인 큐: `APPR-20260724-001`\n",
        )
        return self

    @property
    def project(self) -> ProjectRecord:
        return ProjectRecord(self.project_id, self.project_relative_root)

    def _write_registry(self, projects: list[tuple[str, str]]) -> None:
        rows = "\n".join(
            f"| `{project_id}` | 샘플 | Sample | active | `{root}` |"
            for project_id, root in projects
        )
        self._write(
            self.registry_path,
            "# Project Registry\n\n"
            "## Projects\n\n"
            "| 프로젝트 ID | 한국어명 | 영어명 | 상태 | 프로젝트 루트 |\n"
            "|---|---|---|---|---|\n"
            f"{rows}\n\n"
            "## Rules\n",
        )

    def _write_approval_queue(self, status: str) -> None:
        self._write(
            self.queue_path,
            "# Approval Queue\n\n"
            "## Applied\n\n"
            "### APPR-20260724-001: 샘플 승인\n\n"
            "#### Metadata\n\n"
            "- ID: APPR-20260724-001\n"
            f"- 상태: {status}\n\n"
            "#### Draft\n\n"
            "```markdown\n"
            "### APPR-19990101-999: 코드 예시 속 가짜 항목\n"
            "- ID: APPR-19990101-999\n"
            "- 상태: applied\n"
            "```\n",
        )

    def write_creative_rule(
        self,
        rule_slug: str = "system_creation",
        *,
        project_id: str | None = None,
        agent_id: str | None = None,
        canonical_role: str = "system",
        base_agent_type: str = "design_creative_planner",
        review_policy: str = "independent_high_risk",
        selector_type: str = "exact",
        target_path: str = "design/systems/core.md",
        operations: tuple[str, ...] | None = None,
        status: str = "active",
        version: int = 1,
        indexed: bool = True,
        missing_field: str | None = None,
    ) -> Path:
        project_id = project_id or self.project_id
        agent_id = agent_id or f"PCA-{project_id}-{rule_slug}"
        agents_root = self.project_root / "agents"
        rules_root = agents_root / "rules"
        rules_root.mkdir(parents=True, exist_ok=True)
        rule_path = rules_root / f"{rule_slug}.md"
        if operations is None:
            operations = (
                ("generate_options", "incorporate_selection")
                if base_agent_type == "design_creative_planner"
                else ("author", "revise", "restructure", "incorporate_selection")
            )

        metadata = {
            "프로젝트 창작 에이전트 ID": f"`{agent_id}`",
            "프로젝트 ID": f"`{project_id}`",
            "규칙 슬러그": f"`{rule_slug}`",
            "상태": f"`{status}`",
            "버전": f"`{version}`",
            "분야": "`sample_system`",
            "canonical document role": f"`{canonical_role}`",
            "경로 선택자": f"`{selector_type}`",
            "대상 경로": f"`{target_path}`",
            "허용 작업": f"`{', '.join(operations)}`",
            "기본 agent_type": f"`{base_agent_type}`",
            "검수 정책": f"`{review_policy}`",
        }
        if missing_field in metadata:
            metadata.pop(missing_field)
        metadata_text = "\n".join(
            f"- {key}: {value}" for key, value in metadata.items()
        )
        def rule_field(key: str, value: str) -> str:
            return "" if missing_field == key else f"- {key}: {value}\n"

        reviewer = (
            "scenario_reviewer"
            if base_agent_type in {"scenario_designer", "scenario_writer"}
            else (
                "design_creative_reviewer"
                if review_policy
                in {"independent_high_risk", "independent_always"}
                else "main"
            )
        )
        self._write(
            rule_path,
            "[TEST FIXTURE: SYNTHETIC]\n\n"
            "# Project Creative Agent Rule\n\n"
            "## Metadata\n\n"
            f"{metadata_text}\n\n"
            "## Applicability\n\n"
            f"{rule_field('적용 요청', '합성 시스템 창작')}"
            f"{rule_field('포함 범위', '합성 GAP')}"
            f"{rule_field('제외 범위', '합성 범위 밖 사실')}"
            f"{rule_field('중단 조건', '합성 근거 충돌')}\n"
            "## Authoring Procedure\n\n"
            f"{rule_field('입력 확인', '합성 입력 확인')}"
            f"{rule_field('출처 충돌·GAP 처리', '충돌은 중단하고 GAP은 분리')}"
            f"{rule_field('Draft·대안 작성 순서', 'Draft 뒤 대안 작성')}"
            f"{rule_field('검수·수정 반복', '필수 finding 해소까지 반복')}"
            f"{rule_field('완료 조건', '합성 검수 통과')}\n"
            "## Creative Direction\n\n"
            f"{rule_field('창작 목표', '합성 검증')}"
            f"{rule_field('기대 플레이 경험', '합성 경험')}"
            f"{rule_field('우선 원칙', '근거 우선')}"
            f"{rule_field('허용하는 판단', '합성 대안')}"
            f"{rule_field('핵심 tradeoff', '범위와 다양성')}"
            f"{rule_field('금지 요소', '미확정 사실 단정')}\n"
            "## Sources\n\n"
            f"{rule_field('필수 근거 파일', 'project_brief.md')}"
            f"{rule_field('출처 우선순위', '사용자 입력, 확정 문서')}"
            f"{rule_field('규칙이 소유하지 않는 canonical facts', '게임 사실')}"
            f"{rule_field('금지된 자료', '다른 프로젝트 자료')}\n"
            "## Authority Boundary\n\n"
            f"{rule_field('허용된 제안 범위', '합성 GAP 대안')}"
            f"{rule_field('임의 창작 금지', 'canonical fact')}"
            f"{rule_field('반드시 `TBD`로 둘 항목', '미확정 사실')}"
            f"{rule_field('별도 승인 제안으로 분리할 항목', 'canonical 변경')}\n"
            "## Output And Provenance\n\n"
            f"{rule_field('기대 산출물', '합성 대안')}"
            f"{rule_field('provenance 체계', 'CP-*')}"
            f"{rule_field('대안·Draft 처리', '선택 전 분리')}"
            f"{rule_field('수치 검증 조건', 'provisional')}\n"
            "## Review Contract\n\n"
            f"- 적용 검수 정책: `{review_policy}`\n"
            f"- reviewer: `{reviewer}`\n"
            f"{rule_field('필수 검수 항목', '합성 출처와 범위')}"
            f"{rule_field('통과 기준', '합성 검증')}"
            f"{rule_field('필수 수정 routing', '원 작성 agent로 반환')}\n"
            "## Rule Mismatch And Replanning\n\n"
            f"{rule_field('범위 불일치 상태', 'blocked_creative_rule_mismatch')}"
            f"{rule_field('규칙 참조 무결성 상태', 'blocked_creative_rule_integrity')}"
            f"{rule_field('과거 결과 처리', 'pinned_rule_grandfathered')}"
            f"{rule_field('자동 재검수', '금지')}"
            f"{rule_field('현재 규칙 재검수 조건', '사용자의 명시적 재검수 요청')}"
            f"{rule_field('자동 개정', '금지')}"
            f"{rule_field('개정 조건', '사용자의 명시적 요청')}\n"
            "## Change History\n\n| 버전 | 날짜 | 변경 |\n|---|---|---|\n"
            f"| {version} | 2026-07-31 | 합성 생성 |\n",
        )

        rule_link = (
            f"[규칙](rules/{rule_slug}.md)" if indexed else "색인 링크 없음"
        )
        self.creative_index_rows.append(
            f"| `{agent_id}` | `sample_system` | `{canonical_role}` | "
            f"`{selector_type}` | `{target_path}` | "
            f"`{', '.join(operations)}` | `{base_agent_type}` | "
            f"`{review_policy}` | {version} | `{status}` | {rule_link} |"
        )
        self._write_creative_index(agents_root)
        return rule_path

    def archive_creative_rule(
        self,
        rule_path: Path,
        *,
        indexed_sha256: str | None = None,
    ) -> Path:
        rule = parse_project_creative_agent_rule(rule_path)
        snapshot_path = (
            self.project_root
            / "agents/rules/archive"
            / rule.rule_slug
            / f"v{rule.version}.md"
        )
        snapshot_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(rule_path, snapshot_path)
        digest = indexed_sha256 or sha256(snapshot_path.read_bytes()).hexdigest()
        self.creative_snapshot_rows.append(
            f"| `{rule.agent_id}` | {rule.version} | `{digest}` | "
            f"[snapshot](rules/archive/{rule.rule_slug}/v{rule.version}.md) |"
        )
        self._write_creative_index(self.project_root / "agents")
        return snapshot_path

    def _write_creative_index(self, agents_root: Path) -> None:
        self._write(
            agents_root / "README.md",
            "[TEST FIXTURE: SYNTHETIC]\n\n"
            "# Project Creative Agents\n\n"
            f"- 프로젝트 ID: `{self.project_id}`\n\n"
            "## Rules\n\n"
            "| 프로젝트 창작 에이전트 ID | 분야 | canonical role | "
            "경로 선택자 | 대상 경로 | 허용 작업 | 기본 agent_type | "
            "검수 정책 | 버전 | 상태 | 규칙 |\n"
            "|---|---|---|---|---|---|---|---|---:|---|---|\n"
            f"{chr(10).join(self.creative_index_rows)}\n\n"
            "## Archived Rule Snapshots\n\n"
            "| 프로젝트 창작 에이전트 ID | 버전 | SHA-256 | snapshot |\n"
            "|---|---:|---|---|\n"
            f"{chr(10).join(self.creative_snapshot_rows) or '| `없음` |  |  |  |'}\n",
        )

    @staticmethod
    def _write(path: Path, text: str) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")


class ProjectRegistryTests(unittest.TestCase):
    def test_정상_레지스트리와_프로젝트_구조를_읽는다(self) -> None:
        with TemporaryDirectory() as temp_dir:
            fixture = WorkspaceFixture(Path(temp_dir)).create()

            projects, registry_issues = validate_project_registry(
                fixture.registry_path,
                fixture.root,
            )
            structure_issues = validate_project_structure(projects[0], fixture.root)

            self.assertEqual(1, len(projects))
            self.assertEqual([], registry_issues, format_issues(registry_issues))
            self.assertEqual([], structure_issues, format_issues(structure_issues))

    def test_빈_레지스트리를_실패로_판정한다(self) -> None:
        with TemporaryDirectory() as temp_dir:
            fixture = WorkspaceFixture(Path(temp_dir))
            fixture._write(
                fixture.registry_path,
                "# Project Registry\n\n## Projects\n\n## Rules\n",
            )

            projects, issues = validate_project_registry(
                fixture.registry_path,
                fixture.root,
            )

            self.assertEqual([], projects)
            self.assertEqual(["empty-registry"], [issue.code for issue in issues])

    def test_중복_프로젝트_ID를_실패로_판정한다(self) -> None:
        with TemporaryDirectory() as temp_dir:
            fixture = WorkspaceFixture(Path(temp_dir))
            fixture._write_registry(
                [
                    ("sample-project", "workspace/projects/sample-project/"),
                    ("sample-project", "workspace/projects/another-project/"),
                ]
            )

            _, issues = validate_project_registry(
                fixture.registry_path,
                fixture.root,
            )

            self.assertIn("duplicate-project-id", [issue.code for issue in issues])

    def test_저장소_프로젝트_영역_밖의_루트를_실패로_판정한다(self) -> None:
        with TemporaryDirectory() as temp_dir:
            fixture = WorkspaceFixture(Path(temp_dir))
            fixture._write_registry([("sample-project", "../outside-project/")])

            _, issues = validate_project_registry(
                fixture.registry_path,
                fixture.root,
            )

            self.assertEqual(
                ["project-root-outside-workspace"],
                [issue.code for issue in issues],
            )

    def test_필수_프로젝트_파일_누락을_실패로_판정한다(self) -> None:
        with TemporaryDirectory() as temp_dir:
            fixture = WorkspaceFixture(Path(temp_dir)).create()
            fixture.queue_path.unlink()

            issues = validate_project_structure(fixture.project, fixture.root)

            self.assertEqual(["missing-project-file"], [issue.code for issue in issues])
            self.assertIn("approval_queue.md", str(issues[0]))


class ProjectCreativeAgentRuleTests(unittest.TestCase):
    def test_창작_규칙이_없는_프로젝트도_정상이다(self) -> None:
        with TemporaryDirectory() as temp_dir:
            fixture = WorkspaceFixture(Path(temp_dir)).create()

            issues = validate_project_creative_agents(fixture.project, fixture.root)

            self.assertEqual([], issues, format_issues(issues))

    def test_유효한_분야별_창작_규칙을_읽는다(self) -> None:
        with TemporaryDirectory() as temp_dir:
            fixture = WorkspaceFixture(Path(temp_dir)).create()
            rule_path = fixture.write_creative_rule()

            rule = parse_project_creative_agent_rule(rule_path)
            issues = validate_project_creative_agents(fixture.project, fixture.root)

            self.assertEqual("PCA-sample-project-system_creation", rule.agent_id)
            self.assertEqual("independent_high_risk", rule.review_policy)
            self.assertEqual([], issues, format_issues(issues))

    def test_창작_규칙_필수_필드가_빠지면_실패한다(self) -> None:
        with TemporaryDirectory() as temp_dir:
            fixture = WorkspaceFixture(Path(temp_dir)).create()
            fixture.write_creative_rule(missing_field="검수 정책")

            issues = validate_project_creative_agents(fixture.project, fixture.root)

            self.assertIn(
                "missing-project-creative-rule-field",
                [issue.code for issue in issues],
            )

    def test_창작_규칙_작성_절차가_빠지면_실패한다(self) -> None:
        with TemporaryDirectory() as temp_dir:
            fixture = WorkspaceFixture(Path(temp_dir)).create()
            fixture.write_creative_rule(missing_field="Draft·대안 작성 순서")

            issues = validate_project_creative_agents(fixture.project, fixture.root)

            self.assertIn(
                "missing-project-creative-rule-field",
                [issue.code for issue in issues],
            )

    def test_다른_프로젝트_ID의_규칙을_실패로_판정한다(self) -> None:
        with TemporaryDirectory() as temp_dir:
            fixture = WorkspaceFixture(Path(temp_dir)).create()
            fixture.write_creative_rule(project_id="another-project")

            issues = validate_project_creative_agents(fixture.project, fixture.root)
            codes = [issue.code for issue in issues]

            self.assertIn("project-creative-rule-project-mismatch", codes)
            self.assertIn("invalid-project-creative-agent-id", codes)

    def test_시나리오_창작은_항상_독립_검수여야_한다(self) -> None:
        with TemporaryDirectory() as temp_dir:
            fixture = WorkspaceFixture(Path(temp_dir)).create()
            fixture.write_creative_rule(
                rule_slug="scenario_creation",
                canonical_role="scenario",
                base_agent_type="scenario_designer",
                review_policy="self_and_main",
            )

            issues = validate_project_creative_agents(fixture.project, fixture.root)

            self.assertIn(
                "scenario-independent-review-required",
                [issue.code for issue in issues],
            )

    def test_색인에_없는_창작_규칙을_실패로_판정한다(self) -> None:
        with TemporaryDirectory() as temp_dir:
            fixture = WorkspaceFixture(Path(temp_dir)).create()
            fixture.write_creative_rule(indexed=False)

            issues = validate_project_creative_agents(fixture.project, fixture.root)

            self.assertIn(
                "unindexed-project-creative-rule",
                [issue.code for issue in issues],
            )

    def test_중복_프로젝트_창작_에이전트_ID를_실패로_판정한다(self) -> None:
        with TemporaryDirectory() as temp_dir:
            fixture = WorkspaceFixture(Path(temp_dir)).create()
            first_rule = fixture.write_creative_rule()
            duplicate_id = parse_project_creative_agent_rule(first_rule).agent_id
            fixture.write_creative_rule(
                rule_slug="content_creation",
                agent_id=duplicate_id,
                canonical_role="content",
            )

            issues = validate_project_creative_agents(fixture.project, fixture.root)

            self.assertIn(
                "duplicate-project-creative-agent-id",
                [issue.code for issue in issues],
            )

    def test_색인의_모든_routing_메타데이터를_규칙과_대조한다(self) -> None:
        replacements = {
            0: "`PCA-sample-project-wrong`",
            1: "`wrong_domain`",
            2: "`content`",
            3: "`subtree`",
            4: "`design/content/`",
            5: "`incorporate_selection`",
            6: "`scenario_designer`",
            7: "`self_and_main`",
            8: "9",
            9: "`retired`",
        }
        for column, replacement in replacements.items():
            with self.subTest(column=column), TemporaryDirectory() as temp_dir:
                fixture = WorkspaceFixture(Path(temp_dir)).create()
                fixture.write_creative_rule()
                cells = fixture.creative_index_rows[0].strip("|").split("|")
                cells[column] = f" {replacement} "
                fixture.creative_index_rows[0] = f"|{'|'.join(cells)}|"
                fixture._write_creative_index(fixture.project_root / "agents")

                issues = validate_project_creative_agents(
                    fixture.project,
                    fixture.root,
                )

                self.assertIn(
                    "project-creative-index-metadata-mismatch",
                    [issue.code for issue in issues],
                )

    def test_exact와_subtree의_겹치는_active_규칙을_실패시킨다(self) -> None:
        with TemporaryDirectory() as temp_dir:
            fixture = WorkspaceFixture(Path(temp_dir)).create()
            fixture.write_creative_rule(
                rule_slug="system_tree",
                selector_type="subtree",
                target_path="design/systems/",
                operations=("generate_options",),
            )
            fixture.write_creative_rule(
                rule_slug="system_exact",
                selector_type="exact",
                target_path="design/systems/core.md",
                operations=("generate_options",),
            )

            issues = validate_project_creative_agents(fixture.project, fixture.root)

            self.assertIn(
                "overlapping-active-project-creative-rules",
                [issue.code for issue in issues],
            )

    def test_exact끼리와_subtree끼리의_중복도_실패시킨다(self) -> None:
        cases = (
            (
                "exact",
                "design/systems/core.md",
                "exact",
                "design/systems/core.md",
            ),
            (
                "subtree",
                "design/systems/",
                "subtree",
                "design/systems/combat/",
            ),
        )
        for left_type, left_path, right_type, right_path in cases:
            with self.subTest(
                left_type=left_type,
                right_type=right_type,
            ), TemporaryDirectory() as temp_dir:
                fixture = WorkspaceFixture(Path(temp_dir)).create()
                fixture.write_creative_rule(
                    rule_slug="left_rule",
                    selector_type=left_type,
                    target_path=left_path,
                    operations=("generate_options",),
                )
                fixture.write_creative_rule(
                    rule_slug="right_rule",
                    selector_type=right_type,
                    target_path=right_path,
                    operations=("generate_options",),
                )

                issues = validate_project_creative_agents(
                    fixture.project,
                    fixture.root,
                )

                self.assertIn(
                    "overlapping-active-project-creative-rules",
                    [issue.code for issue in issues],
                )

    def test_같은_경로라도_허용_작업이_다르면_공존한다(self) -> None:
        with TemporaryDirectory() as temp_dir:
            fixture = WorkspaceFixture(Path(temp_dir)).create()
            fixture.write_creative_rule(
                rule_slug="system_options",
                operations=("generate_options",),
            )
            fixture.write_creative_rule(
                rule_slug="system_selection",
                operations=("incorporate_selection",),
            )

            issues = validate_project_creative_agents(fixture.project, fixture.root)

            self.assertEqual([], issues, format_issues(issues))

    def test_같은_경로와_작업도_canonical_role이_다르면_공존한다(self) -> None:
        with TemporaryDirectory() as temp_dir:
            fixture = WorkspaceFixture(Path(temp_dir)).create()
            fixture.write_creative_rule(
                rule_slug="system_rule",
                canonical_role="system",
            )
            fixture.write_creative_rule(
                rule_slug="content_rule",
                canonical_role="content",
            )

            issues = validate_project_creative_agents(fixture.project, fixture.root)

            self.assertEqual([], issues, format_issues(issues))

    def test_retired_규칙은_active_범위_중복에서_제외한다(self) -> None:
        with TemporaryDirectory() as temp_dir:
            fixture = WorkspaceFixture(Path(temp_dir)).create()
            fixture.write_creative_rule(rule_slug="system_active")
            fixture.write_creative_rule(
                rule_slug="system_retired",
                status="retired",
            )

            issues = validate_project_creative_agents(fixture.project, fixture.root)

            self.assertEqual([], issues, format_issues(issues))

    def test_위험한_대상_경로와_agent_작업_불일치를_실패시킨다(self) -> None:
        with TemporaryDirectory() as temp_dir:
            fixture = WorkspaceFixture(Path(temp_dir)).create()
            fixture.write_creative_rule(
                target_path="../outside.md",
                base_agent_type="scenario_designer",
                canonical_role="scenario",
                review_policy="independent_always",
                operations=("dance",),
            )

            issues = validate_project_creative_agents(fixture.project, fixture.root)
            codes = [issue.code for issue in issues]

            self.assertIn("invalid-project-creative-target-path", codes)
            self.assertIn("invalid-project-creative-operations", codes)
            self.assertIn("project-creative-agent-operation-mismatch", codes)

    def test_이전_규칙_snapshot의_버전과_SHA를_검증한다(self) -> None:
        with TemporaryDirectory() as temp_dir:
            fixture = WorkspaceFixture(Path(temp_dir)).create()
            rule_path = fixture.write_creative_rule()
            fixture.archive_creative_rule(rule_path)
            fixture._write(
                rule_path,
                rule_path.read_text(encoding="utf-8").replace(
                    "- 버전: `1`",
                    "- 버전: `2`",
                    1,
                ),
            )
            cells = fixture.creative_index_rows[0].strip("|").split("|")
            cells[8] = " 2 "
            fixture.creative_index_rows[0] = f"|{'|'.join(cells)}|"
            fixture._write_creative_index(fixture.project_root / "agents")

            issues = validate_project_creative_agents(fixture.project, fixture.root)

            self.assertEqual([], issues, format_issues(issues))

    def test_archive_snapshot_변조를_실패시킨다(self) -> None:
        with TemporaryDirectory() as temp_dir:
            fixture = WorkspaceFixture(Path(temp_dir)).create()
            rule_path = fixture.write_creative_rule()
            snapshot_path = fixture.archive_creative_rule(rule_path)
            fixture._write(
                rule_path,
                rule_path.read_text(encoding="utf-8").replace(
                    "- 버전: `1`",
                    "- 버전: `2`",
                    1,
                ),
            )
            cells = fixture.creative_index_rows[0].strip("|").split("|")
            cells[8] = " 2 "
            fixture.creative_index_rows[0] = f"|{'|'.join(cells)}|"
            fixture._write_creative_index(fixture.project_root / "agents")
            fixture._write(
                snapshot_path,
                snapshot_path.read_text(encoding="utf-8") + "\n변조\n",
            )

            issues = validate_project_creative_agents(fixture.project, fixture.root)

            self.assertIn(
                "project-creative-snapshot-sha256-mismatch",
                [issue.code for issue in issues],
            )

    def test_색인에_없는_archive_snapshot을_실패시킨다(self) -> None:
        with TemporaryDirectory() as temp_dir:
            fixture = WorkspaceFixture(Path(temp_dir)).create()
            rule_path = fixture.write_creative_rule(version=2)
            snapshot_path = (
                fixture.project_root
                / "agents/rules/archive/system_creation/v1.md"
            )
            fixture._write(
                snapshot_path,
                rule_path.read_text(encoding="utf-8").replace(
                    "- 버전: `2`",
                    "- 버전: `1`",
                    1,
                ),
            )

            issues = validate_project_creative_agents(fixture.project, fixture.root)

            self.assertIn(
                "unindexed-project-creative-snapshot",
                [issue.code for issue in issues],
            )

    def test_agents_루트의_공통_창작_문서를_금지한다(self) -> None:
        with TemporaryDirectory() as temp_dir:
            fixture = WorkspaceFixture(Path(temp_dir)).create()
            fixture.write_creative_rule()
            fixture._write(
                fixture.project_root / "agents/creative_direction.md",
                "# 금지된 공통 창작 규칙\n",
            )

            issues = validate_project_creative_agents(fixture.project, fixture.root)

            self.assertIn(
                "project-creative-common-rule-forbidden",
                [issue.code for issue in issues],
            )


class MarkdownLinkTests(unittest.TestCase):
    def test_정상_탐색_문서의_링크가_통과한다(self) -> None:
        with TemporaryDirectory() as temp_dir:
            fixture = WorkspaceFixture(Path(temp_dir)).create()

            paths = navigation_markdown_files(fixture.root, [fixture.project])
            issues = validate_markdown_links(paths, fixture.root)

            self.assertEqual([], issues, format_issues(issues))

    def test_깨진_로컬_링크를_실패로_판정한다(self) -> None:
        with TemporaryDirectory() as temp_dir:
            fixture = WorkspaceFixture(Path(temp_dir)).create()
            fixture._write(
                fixture.project_root / "README.md",
                "# Sample\n\n[없는 문서](missing.md)\n",
            )

            paths = navigation_markdown_files(fixture.root, [fixture.project])
            issues = validate_markdown_links(paths, fixture.root)

            self.assertEqual(["broken-markdown-link"], [issue.code for issue in issues])
            self.assertIn("missing.md", str(issues[0]))

    def test_저장소_밖으로_나가는_링크를_실패로_판정한다(self) -> None:
        with TemporaryDirectory() as temp_dir:
            fixture = WorkspaceFixture(Path(temp_dir)).create()
            fixture._write(
                fixture.project_root / "README.md",
                "# Sample\n\n[외부 파일](../../../../outside.md)\n",
            )

            paths = navigation_markdown_files(fixture.root, [fixture.project])
            issues = validate_markdown_links(paths, fixture.root)

            self.assertEqual(
                ["link-outside-repository"],
                [issue.code for issue in issues],
            )

    def test_코드_블록과_외부_URL은_링크_검사에서_제외한다(self) -> None:
        with TemporaryDirectory() as temp_dir:
            fixture = WorkspaceFixture(Path(temp_dir)).create()
            fixture._write(
                fixture.project_root / "README.md",
                "# Sample\n\n"
                "[외부](https://example.com/not-checked)\n\n"
                "```markdown\n"
                "[예시](missing-example.md)\n"
                "```\n",
            )

            paths = navigation_markdown_files(fixture.root, [fixture.project])
            issues = validate_markdown_links(paths, fixture.root)

            self.assertEqual([], issues, format_issues(issues))


class ApprovalRecordTests(unittest.TestCase):
    def test_승인_제목과_Metadata_ID가_일치하면_통과한다(self) -> None:
        with TemporaryDirectory() as temp_dir:
            fixture = WorkspaceFixture(Path(temp_dir)).create()

            issues = validate_approval_records(fixture.queue_path)

            self.assertEqual([], issues, format_issues(issues))

    def test_승인_ID_중복을_실패로_판정한다(self) -> None:
        with TemporaryDirectory() as temp_dir:
            fixture = WorkspaceFixture(Path(temp_dir)).create()
            with fixture.queue_path.open("a", encoding="utf-8") as queue:
                queue.write(
                    "\n### APPR-20260724-001: 중복 승인\n\n"
                    "#### Metadata\n\n"
                    "- ID: APPR-20260724-001\n"
                    "- 상태: pending\n"
                )

            issues = validate_approval_records(fixture.queue_path)

            self.assertIn("duplicate-approval-id", [issue.code for issue in issues])

    def test_제목과_Metadata_ID_불일치를_실패로_판정한다(self) -> None:
        with TemporaryDirectory() as temp_dir:
            fixture = WorkspaceFixture(Path(temp_dir)).create()
            text = fixture.queue_path.read_text(encoding="utf-8")
            fixture.queue_path.write_text(
                text.replace(
                    "- ID: APPR-20260724-001",
                    "- ID: APPR-20260724-002",
                    1,
                ),
                encoding="utf-8",
            )

            issues = validate_approval_records(fixture.queue_path)

            self.assertEqual(["approval-id-mismatch"], [issue.code for issue in issues])

    def test_코드_블록_속_승인_예시는_항목으로_세지_않는다(self) -> None:
        with TemporaryDirectory() as temp_dir:
            fixture = WorkspaceFixture(Path(temp_dir)).create()

            records = parse_approval_records(fixture.queue_path)
            approval_issues = validate_approval_records(fixture.queue_path)

            self.assertEqual(1, len(records))
            self.assertEqual([], approval_issues, format_issues(approval_issues))


class AppliedApprovalReferenceTests(unittest.TestCase):
    def test_applied_승인에_결정과_버전_기록이_있으면_통과한다(self) -> None:
        with TemporaryDirectory() as temp_dir:
            fixture = WorkspaceFixture(Path(temp_dir)).create()

            issues = validate_applied_approval_references(
                fixture.project,
                fixture.root,
            )

            self.assertEqual([], issues, format_issues(issues))

    def test_applied_승인의_결정_기록_누락을_실패로_판정한다(self) -> None:
        with TemporaryDirectory() as temp_dir:
            fixture = WorkspaceFixture(Path(temp_dir)).create()
            fixture.decision_path.write_text("# Decision Log\n", encoding="utf-8")

            issues = validate_applied_approval_references(
                fixture.project,
                fixture.root,
            )

            self.assertEqual(
                ["applied-approval-missing-decision"],
                [issue.code for issue in issues],
            )
            self.assertIn("APPR-20260724-001", str(issues[0]))

    def test_applied_승인의_버전_기록_누락을_실패로_판정한다(self) -> None:
        with TemporaryDirectory() as temp_dir:
            fixture = WorkspaceFixture(Path(temp_dir)).create()
            fixture.version_path.write_text("# Version History\n", encoding="utf-8")

            issues = validate_applied_approval_references(
                fixture.project,
                fixture.root,
            )

            self.assertEqual(
                ["applied-approval-missing-version"],
                [issue.code for issue in issues],
            )
            self.assertIn("APPR-20260724-001", str(issues[0]))

    def test_pending_승인에는_결정과_버전_기록을_강제하지_않는다(self) -> None:
        with TemporaryDirectory() as temp_dir:
            fixture = WorkspaceFixture(Path(temp_dir)).create(approval_status="pending")
            fixture.decision_path.write_text("# Decision Log\n", encoding="utf-8")
            fixture.version_path.write_text("# Version History\n", encoding="utf-8")

            issues = validate_applied_approval_references(
                fixture.project,
                fixture.root,
            )

            self.assertEqual([], issues, format_issues(issues))


class BehaviorTestProvenanceTests(unittest.TestCase):
    def test_표시된_합성_데이터를_테스트_가정으로_분류하면_통과한다(
        self,
    ) -> None:
        record = ProvenanceRecord(
            content=(
                "[TEST FIXTURE: SYNTHETIC] "
                "샘플 마을의 종은 비가 올 때만 울린다."
            ),
            category="test_fixture_assumption",
            origin="synthetic_test_fixture",
            evidence="[TEST FIXTURE: SYNTHETIC] BT-SAMPLE-001",
        )

        issues = validate_provenance_record(record, Path("Task Packet"))

        self.assertEqual([], issues, format_issues(issues))

    def test_합성_데이터를_사용자_사실로_분류하면_실패한다(self) -> None:
        record = ProvenanceRecord(
            content="[TEST FIXTURE: SYNTHETIC] 샘플 설정",
            category="user_fact",
            origin="synthetic_test_fixture",
            evidence="[TEST FIXTURE: SYNTHETIC] BT-SAMPLE-001",
        )

        issues = validate_provenance_record(record, Path("Task Packet"))

        self.assertIn(
            "synthetic-misclassified-as-project-fact",
            [issue.code for issue in issues],
        )

    def test_현재_사용자_입력은_사용자_사실로_분류할_수_있다(self) -> None:
        record = ProvenanceRecord(
            content="사용자가 현재 발화에서 제공한 사실",
            category="user_fact",
            origin="current_user_input",
            evidence="현재 사용자 발화",
        )

        issues = validate_provenance_record(record, Path("Task Packet"))

        self.assertEqual([], issues, format_issues(issues))

    def test_출처가_누락되면_실패한다(self) -> None:
        record = ProvenanceRecord(
            content="출처 없는 문장",
            category="user_fact",
            origin="",
            evidence="",
        )

        issues = validate_provenance_record(record, Path("Task Packet"))
        codes = [issue.code for issue in issues]

        self.assertIn("missing-or-invalid-provenance-origin", codes)
        self.assertIn("missing-provenance-evidence", codes)

    def test_합성_데이터의_표시가_누락되면_실패한다(self) -> None:
        record = ProvenanceRecord(
            content="표시 없는 샘플 설정",
            category="test_fixture_assumption",
            origin="synthetic_test_fixture",
            evidence="BT-SAMPLE-001",
        )

        issues = validate_provenance_record(record, Path("Task Packet"))

        self.assertIn(
            "missing-synthetic-test-label",
            [issue.code for issue in issues],
        )


class BehaviorTestManifestTests(unittest.TestCase):
    MANIFEST_PATH = (
        REPO_ROOT / "tests/fixtures/behavior/synthetic_manifest.md"
    )

    def test_전용_합성_픽스처_매니페스트가_통과한다(self) -> None:
        issues = validate_behavior_test_manifest(self.MANIFEST_PATH, REPO_ROOT)

        self.assertEqual([], issues, format_issues(issues))

    def test_필수_결과_보고가_빠지면_실패한다(self) -> None:
        with TemporaryDirectory() as temp_dir:
            manifest = Path(temp_dir) / "manifest.md"
            text = self.MANIFEST_PATH.read_text(encoding="utf-8")
            manifest.write_text(
                text.replace(
                    "데이터 출처, 실행 환경, 원본 변경, 실제 프로젝트 사실로 채택",
                    "데이터 출처",
                ),
                encoding="utf-8",
            )

            issues = validate_behavior_test_manifest(manifest, REPO_ROOT)

            self.assertIn(
                "missing-behavior-result-report-field",
                [issue.code for issue in issues],
            )

    def test_저장소_안의_실행_경로를_선언하면_실패한다(self) -> None:
        with TemporaryDirectory() as temp_dir:
            manifest = Path(temp_dir) / "manifest.md"
            text = self.MANIFEST_PATH.read_text(encoding="utf-8")
            manifest.write_text(
                text.replace(
                    "/tmp/gamepm-behavior-sample",
                    str(REPO_ROOT / "workspace/projects/sample-game"),
                ),
                encoding="utf-8",
            )

            issues = validate_behavior_test_manifest(manifest, REPO_ROOT)

            self.assertIn(
                "behavior-test-work-path-not-isolated",
                [issue.code for issue in issues],
            )

    def test_합성_데이터를_실제_사실로_채택하면_실패한다(self) -> None:
        with TemporaryDirectory() as temp_dir:
            manifest = Path(temp_dir) / "manifest.md"
            text = self.MANIFEST_PATH.read_text(encoding="utf-8")
            manifest.write_text(
                text.replace(
                    "- 실제 프로젝트 사실로 채택: `아님`",
                    "- 실제 프로젝트 사실로 채택: `채택`",
                ),
                encoding="utf-8",
            )

            issues = validate_behavior_test_manifest(manifest, REPO_ROOT)

            self.assertIn(
                "synthetic-test-adoption-forbidden",
                [issue.code for issue in issues],
            )

    def test_실행_복사본을_바꿔도_전용_픽스처_원본은_그대로다(self) -> None:
        source = REPO_ROOT / "tests/fixtures/behavior/sample-game"
        before = {
            path.relative_to(source): path.read_bytes()
            for path in source.rglob("*")
            if path.is_file()
        }

        with TemporaryDirectory(dir="/tmp") as temp_dir:
            copied = Path(temp_dir) / "sample-game"
            shutil.copytree(source, copied)
            copied_brief = copied / "project_brief.md"
            copied_brief.write_text(
                copied_brief.read_text(encoding="utf-8")
                + "\n테스트 실행 복사본에서만 추가한 문장\n",
                encoding="utf-8",
            )

        after = {
            path.relative_to(source): path.read_bytes()
            for path in source.rglob("*")
            if path.is_file()
        }
        self.assertEqual(before, after)


class CurrentWorkspaceIntegrityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.projects, cls.registry_issues = validate_project_registry(
            REGISTRY_PATH,
            REPO_ROOT,
        )

    def test_현재_등록_프로젝트의_구조가_유효하다(self) -> None:
        issues = list(self.registry_issues)
        for project in self.projects:
            issues.extend(validate_project_structure(project, REPO_ROOT))

        self.assertEqual([], issues, format_issues(issues))

    def test_현재_프로젝트_창작_규칙과_snapshot이_유효하다(self) -> None:
        issues = []
        for project in self.projects:
            issues.extend(validate_project_creative_agents(project, REPO_ROOT))

        self.assertEqual([], issues, format_issues(issues))

    def test_현재_탐색_문서의_로컬_링크가_유효하다(self) -> None:
        paths = navigation_markdown_files(REPO_ROOT, self.projects)
        issues = validate_markdown_links(paths, REPO_ROOT)

        self.assertEqual([], issues, format_issues(issues))

    def test_현재_승인_ID가_유효하고_중복되지_않는다(self) -> None:
        issues = []
        for project in self.projects:
            queue_path = (
                REPO_ROOT
                / project.root
                / "approvals/approval_queue.md"
            )
            issues.extend(validate_approval_records(queue_path))

        self.assertEqual([], issues, format_issues(issues))

    def test_현재_applied_승인이_결정과_버전_기록에_연결된다(self) -> None:
        issues = []
        for project in self.projects:
            issues.extend(validate_applied_approval_references(project, REPO_ROOT))

        self.assertEqual([], issues, format_issues(issues))


class ApprovalSafetyContractTests(unittest.TestCase):
    def test_모호한_승인_표현은_미적용_안내를_요구한다(self) -> None:
        agents_rules = (REPO_ROOT / "AGENTS.md").read_text(encoding="utf-8")
        approval_workflow = (
            REPO_ROOT / "docs/workflows/approval_queue.md"
        ).read_text(encoding="utf-8")

        self.assertIn("Explicitly tell the user that nothing was", agents_rules)
        self.assertIn("keep the current\n  approval state unchanged", agents_rules)
        self.assertIn("아무 변경도 적용하지", approval_workflow)
        self.assertIn("현재 승인 상태를 유지", approval_workflow)
        self.assertIn("승인하고 적용해줘", approval_workflow)


class SpecialistAgentHandoffContractTests(unittest.TestCase):
    def test_전문_에이전트_호출은_완성된_인계와_none_fork를_요구한다(
        self,
    ) -> None:
        agents_rules = (REPO_ROOT / "AGENTS.md").read_text(encoding="utf-8")
        workflow = (
            REPO_ROOT / "docs/workflows/specialist_agent_handoff.md"
        ).read_text(encoding="utf-8")
        packet_template = (
            REPO_ROOT / "docs/templates/specialist_task_packet.md"
        ).read_text(encoding="utf-8")

        self.assertIn("complete Specialist Task Packet", agents_rules)
        self.assertIn('fork_turns: "none"', agents_rules)
        self.assertIn('omitted or `"all"`', agents_rules)
        self.assertIn("Required Specialist Task Packet", workflow)
        self.assertIn("Required Invocation Mode", workflow)
        self.assertIn("Main-Agent Return Check", workflow)
        self.assertIn("부모 대화 전체를 Task Packet에 복사하지 않는다", workflow)
        self.assertIn("같은 오류가 반복", workflow)
        self.assertIn("Task Packet 준비 단계에도", workflow)
        self.assertIn("전체 `design/` 트리를 열거", workflow)
        self.assertIn(
            "Approval Queue, 임시 아이디어, Decision Log와 Version History",
            workflow,
        )

        for required_section in (
            "## Routing",
            "## Project Creative Agent Rule",
            "## User Intent",
            "## Material Conversation Context",
            "## Authority Boundary",
            "## Sources And Inputs",
            "## Expected Handoff",
            "## Invocation",
        ):
            with self.subTest(section=required_section):
                self.assertIn(required_section, packet_template)

        for agent_name in SPECIALIST_AGENT_TYPES:
            with self.subTest(packet_target_agent=agent_name):
                self.assertIn(agent_name, packet_template)
                self.assertIn(agent_name, workflow)

    def test_모든_전문_에이전트는_누락된_인계를_차단한다(self) -> None:
        for agent_name in (
            "design_creative_planner",
            "design_creative_reviewer",
            "scenario_designer",
            "scenario_reviewer",
            "scenario_writer",
        ):
            with self.subTest(agent=agent_name):
                agent_config = (
                    REPO_ROOT / f".codex/agents/{agent_name}.toml"
                ).read_text(encoding="utf-8")

                self.assertIn(
                    "docs/workflows/specialist_agent_handoff.md",
                    agent_config,
                )
                self.assertIn("blocked_missing_handoff", agent_config)
                self.assertIn("Specialist Task Packet", agent_config)
                self.assertIn("Do not spawn further subagents", agent_config)

    def test_창작_전문_에이전트가_프로젝트_규칙_게이트를_검증한다(
        self,
    ) -> None:
        workflow = (
            REPO_ROOT / "docs/workflows/project_creative_agent_setup.md"
        ).read_text(encoding="utf-8")
        agents_rules = (REPO_ROOT / "AGENTS.md").read_text(encoding="utf-8")
        packet_template = (
            REPO_ROOT / "docs/templates/specialist_task_packet.md"
        ).read_text(encoding="utf-8")
        setup_template = (
            REPO_ROOT / "docs/templates/project_creative_agent_setup_plan.md"
        ).read_text(encoding="utf-8")

        for required_text in (
            "blocked_missing_creative_rule",
            "blocked_creative_rule_mismatch",
            "blocked_creative_rule_integrity",
            "Archived Rule Snapshots",
            "과거 결과를 자동 재검수·수정·무효화하지 않으며",
            "Automatic Setup Design",
            "에이전트가 보충한 항목",
            "사용자가 아무 메시지도 보내지 않은 상태에서 파일을 자동 저장하지 않는다",
            "`independent_high_risk`를",
            "구현 완료 보고",
        ):
            with self.subTest(text=required_text):
                self.assertIn(required_text, workflow)

        for required_text in (
            "immediately use",
            "ask only material preference questions",
            "disclosed conservative defaults",
            "report what was supplied",
            "do not persist that report in the PCA",
            "never revise it automatically",
            "Actual UI Plan mode is not required",
            "does not automatically invalidate",
        ):
            with self.subTest(agent_rule=required_text):
                self.assertIn(required_text, agents_rules)

        for required_text in (
            "## Field Guide And Decisions",
            "## Complete Rule Specification",
            "## Agent-Supplied Defaults",
            "## Persistence And Resume",
            "명시적 구현 요청",
        ):
            with self.subTest(setup_text=required_text):
                self.assertIn(required_text, setup_template)

        rule_template = (
            REPO_ROOT / "docs/templates/project_creative_agent_rule.md"
        ).read_text(encoding="utf-8")
        self.assertIn("## Authoring Procedure", rule_template)

        for required_text in (
            "프로젝트 창작 에이전트 ID",
            "규칙 경로",
            "규칙 버전",
            "규칙 SHA-256",
            "규칙 기준",
            "검수 정책",
        ):
            with self.subTest(packet_field=required_text):
                self.assertIn(required_text, packet_template)

        for agent_name in (
            "design_creative_planner",
            "design_creative_reviewer",
            "scenario_designer",
            "scenario_reviewer",
            "scenario_writer",
        ):
            with self.subTest(agent=agent_name):
                agent_config = (
                    REPO_ROOT / f".codex/agents/{agent_name}.toml"
                ).read_text(encoding="utf-8")
                self.assertIn("Project Creative Agent Rule", agent_config)
                self.assertIn("blocked_missing_creative_rule", agent_config)
                self.assertIn("blocked_creative_rule_mismatch", agent_config)
                self.assertIn("blocked_creative_rule_integrity", agent_config)


class BehaviorTestContractTests(unittest.TestCase):
    def test_동작_테스트_출처와_격리_규칙이_연결되어_있다(self) -> None:
        agents_rules = (REPO_ROOT / "AGENTS.md").read_text(encoding="utf-8")
        workflow = (
            REPO_ROOT / "docs/workflows/behavior_testing.md"
        ).read_text(encoding="utf-8")
        packet_template = (
            REPO_ROOT / "docs/templates/specialist_task_packet.md"
        ).read_text(encoding="utf-8")

        for required_text in (
            "[TEST FIXTURE: SYNTHETIC]",
            "synthetic_test_fixture",
            "blocked_test_provenance",
            "tests/fixtures/behavior/sample-game/",
            "데이터 출처",
            "실행 환경",
            "원본 변경",
            "실제 프로젝트 사실로 채택",
        ):
            with self.subTest(text=required_text):
                self.assertIn(required_text, agents_rules)
                self.assertIn(required_text, workflow)

        self.assertIn("사실·입력 출처", packet_template)
        self.assertIn("테스트 픽스처 가정", packet_template)
        self.assertIn("current_user_input", packet_template)
        self.assertIn("confirmed_document", packet_template)

    def test_모든_전문_에이전트가_테스트_출처_오류를_차단한다(self) -> None:
        for agent_name in (
            "design_creative_planner",
            "design_creative_reviewer",
            "scenario_designer",
            "scenario_reviewer",
            "scenario_writer",
        ):
            with self.subTest(agent=agent_name):
                agent_config = (
                    REPO_ROOT / f".codex/agents/{agent_name}.toml"
                ).read_text(encoding="utf-8")

                self.assertIn("blocked_test_provenance", agent_config)
                self.assertIn("[TEST FIXTURE: SYNTHETIC]", agent_config)
                self.assertIn("test_fixture_assumption", agent_config)
                self.assertIn("synthetic_test_fixture", agent_config)

    def test_사용자_보고에서_합성_설정을_사용자_사실로_부르지_않는다(
        self,
    ) -> None:
        workflow = (
            REPO_ROOT / "docs/workflows/behavior_testing.md"
        ).read_text(encoding="utf-8")

        self.assertIn(
            "“사용자가 제공한 설정”이 아니라 “테스트\n"
            "픽스처 가정에 대한 출력”",
            workflow,
        )


if __name__ == "__main__":
    unittest.main()

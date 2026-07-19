from __future__ import annotations

import argparse
import ast
import json
import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path


RUNTIME_ROOTS = (
    Path("product/apps/web/src"),
    Path("product/apps/api/src"),
    Path("product/scripts"),
)


@dataclass(frozen=True)
class FunctionInfo:
    key: str
    lines: int
    start: int


class FunctionCollector(ast.NodeVisitor):
    def __init__(self, relative_path: str) -> None:
        self.relative_path = relative_path
        self.scope: list[str] = []
        self.functions: list[FunctionInfo] = []

    def visit_ClassDef(self, node: ast.ClassDef) -> None:  # noqa: N802
        self.scope.append(node.name)
        self.generic_visit(node)
        self.scope.pop()

    def visit_FunctionDef(self, node: ast.FunctionDef) -> None:  # noqa: N802
        self._visit_function(node)

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef) -> None:  # noqa: N802
        self._visit_function(node)

    def _visit_function(self, node: ast.FunctionDef | ast.AsyncFunctionDef) -> None:
        qualified = ".".join((*self.scope, node.name))
        self.functions.append(
            FunctionInfo(
                key=f"{self.relative_path}#{qualified}",
                lines=(node.end_lineno or node.lineno) - node.lineno + 1,
                start=node.lineno,
            )
        )
        self.scope.append(node.name)
        self.generic_visit(node)
        self.scope.pop()


def relative(root: Path, path: Path) -> str:
    return path.relative_to(root).as_posix()


def runtime_files(root: Path) -> list[Path]:
    files: list[Path] = []
    for runtime_root in RUNTIME_ROOTS:
        absolute_root = root / runtime_root
        if not absolute_root.exists():
            continue
        for path in absolute_root.rglob("*"):
            if not path.is_file() or path.suffix not in {".py", ".ts", ".tsx"}:
                continue
            if ".test." in path.name or "__pycache__" in path.parts or "fixtures" in path.parts:
                continue
            files.append(path)
    return files


def python_functions(root: Path, files: list[Path]) -> list[FunctionInfo]:
    functions: list[FunctionInfo] = []
    for path in files:
        if path.suffix != ".py":
            continue
        collector = FunctionCollector(relative(root, path))
        collector.visit(ast.parse(path.read_text(encoding="utf-8"), filename=str(path)))
        functions.extend(collector.functions)
    return functions


def check_python_budgets(
    functions: list[FunctionInfo], policy: dict[str, object]
) -> list[str]:
    default = int(policy["defaults"]["pythonFunctionLines"])
    budgets: dict[str, dict[str, object]] = policy["pythonFunctionBudgets"]
    seen: set[str] = set()
    violations: list[str] = []
    for function in functions:
        budget = budgets.get(function.key)
        if budget:
            seen.add(function.key)
        maximum = int(budget["maxLines"]) if budget else default
        if function.lines > maximum:
            violations.append(
                f"{function.key}:{function.start} is {function.lines} lines (budget {maximum})."
            )
    for key, budget in budgets.items():
        if key not in seen:
            violations.append(f"Stale or missing Python budget: {key}.")
        if not str(budget.get("reason", "")).strip():
            violations.append(f"Python budget has no reason: {key}.")
    return violations


def check_literal_budgets(
    root: Path, files: list[Path], policy: dict[str, object]
) -> list[str]:
    violations: list[str] = []
    texts = {relative(root, path): path.read_text(encoding="utf-8") for path in files}
    literal_budgets: dict[str, dict[str, int]] = policy["literalBudgets"]
    for literal, allowed_files in literal_budgets.items():
        for file, text in texts.items():
            count = text.count(literal)
            allowed = int(allowed_files.get(file, 0))
            if count > allowed:
                violations.append(
                    f"{file} contains {literal!r} {count} time(s) (budget {allowed})."
                )
        for file, allowed in allowed_files.items():
            actual = texts.get(file, "").count(literal)
            if actual < int(allowed):
                violations.append(
                    f"Literal budget is stale: {file} {literal!r} is {actual}, budget {allowed}."
                )
    return violations


def check_fastapi_boundaries(
    root: Path, files: list[Path], policy: dict[str, object]
) -> list[str]:
    allowed = set(policy["fastapiImportBudgets"])
    violations: list[str] = []
    seen: set[str] = set()
    for path in files:
        if path.suffix != ".py":
            continue
        file = relative(root, path)
        tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
        imports_fastapi = any(
            isinstance(node, ast.ImportFrom) and (node.module or "").startswith("fastapi")
            or isinstance(node, ast.Import)
            and any(alias.name.startswith("fastapi") for alias in node.names)
            for node in ast.walk(tree)
        )
        if imports_fastapi:
            seen.add(file)
            if file not in allowed and "/routers/" not in file:
                violations.append(f"FastAPI import outside app/router boundary: {file}.")
    for file in allowed - seen:
        violations.append(f"Stale FastAPI import budget: {file}.")
    return violations


def run_web_check(root: Path, *, self_test: bool = False) -> int:
    pnpm = shutil.which("pnpm.cmd") or shutil.which("pnpm")
    if pnpm is None:
        print("pnpm executable was not found.", file=sys.stderr)
        return 1
    command = [
        pnpm,
        "--dir",
        str(root / "product/apps/web"),
        "exec",
        "node",
        str(root / "scripts/check_web_structure.mjs"),
        "--root",
        str(root),
    ]
    if self_test:
        command.append("--self-test")
    return subprocess.run(command, check=False).returncode


def self_test() -> int:
    source = "def too_large():\n" + "\n".join("    value = 1" for _ in range(81))
    collector = FunctionCollector("sample.py")
    collector.visit(ast.parse(source))
    policy = {
        "defaults": {"pythonFunctionLines": 80},
        "pythonFunctionBudgets": {},
    }
    violations = check_python_budgets(collector.functions, policy)
    if len(violations) != 1:
        print("Python structure checker self-test failed.", file=sys.stderr)
        return 1
    print("Python structure checker self-test passed.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path("."))
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--skip-web", action="store_true")
    args = parser.parse_args()
    root = args.root.resolve()
    if args.self_test:
        python_status = self_test()
        web_status = 0 if args.skip_web else run_web_check(root, self_test=True)
        return max(python_status, web_status)

    policy = json.loads(
        (root / ".harness/policies/code-structure-budget.json").read_text(encoding="utf-8")
    )
    files = runtime_files(root)
    violations = [
        *check_python_budgets(python_functions(root, files), policy),
        *check_literal_budgets(root, files, policy),
        *check_fastapi_boundaries(root, files, policy),
    ]
    if not args.skip_web and run_web_check(root) != 0:
        violations.append("Web structure checker reported violations.")
    if violations:
        print("Code structure check failed:", file=sys.stderr)
        for violation in violations:
            print(f"- {violation}", file=sys.stderr)
        return 1
    print(
        "Code structure check passed: "
        f"{len(files)} runtime file(s), "
        f"{len(policy['pythonFunctionBudgets'])} Python temporary budget(s)."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

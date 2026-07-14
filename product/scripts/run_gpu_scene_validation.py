"""Run a local-only Nerfstudio Gaussian Splat validation on a GPU server."""

from __future__ import annotations

import argparse
import hashlib
import importlib.metadata
import json
import os
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path

DEFAULT_IMAGE = "ghcr.io/nerfstudio-project/nerfstudio:1.1.5"
DEFAULT_CAPTURE = "storefront"
CAPTURE_CHOICES = ("storefront", "poster")
SOURCE_URL = "https://docs.nerf.studio/quickstart/existing_dataset.html"
RUNNER_MODES = ("host", "docker")


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()  # noqa: UP017


def container_path(workspace: Path, path: Path) -> str:
    relative = path.resolve().relative_to(workspace.resolve())
    return "/workspace/" + relative.as_posix()


def docker_prefix(workspace: Path, image: str) -> list[str]:
    command = [
        "docker",
        "run",
        "--rm",
        "--gpus",
        "all",
        "--shm-size=12gb",
        "-v",
        f"{workspace.resolve()}:/workspace",
        "-w",
        "/workspace",
    ]
    if hasattr(os, "getuid") and hasattr(os, "getgid"):
        command.extend(["--user", f"{os.getuid()}:{os.getgid()}"])
    return [*command, image]


def runner_prefix(workspace: Path, image: str, mode: str) -> list[str]:
    return docker_prefix(workspace, image) if mode == "docker" else []


def runner_path(workspace: Path, path: Path, mode: str) -> str:
    return container_path(workspace, path) if mode == "docker" else str(path)


def build_download_command(workspace: Path, image: str, capture_name: str, mode: str) -> list[str]:
    return [
        *runner_prefix(workspace, image, mode),
        "ns-download-data",
        "nerfstudio",
        f"--capture-name={capture_name}",
        "--save-dir",
        runner_path(workspace, workspace / "data", mode),
    ]


def build_train_command(
    workspace: Path,
    image: str,
    capture_name: str,
    max_iterations: int,
    mode: str,
) -> list[str]:
    training_dir = workspace / "training"
    data_dir = workspace / "data" / "nerfstudio" / capture_name
    return [
        *runner_prefix(workspace, image, mode),
        "ns-train",
        "splatfacto",
        "--output-dir",
        runner_path(workspace, training_dir, mode),
        "--max-num-iterations",
        str(max_iterations),
        "--vis",
        "tensorboard",
        "--data",
        runner_path(workspace, data_dir, mode),
    ]


def build_export_command(workspace: Path, image: str, config: Path, mode: str) -> list[str]:
    return [
        *runner_prefix(workspace, image, mode),
        "ns-export",
        "gaussian-splat",
        "--load-config",
        runner_path(workspace, config, mode),
        "--output-dir",
        runner_path(workspace, workspace / "export", mode),
    ]


def run(command: list[str], log_path: Path, input_text: str | None = None) -> None:
    with log_path.open("a", encoding="utf-8") as log:
        log.write(f"\n$ {' '.join(command)}\n")
        subprocess.run(
            command,
            cwd=log_path.parent,
            input=input_text,
            stdout=log,
            stderr=subprocess.STDOUT,
            text=True,
            check=True,
        )


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        while chunk := stream.read(1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


def package_version(name: str) -> str | None:
    try:
        return importlib.metadata.version(name)
    except importlib.metadata.PackageNotFoundError:
        return None


def latest_checkpoint_dir(workspace: Path) -> Path | None:
    checkpoints = list((workspace / "training").rglob("*.ckpt"))
    if not checkpoints:
        return None
    return max(checkpoints, key=lambda path: path.stat().st_mtime).parent


def require_server_tools(image: str, mode: str) -> str:
    tools = (
        ("docker", "nvidia-smi")
        if mode == "docker"
        else ("nvidia-smi", "ns-download-data", "ns-train", "ns-export")
    )
    for tool in tools:
        if not shutil.which(tool):
            raise RuntimeError(f"Required GPU server tool is missing: {tool}")
    gpu = (
        subprocess.run(
            ["nvidia-smi", "--query-gpu=name,memory.total", "--format=csv,noheader,nounits"],
            capture_output=True,
            text=True,
            check=True,
        )
        .stdout.splitlines()[0]
        .strip()
    )
    if mode == "docker":
        image_check = subprocess.run(
            ["docker", "image", "inspect", image],
            capture_output=True,
            text=True,
            check=False,
        )
        if image_check.returncode != 0:
            raise RuntimeError(f"Docker image is missing. Run: docker pull {image}")
    return gpu


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Train and export an official Nerfstudio sample on a GPU server."
    )
    parser.add_argument("--workspace", type=Path, default=Path("scene-validation"))
    parser.add_argument("--mode", choices=RUNNER_MODES, default="docker")
    parser.add_argument("--image", default=DEFAULT_IMAGE)
    parser.add_argument("--capture-name", default=DEFAULT_CAPTURE, choices=CAPTURE_CHOICES)
    parser.add_argument("--max-iterations", type=int, default=3_000)
    parser.add_argument("--skip-download", action="store_true")
    parser.add_argument("--resume-latest", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.max_iterations < 1:
        raise ValueError("--max-iterations must be at least 1.")
    workspace = args.workspace.resolve()
    workspace.mkdir(parents=True, exist_ok=True)
    log_path = workspace / "validation.log"
    download = build_download_command(workspace, args.image, args.capture_name, args.mode)
    train = build_train_command(
        workspace,
        args.image,
        args.capture_name,
        args.max_iterations,
        args.mode,
    )
    resumed_from = latest_checkpoint_dir(workspace) if args.resume_latest else None
    if args.resume_latest:
        if resumed_from is None:
            raise RuntimeError("--resume-latest requires an existing checkpoint.")
        train.extend(["--load-dir", runner_path(workspace, resumed_from, args.mode)])
    if args.dry_run:
        print(
            json.dumps(
                {"download": None if args.skip_download else download, "train": train},
                indent=2,
            )
        )
        return 0

    gpu = require_server_tools(args.image, args.mode)
    data_dir = workspace / "data" / "nerfstudio" / args.capture_name
    if args.skip_download:
        if not (data_dir / "transforms.json").is_file():
            raise RuntimeError(f"Prepared dataset is missing: {data_dir}")
    else:
        run(download, log_path)
    run(train, log_path, input_text="y\n")
    configs = list((workspace / "training").rglob("config.yml"))
    if not configs:
        raise RuntimeError("Training finished without config.yml. Inspect validation.log.")
    latest_config = max(configs, key=lambda path: path.stat().st_mtime)
    export_dir = workspace / "export"
    shutil.rmtree(export_dir, ignore_errors=True)
    export_dir.mkdir(parents=True, exist_ok=True)
    export = build_export_command(workspace, args.image, latest_config, args.mode)
    run(export, log_path)
    ply_files = sorted((workspace / "export").glob("*.ply"))
    if not ply_files:
        raise RuntimeError("Export finished without a PLY file. Inspect validation.log.")
    scene_path = workspace / "export" / "scene.ply"
    if ply_files[0] != scene_path:
        shutil.copy2(ply_files[0], scene_path)
    final_checkpoints = list((workspace / "training").rglob("step-*.ckpt"))
    final_checkpoint = (
        max(final_checkpoints, key=lambda path: path.stat().st_mtime) if final_checkpoints else None
    )
    final_step = int(final_checkpoint.stem.removeprefix("step-")) if final_checkpoint else None
    report = {
        "completed_at": utc_now(),
        "local_validation_only": True,
        "source": {"provider": "Nerfstudio", "capture": args.capture_name, "url": SOURCE_URL},
        "worker": {
            "gpu": gpu,
            "mode": args.mode,
            "image": args.image if args.mode == "docker" else None,
        },
        "training": {
            "method": "splatfacto",
            "requested_iterations": args.max_iterations,
            "final_checkpoint_step": final_step,
        },
        "runtime": {
            "nerfstudio": package_version("nerfstudio"),
            "gsplat": package_version("gsplat"),
            "torch_cuda_arch_list": os.environ.get("TORCH_CUDA_ARCH_LIST"),
            "torch_compile_disabled": os.environ.get("TORCH_COMPILE_DISABLE") == "1",
        },
        "resumed_from": str(resumed_from) if resumed_from else None,
        "asset": {
            "path": str(scene_path),
            "size_bytes": scene_path.stat().st_size,
            "sha256": sha256(scene_path),
        },
    }
    (workspace / "validation-report.json").write_text(
        json.dumps(report, ensure_ascii=True, indent=2) + "\n", encoding="utf-8"
    )
    print(scene_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

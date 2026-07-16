#!/usr/bin/env python3
"""Executable entrypoint for the package-private Codex Python bridge."""

from __future__ import annotations

import sys
from pathlib import Path


sys.dont_write_bytecode = True
BRIDGE_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(BRIDGE_ROOT))
DEFAULT_SITE_PACKAGES = BRIDGE_ROOT.parent / "site-packages"
if DEFAULT_SITE_PACKAGES.is_dir():
    sys.path.insert(0, str(DEFAULT_SITE_PACKAGES))

from ay_ple_codex_bridge.cli import main  # noqa: E402


if __name__ == "__main__":
    raise SystemExit(main())

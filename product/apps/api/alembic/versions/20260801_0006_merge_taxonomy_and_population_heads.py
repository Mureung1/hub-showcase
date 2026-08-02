"""Merge the independent taxonomy and market-population migration heads.

Revision ID: 20260801_0006
Revises: 20260716_0007, 20260801_0005
Create Date: 2026-08-01
"""

from collections.abc import Sequence


revision: str = "20260801_0006"
down_revision: tuple[str, str] = ("20260716_0007", "20260801_0005")
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass

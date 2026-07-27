"""그래프 층 분리 행 수준 정책.

정의는 docs/permission-matrix.md 5.2를 따른다.

Revision ID: 0005_graph_policies
Revises: 0004_component_grants
"""

from __future__ import annotations

from pathlib import Path

from alembic import op

revision = "0005_graph_policies"
down_revision = "0004_component_grants"
branch_labels = None
depends_on = None

SQL_DIR = Path(__file__).resolve().parents[1] / "sql"


def upgrade() -> None:
    op.execute((SQL_DIR / "0005_graph_policies.sql").read_text(encoding="utf-8"))


def downgrade() -> None:
    op.execute(
        """
        DO $$
        DECLARE p record;
        BEGIN
          FOR p IN SELECT policyname, tablename FROM pg_policies
                   WHERE schemaname = 'public'
                     AND tablename IN ('knowledge_nodes','knowledge_edges')
          LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I', p.policyname, p.tablename);
          END LOOP;
        END $$;
        """
    )
    op.execute("ALTER TABLE knowledge_nodes DISABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE knowledge_edges DISABLE ROW LEVEL SECURITY")

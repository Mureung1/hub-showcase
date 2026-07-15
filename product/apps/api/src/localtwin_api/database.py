"""SQLAlchemy engine and session boundaries for the product database."""

from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager

from sqlalchemy import Engine, MetaData, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION)


def normalize_postgresql_url(database_url: str) -> str:
    normalized = database_url.strip()
    if normalized.lower().startswith("postgresql://"):
        return "postgresql+psycopg://" + normalized[len("postgresql://") :]
    if normalized.lower().startswith("postgresql+psycopg://"):
        return normalized
    raise ValueError("The product database must use PostgreSQL with Psycopg 3.")


def create_database_engine(database_url: str, *, require_postgresql: bool = True) -> Engine:
    normalized = normalize_postgresql_url(database_url) if require_postgresql else database_url
    return create_engine(normalized, pool_pre_ping=True)


def create_session_factory(engine: Engine) -> sessionmaker[Session]:
    return sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


@contextmanager
def session_scope(factory: sessionmaker[Session]) -> Iterator[Session]:
    session = factory()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

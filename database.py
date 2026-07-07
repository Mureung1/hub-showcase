# database.py
import os
from sqlalchemy import (
    create_engine, Column, Integer, String, Text, Enum, JSON, DateTime, ForeignKey, func,
)
from sqlalchemy.orm import sessionmaker, declarative_base, relationship

DB_URL = "sqlite:///./mystery_shopper.db"

# SQLite의 동시성 접근 및 스레딩 문제를 완전히 방지하는 옵션
engine = create_engine(DB_URL, connect_args={"check_same_thread": False}, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Competitor(Base):
    __tablename__ = "competitors"

    # SQLite에서 autoincrement가 완벽하게 무조건 작동하도록 기본 Integer 타입으로 강제 매핑합니다.
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    category = Column(String(50), nullable=True)
    address = Column(String(255), nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    reviews = relationship("Review", back_populates="competitor", cascade="all, delete-orphan")


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    competitor_id = Column(Integer, ForeignKey("competitors.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    sentiment = Column(Enum("긍정", "부정"), nullable=True)
    keywords = Column(JSON, nullable=True)
    summary = Column(String(255), nullable=True)
    analyzed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    competitor = relationship("Competitor", back_populates="reviews")


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
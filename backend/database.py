import os
from sqlalchemy import (
    create_engine, Column, BigInteger, Integer, String, Text, Enum, JSON, DateTime, ForeignKey, Float,
    UniqueConstraint, func,
)
from sqlalchemy.orm import sessionmaker, declarative_base, relationship

DB_URL = os.getenv("DB_URL", "sqlite:///./mystery_shopper.db")

engine = create_engine(DB_URL, connect_args={"check_same_thread": False} if DB_URL.startswith("sqlite") else {}, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class MyStore(Base):
    __tablename__ = "my_stores"
    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    name = Column(String(255), nullable=False)
    latitude = Column(String(50), nullable=True)
    longitude = Column(String(50), nullable=True)
    category = Column(String(100), nullable=True)
    address = Column(String(255), nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())

class Competitor(Base):
    __tablename__ = "competitors"
    __table_args__ = (
        UniqueConstraint("name", "source_store_name", name="uq_competitor_name_source"),
    )

    id = Column(BigInteger, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    category = Column(String(50), nullable=True)
    address = Column(String(255), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    distance_km = Column(Float, nullable=True)
    source_store_name = Column(String(255), nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    reviews = relationship("Review", back_populates="competitor", cascade="all, delete-orphan")


class Review(Base):
    __tablename__ = "reviews"

    id = Column(BigInteger, primary_key=True, index=True)
    competitor_id = Column(BigInteger, ForeignKey("competitors.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    sentiment = Column(Enum("긍정", "부정", name="sentiment_enum"), nullable=True)
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
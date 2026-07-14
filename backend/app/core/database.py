import logging

from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine, AsyncSession
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

logger = logging.getLogger(__name__)

engine = create_async_engine(settings.DATABASE_URL, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with async_session() as session:
        yield session


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with engine.begin() as conn:
        for stmt in _migrations():
            try:
                await conn.execute(text(stmt))
                logger.info("Migration applied: %s", stmt[:80])
            except Exception as e:
                logger.info("Migration skipped (likely already applied): %s", e)


def _migrations() -> list[str]:
    return [
        "ALTER TABLE business_plans ADD COLUMN competitors_count INTEGER NOT NULL DEFAULT 0",
    ]

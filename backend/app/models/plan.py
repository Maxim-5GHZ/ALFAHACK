from sqlalchemy import String, Float, Integer, Text, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class BusinessPlan(Base):
    __tablename__ = "business_plans"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id"), unique=True, nullable=False
    )
    niche: Mapped[str] = mapped_column(String(255), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    monthly_revenue: Mapped[float] = mapped_column(Float, nullable=False)
    monthly_expenses: Mapped[float] = mapped_column(Float, nullable=False)
    payback_months: Mapped[int] = mapped_column(Integer, nullable=False)
    expenses_json: Mapped[list[dict]] = mapped_column(JSONB, nullable=False, default=list)
    action_plan_json: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    alfa_products_json: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    competitors_count: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")

    project: Mapped["Project"] = relationship(back_populates="business_plan")  # noqa: F821

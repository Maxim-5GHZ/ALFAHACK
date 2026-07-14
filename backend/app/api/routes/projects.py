import re
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.project import Project
from app.models.chat import ChatMessage
from app.models.plan import BusinessPlan
from app.models.user import User
from app.schemas.project import ProjectResponse
from app.schemas.chat import ChatMessageCreate, ChatMessageResponse
from app.schemas.business_plan import BusinessPlanResponse
from app.api.routes.auth import get_current_user
from app.services.gigachat_service import GigaChatService
from app.services.yandex_maps_service import YandexMapsService

router = APIRouter(prefix="/projects", tags=["projects"])

gigachat = GigaChatService()
yandex_maps = YandexMapsService()


@router.get("", response_model=list[ProjectResponse])
async def list_projects(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Project).where(Project.user_id == current_user.id).order_by(Project.created_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = Project(user_id=current_user.id)
    db.add(project)
    await db.commit()
    await db.refresh(project)

    welcome = await gigachat.get_chat_reply([], current_user.username)
    welcome_msg = ChatMessage(project_id=project.id, role="ai", content=welcome)
    db.add(welcome_msg)
    await db.commit()

    return project


@router.get("/{project_id}/messages", response_model=list[ChatMessageResponse])
async def get_messages(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _get_user_project(project_id, current_user.id, db)
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.project_id == project.id)
        .order_by(ChatMessage.created_at.asc())
    )
    return result.scalars().all()


@router.post("/{project_id}/chat", response_model=ChatMessageResponse)
async def chat(
    project_id: int,
    body: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _get_user_project(project_id, current_user.id, db)

    user_msg = ChatMessage(project_id=project.id, role="user", content=body.text)
    db.add(user_msg)
    await db.commit()
    await db.refresh(user_msg)

    history_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.project_id == project.id)
        .order_by(ChatMessage.created_at.asc())
    )
    history = [
        {"role": m.role, "content": m.content}
        for m in history_result.scalars().all()
    ]

    reply = await gigachat.get_chat_reply(history, current_user.username)

    ai_msg = ChatMessage(project_id=project.id, role="ai", content=reply)
    db.add(ai_msg)
    await db.commit()
    await db.refresh(ai_msg)

    if project.title == "Новая идея":
        project.title = body.text[:50]
        await db.commit()

    return ai_msg


@router.post("/{project_id}/generate-plan", response_model=BusinessPlanResponse)
async def generate_plan(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _get_user_project(project_id, current_user.id, db)

    existing = await db.execute(
        select(BusinessPlan).where(BusinessPlan.project_id == project.id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Business plan already generated for this project",
        )

    history_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.project_id == project.id)
        .order_by(ChatMessage.created_at.asc())
    )
    history = [
        {"role": m.role, "content": m.content}
        for m in history_result.scalars().all()
    ]

    user_text_block = " ".join([m["content"] for m in history if m["role"] == "user"])

    city = "Казань"
    city_match = re.search(r"(в|из|по)\s+([А-Я][а-я\-]+)", user_text_block)
    if city_match:
        city = city_match.group(2)
    elif "калуг" in user_text_block.lower():
        city = "Калуга"
    elif "москв" in user_text_block.lower():
        city = "Москва"
    elif "питер" in user_text_block.lower() or "спб" in user_text_block.lower():
        city = "Санкт-Петербург"

    niche_query = "кофейня"
    if any(k in user_text_block.lower() for k in ["маникюр", "ногти", "бьюти", "салон"]):
        niche_query = "салон красоты"
    elif any(k in user_text_block.lower() for k in ["одежд", "шоп", "магазин"]):
        niche_query = "магазин одежды"

    competitors_count = await yandex_maps.get_competitor_count(niche_query, city)

    data = await gigachat.generate_business_plan_json(history, current_user.username)

    plan = BusinessPlan(
        project_id=project.id,
        niche=data.get("niche", ""),
        summary=data.get("summary", ""),
        monthly_revenue=data.get("monthly_revenue", 0),
        monthly_expenses=data.get("monthly_expenses", 0),
        payback_months=data.get("payback_months", 0),
        expenses_json=data.get("expenses", []),
        action_plan_json=data.get("action_plan", []),
        alfa_products_json=data.get("alfa_products", []),
        competitors_count=competitors_count,
    )
    db.add(plan)
    await db.commit()
    await db.refresh(plan)

    return _plan_to_response(plan)


@router.get("/{project_id}/plan", response_model=BusinessPlanResponse)
async def get_plan(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_user_project(project_id, current_user.id, db)

    result = await db.execute(
        select(BusinessPlan).where(BusinessPlan.project_id == project_id)
    )
    plan = result.scalar_one_or_none()
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")
    return _plan_to_response(plan)


async def _get_user_project(project_id: int, user_id: int, db: AsyncSession) -> Project:
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == user_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


def _plan_to_response(plan: BusinessPlan) -> BusinessPlanResponse:
    return BusinessPlanResponse(
        niche=plan.niche,
        summary=plan.summary,
        monthly_revenue=plan.monthly_revenue,
        monthly_expenses=plan.monthly_expenses,
        payback_months=plan.payback_months,
        expenses=plan.expenses_json,
        action_plan=plan.action_plan_json,
        alfa_products=plan.alfa_products_json,
        competitors_count=plan.competitors_count,
    )

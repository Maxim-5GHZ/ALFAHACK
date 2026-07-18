import re
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import delete as sa_delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.project import Project
from app.models.chat import ChatMessage
from app.models.plan import BusinessPlan
from app.models.user import User
from app.schemas.project import ProjectResponse, ProjectUpdate, ProjectFromDraftRequest
from app.schemas.chat import ChatMessageCreate, ChatMessageResponse
from app.schemas.business_plan import BusinessPlanResponse
from app.api.routes.auth import get_current_user
from app.services.gigachat_service import GigaChatService, _extract_city, _extract_budget, _detect_niche
from app.services.yandex_maps_service import YandexMapsService

router = APIRouter(prefix="/projects", tags=["projects"])


class StepCompleteRequest(BaseModel):
    step_text: str
    is_completed: bool

gigachat = GigaChatService()
yandex_maps = YandexMapsService()


class DraftChatRequest(BaseModel):
    messages: list[dict[str, str]]
    text: str


@router.post("/chat/draft")
async def draft_chat(
    body: DraftChatRequest,
    current_user: User = Depends(get_current_user),
):
    history = body.messages + [{"role": "user", "content": body.text}]
    reply = await gigachat.get_chat_reply(history, current_user.username)
    return {"reply": reply}


@router.get("", response_model=list[ProjectResponse])
async def list_projects(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Project)
        .options(selectinload(Project.business_plan))
        .where(Project.user_id == current_user.id)
        .order_by(Project.created_at.desc())
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
    welcome_msg = ChatMessage(project_id=project.id, role="ai", content=welcome, thread_id="workspace")
    db.add(welcome_msg)
    await db.commit()

    result = await db.execute(
        select(Project)
        .options(selectinload(Project.business_plan))
        .where(Project.id == project.id)
    )
    return result.scalar_one()


@router.post("/from-draft", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project_from_draft(
    body: ProjectFromDraftRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = Project(user_id=current_user.id, title=body.title)
    db.add(project)
    await db.commit()
    await db.refresh(project)

    for msg in body.messages:
        db_msg = ChatMessage(
            project_id=project.id,
            role=msg.role,
            content=msg.content,
            thread_id="workspace"
        )
        db.add(db_msg)

    all_user_texts = [m.content for m in body.messages if m.role == "user"]
    project_summary = _build_chat_summary(all_user_texts, None)
    project.chat_summary_json = project_summary

    await db.commit()

    result = await db.execute(
        select(Project)
        .options(selectinload(Project.business_plan))
        .where(Project.id == project.id)
    )
    return result.scalar_one()


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int,
    body: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _get_user_project(project_id, current_user.id, db)

    if body.title is not None:
        project.title = body.title
    if body.industry is not None:
        project.industry = body.industry

    await db.commit()
    await db.refresh(project)

    result = await db.execute(
        select(Project)
        .options(selectinload(Project.business_plan))
        .where(Project.id == project.id)
    )
    return result.scalar_one()


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

    user_msg = ChatMessage(project_id=project.id, role="user", content=body.text, thread_id=body.thread_id)
    db.add(user_msg)
    await db.commit()
    await db.refresh(user_msg)

    all_user_result = await db.execute(
        select(ChatMessage.content)
        .where(ChatMessage.project_id == project.id, ChatMessage.role == "user")
    )
    all_user_texts = [row[0] for row in all_user_result.all()]

    plan_result = await db.execute(select(BusinessPlan).where(BusinessPlan.project_id == project.id))
    plan_obj = plan_result.scalar_one_or_none()
    plan_data = {
        "niche": plan_obj.niche,
        "monthly_revenue": plan_obj.monthly_revenue,
        "completed_steps_json": plan_obj.completed_steps_json,
        "action_plan_json": plan_obj.action_plan_json
    } if plan_obj else None

    project_summary = _build_chat_summary(all_user_texts, plan_data)
    project.chat_summary_json = project_summary
    await db.commit()

    agent_role = "general"
    if body.thread_id.startswith("thread_financier"):
        agent_role = "financier"
    elif body.thread_id.startswith("thread_marketer"):
        agent_role = "marketer"
    elif body.thread_id.startswith("thread_accountant"):
        agent_role = "accountant"
    elif body.thread_id.startswith("thread_lawyer"):
        agent_role = "lawyer"

    history_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.project_id == project.id, ChatMessage.thread_id == body.thread_id)
        .order_by(ChatMessage.created_at.asc())
    )
    history = [
        {"role": m.role, "content": m.content}
        for m in history_result.scalars().all()
    ]

    reply = await gigachat.get_chat_reply(history, current_user.username, plan_data, agent_role=agent_role, project_summary=project_summary)

    ai_msg = ChatMessage(project_id=project.id, role="ai", content=reply, thread_id=body.thread_id)
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


@router.put("/{project_id}/plan", response_model=BusinessPlanResponse)
async def update_plan(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _get_user_project(project_id, current_user.id, db)

    existing = await db.execute(
        select(BusinessPlan).where(BusinessPlan.project_id == project.id)
    )
    old_plan = existing.scalar_one_or_none()

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

    if old_plan:
        old_plan.niche = data.get("niche", old_plan.niche)
        old_plan.summary = data.get("summary", old_plan.summary)
        old_plan.monthly_revenue = data.get("monthly_revenue", old_plan.monthly_revenue)
        old_plan.monthly_expenses = data.get("monthly_expenses", old_plan.monthly_expenses)
        old_plan.payback_months = data.get("payback_months", old_plan.payback_months)
        old_plan.expenses_json = data.get("expenses", old_plan.expenses_json)
        old_plan.action_plan_json = data.get("action_plan", old_plan.action_plan_json)
        old_plan.alfa_products_json = data.get("alfa_products", old_plan.alfa_products_json)
        old_plan.competitors_count = competitors_count
        plan = old_plan
    else:
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


@router.post("/{project_id}/complete-step")
async def complete_step(
    project_id: int,
    body: StepCompleteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _get_user_project(project_id, current_user.id, db)

    plan_result = await db.execute(select(BusinessPlan).where(BusinessPlan.project_id == project.id))
    plan = plan_result.scalar_one_or_none()

    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    completed = list(plan.completed_steps_json)
    if body.is_completed and body.step_text not in completed:
        completed.append(body.step_text)
    elif not body.is_completed and body.step_text in completed:
        completed.remove(body.step_text)

    plan.completed_steps_json = completed

    ai_msg = None
    if body.is_completed:
        action_plan = list(plan.action_plan_json)
        next_step = None
        for step in action_plan:
            if step not in completed:
                next_step = step
                break

        reply = await gigachat.generate_step_completion_message(body.step_text, next_step, current_user.username)

        ai_msg = ChatMessage(project_id=project.id, role="ai", content=reply, thread_id="dashboard_main")
        db.add(ai_msg)

    await db.commit()

    response_data = {"completed_steps": plan.completed_steps_json}
    if ai_msg:
        await db.refresh(ai_msg)
        response_data["ai_message"] = {
            "id": ai_msg.id,
            "role": ai_msg.role,
            "content": ai_msg.content,
            "thread_id": ai_msg.thread_id,
            "created_at": ai_msg.created_at.isoformat()
        }

    return response_data


@router.delete("/{project_id}")
async def delete_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _get_user_project(project_id, current_user.id, db)

    await db.execute(sa_delete(BusinessPlan).where(BusinessPlan.project_id == project.id))
    await db.execute(sa_delete(ChatMessage).where(ChatMessage.project_id == project.id))
    await db.delete(project)
    await db.commit()

    return {"detail": "Project deleted"}


@router.delete("/{project_id}/messages/{message_id}")
async def delete_chat_message(
    project_id: int,
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_user_project(project_id, current_user.id, db)

    result = await db.execute(
        select(ChatMessage).where(
            ChatMessage.id == message_id,
            ChatMessage.project_id == project_id,
        )
    )
    msg = result.scalar_one_or_none()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    await db.delete(msg)
    await db.commit()

    return {"detail": "Message deleted"}


async def _get_user_project(project_id: int, user_id: int, db: AsyncSession) -> Project:
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == user_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


def _build_chat_summary(all_user_texts: list[str], plan_data: dict | None) -> dict:
    full_text = " ".join(all_user_texts)
    city = _extract_city(full_text) if full_text else None
    budget = _extract_budget(full_text) if full_text else None
    _, niche_tags = _detect_niche(full_text) if full_text else (None, [])
    pain_keywords = ["налог", "бухгалтер", "опыт", "страх", "партнер", "деньг", "аренд", "помещен", "реклам", "продвижен"]
    pains = [k for k in pain_keywords if k in full_text.lower()] if full_text else []
    return {
        "city": city or "не определён",
        "budget": budget,
        "niche_tags": niche_tags or [],
        "pains": pains,
        "total_user_messages": len(all_user_texts),
    }


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
        completed_steps_json=plan.completed_steps_json,
        competitors_count=plan.competitors_count,
    )

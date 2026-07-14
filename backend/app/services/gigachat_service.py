import asyncio
import json
import logging
from typing import Any

from gigachat import GigaChat
from gigachat.models import Chat, Messages, MessagesRole

from app.core.config import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT_CHAT = (
    "Ты бизнес-консультант Альфа-Банка для молодежи (17-25 лет). "
    "Твоя цель — помочь выбрать нишу (в приоритете HoReCa, Beauty, Retail) "
    "и рассчитать стартовый капитал. Отвечай кратко, эмпатично, "
    "молодежным, но профессиональным языком."
)

SYSTEM_PROMPT_PLAN = (
    "На основе истории диалога сгенерируй JSON бизнес-плана. "
    "Структура: niche, summary, monthly_revenue, monthly_expenses, "
    "payback_months, expenses (массив объектов {name, amount}), "
    "action_plan (массив строк), "
    "alfa_products (массив строк: какие продукты Альфа-Банка нужны, "
    "например, 'Открытие ИП', 'Эквайринг', 'Зарплатный проект'). "
    "Ответ должен быть только JSON, без markdown-обертки."
)


def _clean_json_response(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = text.removeprefix("```json").removeprefix("```").strip()
        if text.endswith("```"):
            text = text.removesuffix("```").strip()
    return text


class GigaChatService:
    def __init__(self) -> None:
        self._giga: GigaChat | None = None
        if settings.GIGACHAT_API_KEY:
            self._giga = GigaChat(
                credentials=settings.GIGACHAT_API_KEY,
                verify_ssl_certs=False,
            )
            logger.info("GigaChat client initialized")
        else:
            logger.warning("GIGACHAT_API_KEY не задан, GigaChat недоступен")

    async def get_chat_reply(self, history: list[dict[str, str]]) -> str:
        try:
            return await self._do_gigachat_call(history, SYSTEM_PROMPT_CHAT)
        except Exception:
            logger.exception("GigaChat call failed")
            return "Извините, сервис временно недоступен. Попробуйте позже."

    async def generate_business_plan_json(self, history: list[dict[str, str]]) -> dict[str, Any]:
        try:
            raw = await self._do_gigachat_call(history, SYSTEM_PROMPT_PLAN)
        except Exception:
            logger.exception("GigaChat call failed")
            return {
                "niche": "Неизвестно",
                "summary": "Сервис временно недоступен",
                "monthly_revenue": 0,
                "monthly_expenses": 0,
                "payback_months": 0,
                "expenses": [],
                "action_plan": [],
                "alfa_products": [],
            }

        cleaned = _clean_json_response(raw)
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            logger.exception("Failed to parse LLM response as JSON")
            return {
                "niche": "Ошибка генерации",
                "summary": raw,
                "monthly_revenue": 0,
                "monthly_expenses": 0,
                "payback_months": 0,
                "expenses": [],
                "action_plan": [],
                "alfa_products": [],
            }

    async def _do_gigachat_call(self, history: list[dict[str, str]], system_prompt: str) -> str:
        messages = [Messages(role=MessagesRole.SYSTEM, content=system_prompt)]
        for msg in history:
            role = MessagesRole.USER if msg["role"] == "user" else MessagesRole.ASSISTANT
            messages.append(Messages(role=role, content=msg["content"]))
        payload = Chat(messages=messages)
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(None, self._giga.chat, payload)
        return response.choices[0].message.content

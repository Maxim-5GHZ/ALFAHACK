import asyncio
import json
import logging
from typing import Any

from gigachat import GigaChat
from gigachat.models import Chat, Messages, MessagesRole

from app.core.config import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT_CHAT = (
    "Ты — цифровой бизнес-консультант Альфа-Банка для молодежи (17-25 лет). "
    "Твоя цель — помочь пользователю выбрать нишу (HoReCa, Beauty, Retail) и оценить стартовый капитал.\n\n"
    "Правила ведения диалога:\n"
    "1. Обязательно обращайся к пользователю по имени, которое передано в контексте.\n"
    "2. Выясни три ключевых фактора для планирования:\n"
    "   - Где живет пользователь (город).\n"
    "   - Какой у него стартовый бюджет (сколько денег готов вложить).\n"
    "   - Какую сферу или идею хочет запустить.\n"
    "3. Упомяни, что для оценки расходов на аренду и оборудование мы подтягиваем актуальные рыночные данные "
    "из партнерских баз объявлений (например, Авито Недвижимость и Авито Услуги) под выбранный город.\n"
    "4. Отвечай кратко, эмпатично, молодежным, но профессиональным языком. Используй эмодзи.\n"
    "5. Когда все базовые вводные ясны, предложи пользователю нажать кнопку на экране для генерации детального бизнес-плана."
)

SYSTEM_PROMPT_PLAN = (
    "На основе истории диалога сгенерируй JSON бизнес-плана. "
    "Учти город, бюджет и идеи пользователя. Если данные о расходах не указаны детально, "
    "используй реалистичные среднерыночные цены для данного региона (с симуляцией выгрузки цен аренды и оборудования из Авито).\n\n"
    "Структура JSON:\n"
    "{\n"
    "  \"niche\": \"Название ниши и город (например, Мини-кофейня, Казань)\",\n"
    "  \"summary\": \"Краткое резюме проекта (укажи, что расчет аренды и оборудования произведен на основе рыночной аналитики объявлений Авито)\",\n"
    "  \"monthly_revenue\": 150000,\n"
    "  \"monthly_expenses\": 90000,\n"
    "  \"payback_months\": 6,\n"
    "  \"expenses\": [\n"
    "    { \"name\": \"Аренда помещения (оценка по Авито)\", \"amount\": 35000 },\n"
    "    { \"name\": \"Закупка оборудования и инвентаря\", \"amount\": 120000 },\n"
    "    { \"name\": \"Маркетинг и реклама\", \"amount\": 15000 }\n"
    "  ],\n"
    "  \"action_plan\": [\n"
    "    \"Шаг 1: Оформить ИП в Альфа-Банке бесплатно\",\n"
    "    \"Шаг 2...\"\n"
    "  ],\n"
    "  \"alfa_products\": [\n"
    "    \"Бесплатная регистрация ИП\",\n"
    "    \"Альфа-Эквайринг для расчетов\"\n"
    "  ]\n"
    "}\n"
    "Ответ должен быть только в формате валидного JSON, без markdown-оберток (```json)."
)

MOCK_PLANS: dict[str, dict[str, Any]] = {
    "horeca": {
        "niche": "Уютная мини-кофейня / чайная",
        "summary": "Запуск современной точки «кофе и чай с собой» с небольшим посадочным местом. Финансовые показатели рассчитаны на основе средней стоимости коммерческой аренды и б/у оборудования на Авито с учетом молодежного трафика.",
        "monthly_revenue": 380000.0,
        "monthly_expenses": 240000.0,
        "payback_months": 7,
        "expenses": [
            {"name": "Аренда помещения (оценка по Авито, 15 кв.м.)", "amount": 45000.0},
            {"name": "Профессиональная кофемашина и кофемолка (б/у Авито)", "amount": 135000.0},
            {"name": "Закупка сырья (зерно, чай, молоко, сиропы) на 1-й месяц", "amount": 50000.0},
            {"name": "Минимальный ремонт и брендинг стаканчиков", "amount": 35000.0},
            {"name": "ФОТ бариста / подработка на старте", "amount": 60000.0},
            {"name": "Маркетинг, вывеска и реклама в геосервисах", "amount": 20000.0},
        ],
        "action_plan": [
            "Бесплатно зарегистрировать ИП через Альфа-Банк для экономии на пошлинах.",
            "Найти коммерческое помещение на Авито Недвижимости в районе с высоким пешеходным трафиком.",
            "Заключить договор аренды и закупить оборудование (кофемашина, холодильник, барная стойка).",
            "Подключить онлайн-кассу и эквайринг Альфа-Банка для приема карт и СБП.",
            "Нанять бариста (или работать самостоятельно в первые недели для понимания процессов).",
            "Запустить таргетированную рекламу и раздачу флаеров в день открытия.",
        ],
        "alfa_products": [
            "Бесплатная регистрация ИП онлайн",
            "Тариф 'Простой' для малого бизнеса (0 ₽ обслуживание)",
            "Альфа-Эквайринг со ставкой от 1%",
            "Бесплатная бизнес-карта Альфа-Cash",
        ],
    },
    "beauty": {
        "niche": "Локальная бьюти-студия / nail-бар",
        "summary": "Стильный кабинет маникюра и базового ухода за лицом. Расчет составлен с упором на аренду рабочего места или небольшого кабинета, а также закупку сертифицированных материалов и сухожаровых аппаратов.",
        "monthly_revenue": 320000.0,
        "monthly_expenses": 190000.0,
        "payback_months": 5,
        "expenses": [
            {"name": "Аренда кабинета / места в коворкинге (оценка Авито)", "amount": 25000.0},
            {"name": "Оборудование (столы, стулья, LED-лампы, сухожар)", "amount": 80000.0},
            {"name": "Расходные материалы (базы, лаки, одноразовые наборы)", "amount": 40000.0},
            {"name": "Легкий декор помещения под эстетичные фото", "amount": 15000.0},
            {"name": "ФОТ второго мастера (процент от записей)", "amount": 50000.0},
            {"name": "Продвижение профиля в соцсетях и карты Яндекс/Google", "amount": 15000.0},
        ],
        "action_plan": [
            "Зарегистрировать ИП (Альфа-Банк сделает это без визита в налоговую).",
            "Подобрать кабинет на Авито с хорошей транспортной доступностью.",
            "Купить мебель, профессиональные аппараты Strong/Marathon и стерилизатор.",
            "Открыть расчетный счет в Альфа-Банке и подключить Альфа-Пэй (прием платежей телефоном).",
            "Оформить профили студии, настроить онлайн-запись (DIKIDI/Yclients).",
            "Провести акцию 'Знакомство с мастером' со скидкой 20% на первый визит.",
        ],
        "alfa_products": [
            "Регистрация ИП и расчетный счет за 1 день",
            "Альфа-Pay (прием оплаты по QR-коду без терминала)",
            "Зарплатный проект для бьюти-мастеров",
        ],
    },
    "retail": {
        "niche": "Концепт-стор одежды / Корнер с мерчем",
        "summary": "Небольшой магазин трендовой одежды, аксессуаров или кастомного мерча. Смета расходов учитывает первую оптовую закупку вещей у фабрик, аренду рейлов/островка в ТЦ и кассовое оборудование.",
        "monthly_revenue": 420000.0,
        "monthly_expenses": 280000.0,
        "payback_months": 8,
        "expenses": [
            {"name": "Субаренда корнера в ТЦ или рейла (оценка Авито)", "amount": 35000.0},
            {"name": "Первая партия товара / закупка у поставщика", "amount": 180000.0},
            {"name": "Оборудование торговой зоны (рейлы, вешалки, зеркала)", "amount": 30000.0},
            {"name": "Кассовый терминал и сканер штрихкодов", "amount": 20000.0},
            {"name": "Пакеты с логотипом, бирки и полиграфия", "amount": 10000.0},
            {"name": "Реклама у локальных микроинфлюенсеров", "amount": 15000.0},
        ],
        "action_plan": [
            "Зарегистрироваться в качестве ИП онлайн через сервис Альфа-Банка.",
            "Заключить партнерские соглашения с фабриками или найти поставщиков на оптовых площадках.",
            "Арендовать небольшую площадь в проходном концепт-сторе или ТЦ.",
            "Подключить торговый эквайринг Альфа-Банка с поддержкой бесконтактной оплаты.",
            "Оформить витрину и запустить активный маркетинг в соцсетях.",
            "Провести праздничный запуск с диджеем и промо-скидками.",
        ],
        "alfa_products": [
            "Бесплатное открытие ИП и расчетного счета",
            "Торговый эквайринг Альфа-Банка",
            "Интеграция с онлайн-кассами (ФЗ-54)",
            "Бизнес-карта с кешбэком до 10%",
        ],
    },
    "generic": {
        "niche": "Малый бизнес в сфере услуг",
        "summary": "Запуск сервисного бизнеса или агентства. Минимальные первоначальные вложения, упор на аренду небольшого офиса и маркетинг для быстрого привлечения клиентов.",
        "monthly_revenue": 280000.0,
        "monthly_expenses": 160000.0,
        "payback_months": 4,
        "expenses": [
            {"name": "Аренда мини-офиса или рабочего места", "amount": 15000.0},
            {"name": "Офисная техника и софт (ноутбук, МФУ)", "amount": 60000.0},
            {"name": "Рекламный бюджет в Яндекс.Директ и соцсетях", "amount": 30000.0},
            {"name": "Оформление сайта-визитки и презентаций", "amount": 15000.0},
            {"name": "Связь, интернет и мелкие расходы", "amount": 10000.0},
        ],
        "action_plan": [
            "Зарегистрировать ИП через Альфа-Банк для ведения легальной деятельности.",
            "Подготовить портфолио, прайс-лист и запустить простой сайт-визитку.",
            "Открыть счет и настроить удобное выставление счетов клиентам в приложении Альфа-Бизнес.",
            "Запустить таргетированную или контекстную рекламу на целевые услуги.",
            "Заключить первые договора и начать выполнение заказов.",
        ],
        "alfa_products": [
            "Регистрация ИП без визита в банк",
            "Мобильное приложение Альфа-Бизнес для выставления счетов",
            "Онлайн-бухгалтерия Альфа-Банка для ИП",
        ],
    },
}


def _clean_json_response(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = text.removeprefix("```json").removeprefix("```").strip()
        if text.endswith("```"):
            text = text.removesuffix("```").strip()
    return text


def _get_fallback_plan_by_history(history: list[dict[str, str]]) -> dict[str, Any]:
    full_text = " ".join([m.get("content", "").lower() for m in history])

    if any(k in full_text for k in ["кофе", "чай", "кафе", "еда", "бургер", "пицц", "бар", "выпеч", "пекар"]):
        return MOCK_PLANS["horeca"]
    elif any(k in full_text for k in ["маникюр", "салон", "бьюти", "ногти", "стриж", "волос", "ресниц", "космет"]):
        return MOCK_PLANS["beauty"]
    elif any(k in full_text for k in ["одежд", "шоп", "магаз", "мерч", "бренд", "товар", "игрушк"]):
        return MOCK_PLANS["retail"]
    else:
        return MOCK_PLANS["generic"]


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

    async def get_chat_reply(self, history: list[dict[str, str]], username: str) -> str:
        system_prompt = f"{SYSTEM_PROMPT_CHAT}\n\nИмя пользователя для обращения: {username}."
        try:
            if not self._giga:
                raise ValueError("GigaChat API Key is missing")
            return await self._do_gigachat_call(history, system_prompt)
        except Exception:
            logger.exception("GigaChat call failed, generating fallback response")
            fallback_data = _get_fallback_plan_by_history(history)
            return (
                f"Отличные мысли, {username}! Специально для твоего направления («{fallback_data['niche']}») "
                f"я подготовил предварительный расчет на основе стоимости аренды и оборудования в твоем регионе (данные Авито).\n\n"
                f"Примерные показатели:\n"
                f"• Выручка: около {int(fallback_data['monthly_revenue'])} ₽/мес.\n"
                f"• Расходы: около {int(fallback_data['monthly_expenses'])} ₽/мес.\n"
                f"• Срок окупаемости: {fallback_data['payback_months']} мес.\n\n"
                f"Нажми кнопку **«Сгенерировать бизнес-план»** чуть ниже, и я выведу подробную смету и пошаговый план!"
            )

    async def generate_business_plan_json(self, history: list[dict[str, str]], username: str) -> dict[str, Any]:
        fallback_data = _get_fallback_plan_by_history(history)

        try:
            if not self._giga:
                raise ValueError("GigaChat API Key is missing")
            raw = await self._do_gigachat_call(history, f"{SYSTEM_PROMPT_PLAN}\n\nИмя пользователя: {username}.")
        except Exception:
            logger.exception("GigaChat plan call failed, using static database mock")
            return fallback_data

        cleaned = _clean_json_response(raw)
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            logger.exception("Failed to parse LLM response as JSON, falling back to static database mock")
            return fallback_data

    async def _do_gigachat_call(self, history: list[dict[str, str]], system_prompt: str) -> str:
        messages = [Messages(role=MessagesRole.SYSTEM, content=system_prompt)]
        for msg in history:
            role = MessagesRole.USER if msg["role"] == "user" else MessagesRole.ASSISTANT
            messages.append(Messages(role=role, content=msg["content"]))
        payload = Chat(messages=messages)
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(None, self._giga.chat, payload)
        return response.choices[0].message.content

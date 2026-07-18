import asyncio
import json
import logging
import re
import copy
from typing import Any

from gigachat import GigaChat
from gigachat.models import Chat, Messages, MessagesRole

from app.core.config import settings
from app.core.prompts import SYSTEM_PROMPTS

logger = logging.getLogger(__name__)

SYSTEM_PROMPT_PLAN = (
    "На основе истории диалога сгенерируй JSON бизнес-плана. "
    "Учти город, бюджет, боли и идеи пользователя. Наполни смету реалистичными ценами.\n"
    "Обязательно добавь продукты Альфа-Банка в зависимости от выявленных болей пользователя.\n\n"
    "Структура JSON:\n"
    "{\n"
    "  \"niche\": \"Название ниши и город (например, Мини-кофейня, Казань)\",\n"
    "  \"summary\": \"Краткое резюме проекта (подчеркни, как Альфа-Банк решает ключевые страхи пользователя)\",\n"
    "  \"monthly_revenue\": 150000,\n"
    "  \"monthly_expenses\": 90000,\n"
    "  \"payback_months\": 6,\n"
    "  \"expenses\": [\n"
    "    { \"name\": \"Аренда помещения (оценка по Авито)\", \"amount\": 35000 },\n"
    "    { \"name\": \"Закупка оборудования и инвентаря\", \"amount\": 120000 }\n"
    "  ],\n"
    "  \"action_plan\": [\n"
    "    \"Шаг 1: Бесплатно открыть ИП через Альфа-Банк\",\n"
    "    \"Шаг 2...\"\n"
    "  ],\n"
    "  \"alfa_products\": [\n"
    "    \"Бесплатная онлайн-регистрация ИП\",\n"
    "    \"«Альфа.Тандем» для безопасности с партнером\"\n"
    "  ]\n"
    "}\n"
    "Ответ должен быть строго в формате валидного JSON, без markdown-оберток (```json)."
)

MOCK_PLANS: dict[str, dict[str, Any]] = {
    "horeca": {
        "niche": "Уютная мини-кофейня / чайная",
        "summary": "Запуск современной точки «кофе и чай с собой» с небольшим посадочным местом. Финансовые показатели рассчитаны на основе средней стоимости коммерческой аренды и б/у оборудования на Авито с учетом молодежного пешеходного трафика.",
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
            "Бесплатно зарегистрировать ИП через Альфа-Банк для экономии на госпошлинах.",
            "Найти коммерческое помещение на Авито Недвижимости в районе с высоким пешеходным трафиком.",
            "Заключить договор аренды и закупить оборудование (кофемашина, холодильник, барная стойка).",
            "Подключить онлайн-кассу Альфа-Касса с «Умным Налоговым Автопилотом».",
            "Настроить сплит-систему «Альфа.Тандем», если проект запускается в партнерстве.",
            "Нанять бариста (или работать самостоятельно в первые недели для понимания процессов).",
            "Запустить таргетированную рекламу и раздачу флаеров в день открытия.",
        ],
        "alfa_products": [
            "Бесплатная регистрация ИП онлайн",
            "Тариф 'Простой' для малого бизнеса (0 ₽ обслуживание)",
            "«Альфа.Тандем» — авто-сплит выручки между сооснователями",
            "«Умный Налоговый Автопилот» — авторезервирование налогов",
            "Альфа-Эквайринг со ставкой от 1% и кешбэком «Альфа.Драйв»",
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
            "Активировать кешбэк-программу «Альфа.Драйв» для закупки расходных материалов.",
            "Оформить профили студии, настроить онлайн-запись (DIKIDI/Yclients).",
            "Провести акцию 'Знакомство с мастером' со скидкой 20% на первый визит.",
        ],
        "alfa_products": [
            "Регистрация ИП и расчетный счет за 1 день",
            "Альфа-Pay (прием оплаты по QR-коду без терминала)",
            "«Альфа.Драйв» — кешбэк до 10% на B2B-закупки у партнеров",
            "«Умный Налоговый Автопилот» для бесконфликтной отчетности",
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
            "Использовать сервис «Альфа.Тандем» для распределения выручки между дизайнером и дистрибьютором.",
            "Оформить витрину и запустить активный маркетинг в соцсетях.",
            "Провести праздничный запуск с диджеем и промо-скидками.",
        ],
        "alfa_products": [
            "Бесплатное открытие ИП и расчетного счета",
            "Торговый эквайринг Альфа-Банка",
            "«Альфа.Тандем» для распределения прибыли между дизайнерами и партнерами",
            "Интеграция с онлайн-кассами (ФЗ-54)",
            "Бизнес-карта с кешбэком до 10%",
        ],
    },
    "generic": {
        "niche": "Малый бизнес в сфере услуг",
        "summary": "Запуск сервисного бизнеса или локального агентства. Минимальные первоначальные вложения, упор на аренду небольшого офиса и маркетинг для быстрого привлечения клиентов.",
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
            "Подключить «Умный Налоговый Автопилот» для автоматического отчисления налогов.",
            "Запустить таргетированную или контекстную рекламу на целевые услуги.",
            "Заключить первые договоры и начать выполнение заказов.",
        ],
        "alfa_products": [
            "Регистрация ИП без визита в банк",
            "Мобильное приложение Альфа-Бизнес для выставления счетов",
            "«Умный Налоговый Автопилот» для автоматического накопления налогов",
            "Онлайн-бухгалтерия Альфа-Банка для ИП",
        ],
    },
}


def _clean_json_response(text: str) -> str:
    text = text.strip()
    
    start_idx = text.find('{')
    end_idx = text.rfind('}')
    
    if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
        return text[start_idx:end_idx + 1]
    
    if text.startswith("```"):
        text = text.removeprefix("```json").removeprefix("```").strip()
        if text.endswith("```"):
            text = text.removesuffix("```").strip()
    return text


def _is_safety_block(text: str) -> bool:
    safety_triggers = [
        "генеративные языковые модели",
        "чувствительными темами",
        "временно ограничены",
        "во избежание неправильного толкования",
        "некорректные ответы",
    ]
    return any(trigger in text for trigger in safety_triggers)


def _get_fallback_plan_by_history(history: list[dict[str, str]]) -> dict[str, Any]:
    user_text = " ".join([m.get("content", "").lower() for m in history if m.get("role") == "user"])
    all_text = " ".join([m.get("content", "").lower() for m in history])

    city = _extract_city(user_text)
    niche_detected, niche_keywords = _detect_niche(user_text)

    budget_num = _extract_budget(user_text)
    budget_low = budget_num is not None and budget_num < 50000
    budget_high = budget_num is not None and budget_num >= 300000

    has_tax_fear = any(k in all_text for k in ["налог", "бухгалтер", "декларац", "отчет", "штраф"])
    has_partner = any(k in all_text for k in ["партнер", "друг", "соосновател", "вместе", "напарник"])
    has_experience_fear = any(k in all_text for k in ["опыт", "новичок", "начинающ", "не умею", "страшно", "боюсь", "переживаю"])

    plan = copy.deepcopy(niche_detected)

    city_suffix = f", {city}" if city != "твоём городе" else ""
    plan["niche"] += city_suffix

    pains = []
    if has_tax_fear:
        pains.append("страх налогов и отчётности")
    if has_partner:
        pains.append("опасения по поводу партнёрства")
    if has_experience_fear:
        pains.append("нехватка опыта")
    if budget_low:
        pains.append("ограниченный бюджет")
    pains_str = ", ".join(pains) if pains else "типичные страхи начинающих"

    plan["summary"] = (
        f"Запуск в г. {city} с учётом выявленных барьеров: {pains_str}. "
        f"Смета адаптирована под локальные цены аренды и закупок. "
        f"Альфа-Банк предлагает инструменты для снятия каждого из барьеров."
    )

    if has_partner and "«Альфа.Тандем»" not in " ".join(plan["alfa_products"]):
        plan["alfa_products"].append("«Альфа.Тандем» для прозрачного сплита доходов с партнёром")
    if has_tax_fear and "налогов" not in " ".join(plan["alfa_products"]).lower():
        plan["alfa_products"].append("«Умный Налоговый Автопилот» — забудь про отчётность")
    if budget_low:
        plan["alfa_products"].append("Молодёжный стартап-овердрафт от 4.5% на первые закупки")
        plan["summary"] += " Для компенсации нехватки бюджета предусмотрен льготный кредитный продукт."
        plan["monthly_revenue"] = round(plan["monthly_revenue"] * 0.7)
        plan["monthly_expenses"] = round(plan["monthly_expenses"] * 0.75)
        plan["payback_months"] = max(1, round(plan["payback_months"] * 1.4))
        for exp in plan["expenses"]:
            exp["amount"] = round(exp["amount"] * 0.75)
    if budget_high:
        plan["monthly_revenue"] = round(plan["monthly_revenue"] * 1.5)
        plan["monthly_expenses"] = round(plan["monthly_expenses"] * 1.4)
        for exp in plan["expenses"]:
            exp["amount"] = round(exp["amount"] * 1.3)

    if has_experience_fear:
        plan["action_plan"].insert(0, "Пройди бесплатный обучающий курс по основам предпринимательства от Альфа-Банка")
        plan["alfa_products"].append("Бесплатное обучение и шаблоны документов для начинающих")

    if has_tax_fear and "Бесплатная онлайн-регистрация ИП" not in " ".join(plan["alfa_products"]):
        plan["alfa_products"].insert(0, "Бесплатная онлайн-регистрация ИП без визита в банк")

    return plan


def _extract_city(text: str) -> str:
    city_match = re.search(r"(?:в|из|по|для|около|рядом\s+с)\s+([А-Я][а-я\-ё]+)", text)
    if city_match:
        return city_match.group(1)
    for city_key, city_name in [
        ("калуг", "Калуга"), ("москв", "Москва"),
        ("питер", "Санкт-Петербург"), ("спб", "Санкт-Петербург"),
        ("казан", "Казань"), ("новосиб", "Новосибирск"),
        ("екатеринбург", "Екатеринбург"), ("краснодар", "Краснодар"),
        ("нижн", "Нижний Новгород"), ("челяб", "Челябинск"),
        ("самар", "Самара"), ("уф", "Уфа"),
        ("ростов", "Ростов-на-Дону"), ("тюмен", "Тюмень"),
    ]:
        if city_key in text.lower():
            return city_name
    return "твоём городе"


def _detect_niche(user_text: str) -> tuple[dict, list[str]]:
    if any(k in user_text for k in ["кофе", "чай", "кафе", "еда", "бургер", "пицц", "бар", "выпеч", "пекар"]):
        return copy.deepcopy(MOCK_PLANS["horeca"]), ["horeca"]
    if any(k in user_text for k in ["кошач", "котокаф", "котик", "кошка"]):
        plan = copy.deepcopy(MOCK_PLANS["horeca"])
        plan["niche"] = "Интерактивное котокафе"
        plan["summary"] = "Открытие уютного котокафе с игровой зоной. Расчет составлен с учетом коммерческой аренды помещения, ветеринарного контроля котиков, а также покупки б/у оборудования и мебели на Авито."
        plan["expenses"] = [
            {"name": "Аренда помещения (оценка по Авито, 40 кв.м. под требования котов)", "amount": 60000.0},
            {"name": "Обустройство игровой зоны для животных и мебель (кошачьи городки, лежанки, когтеточки)", "amount": 55000.0},
            {"name": "Профессиональная кофемашина и барная стойка (б/у Авито)", "amount": 110000.0},
            {"name": "Первичный ветеринарный осмотр, вакцинация и чипирование", "amount": 25000.0},
            {"name": "Закупка сырья (чай, зерна, сиропы) и кошачьего корма", "amount": 40000.0},
            {"name": "Маркетинг, вывеска и продвижение в социальных сетях", "amount": 20000.0},
        ]
        plan["action_plan"] = [
            "Бесплатно зарегистрировать ИП через Альфа-Банк онлайн.",
            "Найти безопасное помещение на Авито Недвижимости, соответствующее санитарным нормам.",
            "Заключить партнерство с местным приютом для животных для размещения котиков.",
            "Провести ветеринарный осмотр и подготовить паспорта для пушистых резидентов.",
            "Подключить онлайн-кассу Альфа-Касса с «Умным Налоговым Автопилотом».",
            "Настроить сплит-систему «Альфа.Тандем» для прозрачного распределения выручки.",
            "Открыть двери котокафе и запустить рекламу у местных блогеров.",
        ]
        return plan, ["cat_cafe"]
    if any(k in user_text for k in ["маникюр", "салон", "бьюти", "ногти", "ногот", "стриж", "волос", "ресниц", "космет", "визаж", "барбер"]):
        return copy.deepcopy(MOCK_PLANS["beauty"]), ["beauty"]
    if any(k in user_text for k in ["одежд", "шоп", "магаз", "мерч", "бренд", "товар", "игрушк", "обувь", "вещ"]):
        return copy.deepcopy(MOCK_PLANS["retail"]), ["retail"]
    return copy.deepcopy(MOCK_PLANS["generic"]), ["generic"]


def _extract_budget(text: str) -> int | None:
    amounts = re.findall(r'(?:^|\s)(\d{3,9})(?:\s|$|\.|,|тыс|руб|₽)', text)
    if not amounts:
        amounts = re.findall(r'(\d+)\s*(?:тыс|к|круб|тыщ)', text)
        if amounts:
            return int(amounts[0]) * 1000
    if amounts:
        val = int(amounts[0])
        if val < 1000:
            val *= 1000
        return val
    digit_matches = re.findall(r'\b(\d+)\b', text)
    for d in digit_matches:
        v = int(d)
        if 5000 <= v <= 10000000:
            return v
    return None


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

    async def get_chat_reply(
        self,
        history: list[dict[str, str]],
        username: str,
        plan: dict | None = None,
        agent_role: str = "general",
        project_summary: dict | None = None
    ) -> str:
        base_prompt = SYSTEM_PROMPTS.get(agent_role, SYSTEM_PROMPTS["general"])
        system_prompt = f"{base_prompt}\n\nИмя пользователя для обращения: {username}."

        if project_summary and project_summary.get("total_user_messages", 0) > 1:
            parts = ["\n\nСВОДКА ПО ПРОЕКТУ (из диалога):"]
            if project_summary.get("city"):
                parts.append(f"- Город: {project_summary['city']}")
            if project_summary.get("budget"):
                parts.append(f"- Бюджет: ~{project_summary['budget']:,} руб.")
            if project_summary.get("niche_tags"):
                parts.append(f"- Сфера: {', '.join(project_summary['niche_tags'])}")
            if project_summary.get("pains"):
                pain_labels = {"налог": "страх налогов", "бухгалтер": "бухгалтерия", "опыт": "нехватка опыта", "страх": "страхи", "партнер": "партнёрство", "деньг": "финансы", "аренд": "аренда", "помещен": "помещение", "реклам": "реклама", "продвижен": "продвижение"}
                pains = [pain_labels.get(p, p) for p in project_summary["pains"]]
                parts.append(f"- Ключевые боли: {', '.join(set(pains))}")
            parts.append(f"- Всего сообщений в диалоге: {project_summary['total_user_messages']}")
            system_prompt += "\n".join(parts)

        if plan:
            done_steps = len(plan.get("completed_steps_json", []))
            total_steps = len(plan.get("action_plan_json", []))
            system_prompt += (
                f"\n\nТЕКУЩЕЕ СОСТОЯНИЕ БИЗНЕСА (Живой контекст):\n"
                f"- Ниша: {plan.get('niche')}\n"
                f"- Выручка: {plan.get('monthly_revenue')} руб.\n"
                f"- Прогресс по плану: выполнено {done_steps} из {total_steps} шагов.\n"
                f"- Выполненные шаги: {', '.join(plan.get('completed_steps_json', []))}.\n\n"
                f"Внимательно учитывай этот статус при ответах. Если пользователь спрашивает, что делать дальше, "
                f"опирайся на то, какие шаги он уже сделал."
            )

        try:
            if not self._giga:
                raise ValueError("GigaChat API Key is missing")

            reply = await self._do_gigachat_call(history, system_prompt)

            if _is_safety_block(reply):
                raise ValueError("GigaChat safety filter intercepted standard block response")

            return reply
        except Exception:
            logger.exception("GigaChat call failed or safety blocked, generating adaptive fallback response")
            return self._get_fallback_by_role(agent_role, username)

    def _get_fallback_by_role(self, agent_role: str, username: str) -> str:
        if agent_role == "financier":
            return (
                f"Привет, {username}! Я твой финансовый консультант. Похоже, у меня возникли трудности со связью, "
                f"но я готов помочь тебе посчитать окупаемость и настроить льготный стартап-овердрафт от 4.5% в Альфа-Банке. Давай продолжим диалог!"
            )
        elif agent_role == "marketer":
            return (
                f"Салют, {username}! Я на связи. Сгенерируем идеи для продвижения и настроим Альфа-Pay "
                f"для приема бесконтактной оплаты по QR-кодам, чтобы твои клиенты могли платить в одно касание!"
            )
        elif agent_role == "accountant":
            return (
                f"Привет, {username}! Не переживай насчет налогов. Даже в режиме офлайн я напомню, "
                f"что наш «Умный Налоговый Автопилот» сам отложит нужную сумму с каждого платежа. Все под контролем!"
            )
        elif agent_role == "lawyer":
            return (
                f"Здравствуйте, {username}! Я помогу тебе разобраться с договорами и зарегистрировать ИП "
                f"онлайн бесплатно. Безопасность твоего бизнеса — мой приоритет!"
            )
        return (
            f"Привет, {username}! Я твой бизнес-ассистент Альфа-Банка. Наша система сейчас обновляется, "
            f"но я всегда готов ответить на твои вопросы о запуске своего дела!"
        )

    async def generate_business_plan_json(self, history: list[dict[str, str]], username: str) -> dict[str, Any]:
        fallback_data = _get_fallback_plan_by_history(history)

        try:
            if not self._giga:
                raise ValueError("GigaChat API Key is missing")
            raw = await self._do_gigachat_call(history, f"{SYSTEM_PROMPT_PLAN}\n\nИмя пользователя: {username}.")

            if _is_safety_block(raw):
                raise ValueError("GigaChat safety filter blocked plan JSON generation")

            cleaned = _clean_json_response(raw)
            return json.loads(cleaned)
        except Exception:
            logger.exception("GigaChat plan generation failed or safety blocked, using adaptive fallback database")
            return fallback_data

    async def generate_step_completion_message(self, step_text: str, next_step_text: str | None, username: str) -> str:
        system_prompt = (
            f"Ты — эмпатичный бизнес-консультант Альфа-Банка. Пользователь {username} "
            f"только что выполнил шаг своего бизнес-плана: '{step_text}'.\n"
            f"Твоя задача:\n"
            f"1. Поздравить его и похвалить (коротко, 1-2 предложения, используй эмодзи).\n"
        )

        if next_step_text:
            system_prompt += (
                f"2. Сказать, что следующий шаг — это '{next_step_text}'.\n"
                f"3. Кратко и понятно (для новичка) объяснить, как это сделать. Если уместно, "
                f"упомяни продукты Альфа-Банка, которые могут помочь на этом этапе."
            )
        else:
            system_prompt += "2. Сказать, что все шаги плана выполнены, и пожелать удачи в бизнесе!"

        try:
            if not self._giga:
                raise ValueError("GigaChat API Key is missing")

            messages = [Messages(role=MessagesRole.SYSTEM, content=system_prompt)]
            payload = Chat(messages=messages)
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(None, self._giga.chat, payload)
            reply = response.choices[0].message.content

            if _is_safety_block(reply):
                raise ValueError("Safety block")
            return reply
        except Exception:
            logger.exception("Failed to generate step completion message")
            if next_step_text:
                return f"Супер, {username}! Шаг «{step_text}» выполнен ✅. Переходим к следующему: «{next_step_text}». Альфа-Банк всегда рядом, чтобы помочь с этим!"
            return f"Поздравляю, {username}! Все шаги выполнены. Успешного бизнеса! 🚀"

    async def _do_gigachat_call(self, history: list[dict[str, str]], system_prompt: str) -> str:
        messages = [Messages(role=MessagesRole.SYSTEM, content=system_prompt)]
        for msg in history:
            role = MessagesRole.USER if msg["role"] == "user" else MessagesRole.ASSISTANT
            messages.append(Messages(role=role, content=msg["content"]))
        payload = Chat(messages=messages)
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(None, self._giga.chat, payload)
        return response.choices[0].message.content

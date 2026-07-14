import logging
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)

class YandexMapsService:
    def __init__(self):
        self.api_key = settings.YANDEX_MAPS_API_KEY
        self.base_url = "https://search-maps.yandex.ru/v1/"

    async def get_competitor_count(self, niche: str, city: str) -> int:
        if not self.api_key:
            logger.warning("YANDEX_MAPS_API_KEY не задан, используется симуляция")
            return self._get_fallback_count(niche, city)

        query = f"{niche} {city}"
        params = {
            "apikey": self.api_key,
            "text": query,
            "lang": "ru_RU",
            "type": "biz",
            "results": 50
        }

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(self.base_url, params=params)
                if response.status_code == 200:
                    data = response.json()
                    properties = data.get("properties", {})
                    response_meta = properties.get("ResponseMetaData", {})
                    search_response_meta = response_meta.get("SearchResponse", {})
                    found = search_response_meta.get("found", 0)
                    return found
                else:
                    logger.error(f"Ошибка API Яндекс Карт: {response.status_code} - {response.text}")
                    return self._get_fallback_count(niche, city)
        except Exception as e:
            logger.exception("Не удалось выполнить запрос к API Яндекс Карт")
            return self._get_fallback_count(niche, city)

    def _get_fallback_count(self, niche: str, city: str) -> int:
        city_lower = city.lower()
        niche_lower = niche.lower()

        multiplier = 1.0
        if any(c in city_lower for c in ["москва", "мск"]):
            multiplier = 8.5
        elif any(c in city_lower for c in ["санкт-петербург", "спб", "питер"]):
            multiplier = 5.2
        elif any(c in city_lower for c in ["казань", "новосибирск", "екатеринбург", "краснодар"]):
            multiplier = 2.8

        base_val = 12
        if "кофе" in niche_lower or "кафе" in niche_lower:
            base_val = 25
        elif "маникюр" in niche_lower or "салон" in niche_lower or "бьюти" in niche_lower:
            base_val = 30
        elif "одежд" in niche_lower or "магазин" in niche_lower:
            base_val = 18

        return int(base_val * multiplier)

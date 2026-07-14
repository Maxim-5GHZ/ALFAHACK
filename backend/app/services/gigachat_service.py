import logging

from gigachat import GigaChat

from app.core.config import settings

logger = logging.getLogger(__name__)


class GigaChatService:
    def __init__(self):
        if not settings.GIGACHAT_API_KEY:
            logger.error("GIGACHAT_API_KEY не задан")
            self.giga = None
            return
        self.giga = GigaChat(credentials=settings.GIGACHAT_API_KEY, verify_ssl_certs=False)

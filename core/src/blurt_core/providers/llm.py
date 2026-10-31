import logging
import time
import uuid
from typing import Any

from sqlalchemy.orm import Session

from blurt_core.db.models import LlmCall

logger = logging.getLogger(__name__)


class LlmClient:
    def __init__(self, base_url: str, api_key: str, model: str, provider: str) -> None:
        self._base_url = base_url
        self._api_key = api_key
        self.model = model
        self.provider = provider

    def complete(self, messages: list[Any], *, temperature: float = 0.0) -> str:
        """DB-free completion for offline callers such as evals; logs no LlmCall."""
        from openai import OpenAI

        client = OpenAI(base_url=self._base_url, api_key=self._api_key)
        response = client.chat.completions.create(
            model=self.model, messages=messages, temperature=temperature
        )
        return response.choices[0].message.content or ""

    def chat(
        self,
        messages: list[Any],
        *,
        session: Session,
        job_id: uuid.UUID | None,
        stage: str,
        prompt_version: str = "1",
    ) -> str:
        from openai import OpenAI

        client = OpenAI(base_url=self._base_url, api_key=self._api_key)

        start = time.monotonic()
        ok = False
        error_str: str | None = None
        input_tokens: int | None = None
        output_tokens: int | None = None
        content = ""

        try:
            response = client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0,
            )
            content = response.choices[0].message.content or ""
            if response.usage:
                input_tokens = response.usage.prompt_tokens
                output_tokens = response.usage.completion_tokens
            ok = True
        except Exception as exc:
            error_str = str(exc)
            logger.error("llm call failed", extra={"stage": stage, "error": error_str})
            raise
        finally:
            latency_ms = int((time.monotonic() - start) * 1000)
            call = LlmCall(
                job_id=job_id,
                stage=stage,
                provider=self.provider,
                model=self.model,
                prompt_version=prompt_version,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                latency_ms=latency_ms,
                ok=ok,
                error=error_str,
            )
            session.add(call)
            session.flush()

        return content


def build_llm_client(settings: object) -> LlmClient:
    from blurt_core.config import Settings

    assert isinstance(settings, Settings)
    provider = "groq" if "groq.com" in settings.llm_base_url else "ollama"
    return LlmClient(
        base_url=settings.llm_base_url,
        api_key=settings.llm_api_key,
        model=settings.llm_model,
        provider=provider,
    )

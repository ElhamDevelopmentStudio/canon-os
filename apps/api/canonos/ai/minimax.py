from __future__ import annotations

import json
import os
from ast import literal_eval
from dataclasses import dataclass
from typing import Any
from urllib import error, request


class MiniMaxConfigurationError(RuntimeError):
    pass


@dataclass(frozen=True)
class MiniMaxResponse:
    content: str
    usage: dict[str, Any]
    raw: dict[str, Any]


class MiniMaxClient:
    def __init__(self) -> None:
        self.api_key = os.environ.get("MINIMAX_API_KEY", "").strip()
        self.base_url = os.environ.get("MINIMAX_BASE_URL", "https://api.minimax.io/v1").rstrip("/")
        self.model = os.environ.get("MINIMAX_MODEL", "MiniMax-M2.7")
        timeout_value = os.environ.get("MINIMAX_TIMEOUT_SECONDS", "20")
        try:
            self.timeout = max(1, int(timeout_value))
        except ValueError:
            self.timeout = 20

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key)

    def chat_json(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        max_completion_tokens: int = 900,
        temperature: float = 0.2,
    ) -> dict[str, Any]:
        response = self.chat(
            messages=[
                {"role": "system", "name": "CanonOS", "content": system_prompt},
                {"role": "user", "name": "User", "content": user_prompt},
            ],
            max_completion_tokens=max_completion_tokens,
            temperature=temperature,
        )
        content = response.content.strip()
        content = _extract_json_object(content)
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            parsed = literal_eval(content)
            if isinstance(parsed, dict):
                return parsed
            raise

    def chat(
        self,
        *,
        messages: list[dict[str, str]],
        max_completion_tokens: int = 900,
        temperature: float = 0.2,
    ) -> MiniMaxResponse:
        if not self.api_key:
            raise MiniMaxConfigurationError("MINIMAX_API_KEY is not configured.")

        payload = {
            "model": self.model,
            "messages": messages,
            "max_completion_tokens": max_completion_tokens,
            "temperature": temperature,
            "top_p": 0.95,
        }
        encoded = json.dumps(payload).encode("utf-8")
        http_request = request.Request(
            f"{self.base_url}/chat/completions",
            data=encoded,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with request.urlopen(http_request, timeout=self.timeout) as response:
                data = json.loads(response.read().decode("utf-8"))
        except error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"MiniMax request failed with HTTP {exc.code}: {detail}") from exc
        except error.URLError as exc:
            raise RuntimeError(f"MiniMax request failed: {exc.reason}") from exc

        message = data.get("choices", [{}])[0].get("message", {})
        content = str(message.get("content") or "")
        return MiniMaxResponse(content=content, usage=data.get("usage", {}), raw=data)


def _extract_json_object(content: str) -> str:
    clean = content.strip()
    if clean.startswith("```"):
        lines = clean.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        clean = "\n".join(lines).strip()
        if clean.casefold().startswith("json"):
            clean = clean[4:].strip()
    start = clean.find("{")
    end = clean.rfind("}")
    if start != -1 and end != -1 and end > start:
        return clean[start : end + 1]
    return clean

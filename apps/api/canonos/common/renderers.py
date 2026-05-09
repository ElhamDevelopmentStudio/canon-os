from __future__ import annotations

import json

from rest_framework.renderers import BaseRenderer


class ServerSentEventRenderer(BaseRenderer):
    media_type = "text/event-stream"
    format = "event-stream"
    charset = "utf-8"

    def render(
        self,
        data: object,
        accepted_media_type: str | None = None,
        renderer_context: dict[str, object] | None = None,
    ) -> bytes:
        if data is None:
            return b""
        return f"event: error\ndata: {json.dumps(data, default=str)}\n\n".encode()

import type {
  ChatMessage,
  ChatMessageCreateRequest,
  ChatModule,
  ChatSession,
  ChatSessionCreateRequest,
  ChatSessionDetail,
  ChatStreamEvent,
  ChatTurnResponse,
} from "@canonos/contracts";
import useSWR, { mutate as globalMutate } from "swr";

import { getCsrfToken } from "@/features/auth/authApi";
import { API_BASE_URL, api } from "@/lib/api";
import { API_ROUTES } from "@/lib/apiRouteConstants";
import { fetcher } from "@/lib/swr";

type ChatSessionListResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: ChatSession[];
};

function normalizeMessage(message: ChatMessage): ChatMessage {
  return {
    ...message,
    metadata: message.metadata ?? {},
  };
}

function normalizeSession<T extends ChatSession | ChatSessionDetail>(session: T): T {
  const normalized = {
    ...session,
    state: session.state ?? {},
    latestResult: session.latestResult ?? {},
  };
  if ("messages" in normalized) {
    return {
      ...normalized,
      messages: normalized.messages.map(normalizeMessage),
    } as T;
  }
  return normalized as T;
}

function sessionListKey(module?: ChatModule) {
  const params = new URLSearchParams();
  if (module) params.set("module", module);
  const query = params.toString();
  return `${API_ROUTES.chatSessions}${query ? `?${query}` : ""}`;
}

export function useChatSessions(module?: ChatModule) {
  return useSWR(sessionListKey(module), async (url: string) => {
    const response = await fetcher<ChatSessionListResponse>(url);
    return { ...response, results: response.results.map(normalizeSession) };
  });
}

export async function createChatSession(request: ChatSessionCreateRequest): Promise<ChatSessionDetail> {
  await getCsrfToken();
  const response = await api.post<ChatSessionDetail>(API_ROUTES.chatSessions, request);
  await globalMutate((key) => typeof key === "string" && key.startsWith(API_ROUTES.chatSessions));
  return normalizeSession(response.data);
}

export async function sendChatMessage(
  sessionId: string,
  request: ChatMessageCreateRequest,
): Promise<ChatTurnResponse> {
  await getCsrfToken();
  const response = await api.post<ChatTurnResponse>(`${API_ROUTES.chatSessions}${sessionId}/messages/`, request);
  await globalMutate((key) => typeof key === "string" && key.startsWith(API_ROUTES.chatSessions));
  return {
    ...response.data,
    session: normalizeSession(response.data.session),
    assistantMessage: normalizeMessage(response.data.assistantMessage),
  };
}

type ChatStreamHandlers = {
  onContent?: (delta: string) => void;
  onStatus?: (message: string) => void;
};

export async function sendChatMessageStream(
  sessionId: string,
  request: ChatMessageCreateRequest,
  handlers: ChatStreamHandlers = {},
): Promise<ChatTurnResponse> {
  await getCsrfToken();
  const response = await fetch(apiUrl(`${API_ROUTES.chatSessions}${sessionId}/messages/stream/`), {
    body: JSON.stringify(request),
    credentials: "include",
    headers: {
      Accept: "text/event-stream",
      "Content-Type": "application/json",
      "X-CSRFToken": getCookie("csrftoken"),
    },
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Chat stream failed with HTTP ${response.status}.`);
  }
  if (!response.body) {
    throw new Error("Chat stream did not include a readable body.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalPayload: ChatTurnResponse | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const rawEvent of events) {
      const event = parseSseEvent(rawEvent);
      if (!event) continue;
      if (event.event === "content") {
        handlers.onContent?.(event.data.delta);
      } else if (event.event === "status") {
        handlers.onStatus?.(event.data.message);
      } else if (event.event === "final") {
        finalPayload = event.data;
      }
    }
  }

  if (buffer.trim()) {
    const event = parseSseEvent(buffer);
    if (event?.event === "final") finalPayload = event.data;
  }
  if (!finalPayload) {
    throw new Error("Chat stream ended before the final response arrived.");
  }
  await globalMutate((key) => typeof key === "string" && key.startsWith(API_ROUTES.chatSessions));
  return {
    ...finalPayload,
    session: normalizeSession(finalPayload.session),
    assistantMessage: normalizeMessage(finalPayload.assistantMessage),
  };
}

function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

function getCookie(name: string): string {
  const prefix = `${name}=`;
  return document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(prefix))
    ?.slice(prefix.length) ?? "";
}

function parseSseEvent(rawEvent: string): ChatStreamEvent | null {
  const lines = rawEvent.split("\n");
  const event = lines
    .find((line) => line.startsWith("event:"))
    ?.slice("event:".length)
    .trim();
  const data = lines
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice("data:".length).trim())
    .join("\n");
  if (!event || !data) return null;
  return { event, data: JSON.parse(data) } as ChatStreamEvent;
}

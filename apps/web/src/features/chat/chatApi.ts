import type {
  ChatMessage,
  ChatMessageCreateRequest,
  ChatModule,
  ChatSession,
  ChatSessionCreateRequest,
  ChatSessionDetail,
  ChatTurnResponse,
} from "@canonos/contracts";
import useSWR, { mutate as globalMutate } from "swr";

import { getCsrfToken } from "@/features/auth/authApi";
import { api } from "@/lib/api";
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


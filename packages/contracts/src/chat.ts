export const CHAT_MODULES = ["tonight", "candidate", "discovery", "detox", "aftertaste"] as const;
export type ChatModule = (typeof CHAT_MODULES)[number];

export const CHAT_MESSAGE_ROLES = ["user", "assistant", "system"] as const;
export type ChatMessageRole = (typeof CHAT_MESSAGE_ROLES)[number];

export type ChatMessageMetadata = {
  action?: "ask_question" | "recommend";
  slots?: Record<string, unknown>;
  quickReplies?: string[];
  provider?: "minimax" | "deterministic" | "system";
  providerNote?: string;
  [key: string]: unknown;
};

export type ChatMessage = {
  id: string;
  role: ChatMessageRole;
  content: string;
  metadata: ChatMessageMetadata;
  createdAt: string;
};

export type ChatSession = {
  id: string;
  module: ChatModule;
  title: string;
  state: {
    slots?: Record<string, unknown>;
    turnCount?: number;
    [key: string]: unknown;
  };
  latestResult: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type ChatSessionDetail = ChatSession & {
  messages: ChatMessage[];
};

export type ChatSessionCreateRequest = {
  module: ChatModule;
  title?: string;
};

export type ChatMessageCreateRequest = {
  content: string;
};

export type ChatTurnResponse = {
  session: ChatSessionDetail;
  assistantMessage: ChatMessage;
  result: Record<string, unknown>;
};

export type ChatStreamEvent =
  | {
      event: "status";
      data: {
        message: string;
        provider?: ChatMessageMetadata["provider"];
      };
    }
  | {
      event: "content";
      data: {
        delta: string;
      };
    }
  | {
      event: "final";
      data: ChatTurnResponse;
    };

import { AzureCogDocument } from "@/features/langchain/vector-stores/azure-cog-search/azure-cog-vector-store";
import { Message } from "ai";

export const CHAT_DOCUMENT_ATTRIBUTE = "CHAT_DOCUMENT";
export const CHAT_THREAD_ATTRIBUTE = "CHAT_THREAD";
export const MESSAGE_ATTRIBUTE = "CHAT_MESSAGE";

export interface ChatMessageModel {
  id: string;
  createdAt: Date;
  isDeleted: boolean;
  threadId: string;
  userId: string;
  content: string;
  role: ChatRole;
  type: "CHAT_MESSAGE";
}

export type ConversationStyle = "creative" | "balanced" | "precise";
export type ChatType = "simple" | "data" | "mssql";

export const GPT_3_5 = "gpt-35-turbo" as const;
export const GPT_4 = "gpt-4o" as const;
export const GPT_4_32K = "gpt-4-32k" as const;

export const NEW_CHAT_DEFAULT_NAME = "New Chat" as const;

export type LLMModel = typeof GPT_3_5 | typeof GPT_4 | typeof GPT_4_32K;

export type ChatRole = "system" | "user" | "assistant" | "function";

export interface ChatThreadModel {
  id: string;
  name: string;
  model: LLMModel;
  createdAt: Date;
  userId: string;
  userName: string;
  isDeleted: boolean;
  chatType: ChatType;
  conversationStyle: ConversationStyle;
  type: "CHAT_THREAD";
}

export interface PromptGPTBody {
  id: string; // thread id
  model: LLMModel; // model name
  chatType: ChatType;
  conversationStyle: ConversationStyle;
}

export interface PromptGPTProps extends PromptGPTBody {
  messages: Message[];
}

// document models
export interface FaqDocumentIndex extends AzureCogDocument {
  id: string;
  user: string;
  chatThreadId: string;
  embedding: number[];
  pageContent: string;
  metadata: any;
}

export interface ChatDocumentModel {
  id: string;
  name: string;
  chatThreadId: string;
  userId: string;
  isDeleted: boolean;
  createdAt: Date;
  type: "CHAT_DOCUMENT";
}

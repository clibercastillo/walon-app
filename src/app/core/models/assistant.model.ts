export interface AssistantChatRequest {
  message: string;
  conversationId: string;
}

export interface AssistantChatReply {
  reply: string;
  bookingCreated: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}
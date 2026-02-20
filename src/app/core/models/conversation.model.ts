
export interface ConversationMessageRaw {
  id:              string;
  role:            string;
  content:         string;
  createdAt?:      string;
  timestamp?:      string;
  voucherAnalyzed?: unknown;
}

export interface ConversationData {
  messages?: ConversationMessageRaw[];
}
export interface ConversationMessage {
  id:              string;
  role:            string;
  content:         string;
  createdAt?:      string;
  timestamp?:      string;
  voucherAnalyzed?: unknown;
}
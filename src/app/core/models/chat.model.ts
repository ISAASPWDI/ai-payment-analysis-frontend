import { Voucher } from './voucher.model';


export interface WsSendMessagePayload {
  message:         string;
  conversationId?: string;
  fileBase64?:     string;
  fileMime?:       string;
  fileName?:       string;
}


export interface WsChatChunkEvent {
  chunk:          string;
  conversationId: string;
}


export interface WsChatDoneEvent {
  conversationId:  string;
  role:            'USER' | 'ASSISTANT';
  timestamp:       string;
  voucherAnalyzed?: Voucher;
  insights?:       Record<string, unknown>;
}


export interface WsChatErrorEvent {
  message: string;
}


export interface ChatResponse {
  conversationId:  string;
  role:            'USER' | 'ASSISTANT';
  reply:           string;
  timestamp:       string;
  voucherAnalyzed?: Voucher;
  insights?:       Record<string, unknown>;
}
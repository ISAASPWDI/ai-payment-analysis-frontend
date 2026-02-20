import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { ApiService } from './api.service';
import { SocketService } from './socket.service';
import { VoucherStateService } from './voucher-state.service';
import { ChatResponse, WsChatChunkEvent, WsChatDoneEvent, WsChatErrorEvent } from '../models/chat.model';
import { Voucher } from '../models/voucher.model';
import { ConversationMessage } from '../models/conversation.model';

export interface ChatMessage {
  id:               string;
  role:             'USER' | 'ASSISTANT';
  content:          string;
  timestamp:        Date;
  isLoading?:       boolean;
  voucherAnalyzed?: Voucher; 
}

@Injectable({ providedIn: 'root' })
export class ChatStateService implements OnDestroy {
  private readonly api    = inject(ApiService);
  private readonly socket = inject(SocketService);
  private readonly vault  = inject(VoucherStateService);

  readonly messages = signal<ChatMessage[]>([]);
  readonly sending  = signal(false);

  private conversationId: string | undefined;


  // obtien el id del mensaje 
  private streamingMsgId: string | undefined;

  private readonly destroy$ = new Subject<void>();

  constructor() {
    this.initSocketListeners();
    this.socket.connect();
  }

  // configuracion del socket
  private initSocketListeners(): void {
    this.socket.chunk$
      .pipe(takeUntil(this.destroy$))
      .subscribe((event: WsChatChunkEvent) => this.onChunk(event));

    this.socket.done$
      .pipe(takeUntil(this.destroy$))
      .subscribe((event: WsChatDoneEvent) => this.onDone(event));

    this.socket.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe((event: WsChatErrorEvent) => this.onError(event));
  }

  private onChunk(event: WsChatChunkEvent): void {
    if (!this.streamingMsgId) return;
    const id = this.streamingMsgId;

    this.messages.update(msgs =>
      msgs.map(m =>
        m.id === id
          ? { ...m, content: m.content + event.chunk, isLoading: false }
          : m,
      ),
    );
  }

  private onDone(event: WsChatDoneEvent): void {
    if (!this.streamingMsgId) return;
    const id = this.streamingMsgId;
    this.streamingMsgId = undefined;

    this.conversationId = event.conversationId;

    this.messages.update(msgs =>
      msgs.map(m =>
        m.id === id
          ? {
              ...m,
              isLoading:       false,
              timestamp:       new Date(event.timestamp),
              voucherAnalyzed: event.voucherAnalyzed,
            }
          : m,
      ),
    );

    if (event.voucherAnalyzed) {
      this.vault.addOrUpdate(event.voucherAnalyzed);
      this.vault.loadInsights();
    }

    this.sending.set(false);
  }

  private onError(event: WsChatErrorEvent): void {
    if (!this.streamingMsgId) return;
    const id = this.streamingMsgId;
    this.streamingMsgId = undefined;

    this.messages.update(msgs =>
      msgs.map(m =>
        m.id === id
          ? { ...m, content: `❌ ${event.message}`, isLoading: false }
          : m,
      ),
    );

    this.sending.set(false);
  }

  // public api
  loadConversation(convId: string): void {
    if (this.conversationId === convId) return;
    this.conversationId = convId;
    this.messages.set([]);

    this.api.getConversation(convId).subscribe({
      next: (msgs: ConversationMessage[]) => {
        const mapped = msgs.map(m => ({
          id:              m.id,
          role:            m.role as 'USER' | 'ASSISTANT',
          content:         m.content,
          timestamp:       new Date(m.createdAt ?? m.timestamp ?? Date.now()),
          voucherAnalyzed: m.voucherAnalyzed as Voucher | undefined,
        }));
        this.messages.set(mapped);
      },
      error: () => this.messages.set([]),
    });
  }

  // agregar un mensaje des[ues de confiramar la solicitud http
  addAssistantMessage(resp: ChatResponse): void {
    const msg: ChatMessage = {
      id:              crypto.randomUUID(),
      role:            'ASSISTANT',
      content:         resp.reply,
      timestamp:       new Date(resp.timestamp),
      voucherAnalyzed: resp.voucherAnalyzed,
    };
    this.messages.update(m => [...m, msg]);
    if (resp.conversationId) {
      this.conversationId = resp.conversationId;
    }
  }

  sendMessage(content: string, file?: File, convId?: string): void {
    if (convId && convId !== this.conversationId) {
      this.conversationId = convId;
    }

    const userMsg: ChatMessage = {
      id:        crypto.randomUUID(),
      role:      'USER',
      content,
      timestamp: new Date(),
    };

    const assistantMsgId = crypto.randomUUID();
    const loadingMsg: ChatMessage = {
      id:        assistantMsgId,
      role:      'ASSISTANT',
      content:   '',
      timestamp: new Date(),
      isLoading: true,
    };

    this.streamingMsgId = assistantMsgId;
    this.messages.update(m => [...m, userMsg, loadingMsg]);
    this.sending.set(true);

    if (file) {
      this.readFileAsBase64(file).then(fileBase64 => {
        this.socket.sendMessage({
          message:        content,
          conversationId: this.conversationId,
          fileBase64,
          fileMime:       file.type,
          fileName:       file.name,
        });
      });
    } else {
      this.socket.sendMessage({
        message:        content,
        conversationId: this.conversationId,
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.socket.disconnect();
  }

  // helper
  private readFileAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }
}



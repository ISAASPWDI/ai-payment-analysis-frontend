import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import {
  WsSendMessagePayload,
  WsChatChunkEvent,
  WsChatDoneEvent,
  WsChatErrorEvent,
} from '../models/chat.model';

@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {
  private socket: Socket | null = null;

  private readonly chunkSubject  = new Subject<WsChatChunkEvent>();
  private readonly doneSubject   = new Subject<WsChatDoneEvent>();
  private readonly errorSubject  = new Subject<WsChatErrorEvent>();

  readonly chunk$: Observable<WsChatChunkEvent>  = this.chunkSubject.asObservable();
  readonly done$:  Observable<WsChatDoneEvent>   = this.doneSubject.asObservable();
  readonly error$: Observable<WsChatErrorEvent>  = this.errorSubject.asObservable();

  connect(): void {
    if (this.socket?.connected) return;

    this.socket = io(`${environment.apiUrl}/chat`, {
      transports: ['websocket'],
    });

    this.socket.on('chat.chunk', (event: WsChatChunkEvent) => {
      this.chunkSubject.next(event);
    });

    this.socket.on('chat.done', (event: WsChatDoneEvent) => {
      this.doneSubject.next(event);
    });

    this.socket.on('chat.error', (event: WsChatErrorEvent) => {
      this.errorSubject.next(event);
    });

    this.socket.on('connect', () =>
      console.log('[SocketService] Connected:', this.socket?.id),
    );

    this.socket.on('disconnect', () =>
      console.log('[SocketService] Disconnected'),
    );
  }

  sendMessage(payload: WsSendMessagePayload): void {
    if (!this.socket?.connected) {
      this.connect();
    }
    this.socket!.emit('chat.message', payload);
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
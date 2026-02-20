import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ExtractOnlyResponse, Voucher, VoucherFilters, VoucherInsights } from '../models/voucher.model';
import { ChatResponse } from '../models/chat.model';
import { ConversationData, ConversationMessageRaw } from '../models/conversation.model';
import { ApiResponse } from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;


  getConversation(conversationId: string): Observable<ConversationMessageRaw[]> {
    return this.http
      .get<ApiResponse<ConversationData>>(`${this.base}/chat/${conversationId}`)
      .pipe(map(r => r.data?.messages ?? (r.data as unknown as ConversationMessageRaw[]) ?? []));
  }

  extractOnly(file: File): Observable<ExtractOnlyResponse> {
    const form = new FormData();
    form.append('file', file);
    form.append('message', '');
    return this.http
      .post<ApiResponse<ExtractOnlyResponse>>(`${this.base}/chat/extract`, form)
      .pipe(map(r => r.data));
  }

  confirmVoucher(form: FormData): Observable<ChatResponse> {
    return this.http
      .post<ApiResponse<ChatResponse>>(`${this.base}/chat/confirm`, form)
      .pipe(map(r => r.data));
  }


  getVouchers(filters: VoucherFilters = {}): Observable<Voucher[]> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    });
    return this.http
      .get<ApiResponse<Voucher[]>>(`${this.base}/vouchers`, { params })
      .pipe(map(r => r.data));
  }

  getVoucherById(id: string): Observable<Voucher> {
    return this.http
      .get<ApiResponse<Voucher>>(`${this.base}/vouchers/${id}`)
      .pipe(map(r => r.data));
  }

  updateVoucher(id: string, payload: Partial<Voucher>): Observable<Voucher> {
    return this.http
      .patch<ApiResponse<Voucher>>(`${this.base}/vouchers/${id}`, payload)
      .pipe(map(r => r.data));
  }

  getInsights(): Observable<VoucherInsights> {
    return this.http
      .get<ApiResponse<VoucherInsights>>(`${this.base}/vouchers/insights`)
      .pipe(map(r => r.data));
  }
}




import {
  Component, OnInit, inject, signal,
  ViewChild, ElementRef, AfterViewChecked,
  input, output, effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatStateService } from '../../core/services/chat-state.service';
import { VoucherStateService } from '../../core/services/voucher-state.service';
import { ApiService} from '../../core/services/api.service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

import { ExtractedVoucherData, Voucher } from '../../core/models/voucher.model';
import { ChatMessage } from '../../core/services/chat-state.service';

export interface ExtractedDraft {
  payer: string;
  payee: string;
  amount: string;
  currency: string;
  payment_date: string;
  description: string;
  reference_number: string;
  bank_name: string;
  confidence_score: number;
  raw_text: string;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
})
export class ChatComponent implements OnInit, AfterViewChecked {
  @ViewChild('msgEnd') msgEnd!: ElementRef<HTMLDivElement>;

  readonly chatState = inject(ChatStateService);
  readonly vaultState = inject(VoucherStateService);
  readonly api = inject(ApiService);
  private sanitizer = inject(DomSanitizer);

  leftVisible = input<boolean>(true);
  rightVisible = input<boolean>(true);
  toggleLeft = output<void>();
  toggleRight = output<void>();

  text = signal('');
  dragging = signal(false);
  pendingFile = signal<File | null>(null);
  showRawJson = signal<string | null>(null);


  extracting = signal(false);
  validationMode = signal(false);
  readonly draftData = signal<ExtractedVoucherData | null>(null);
  draftFileB64 = signal<string | null>(null);
  draftFileMime = signal<string | null>(null);
  draftFileName = signal<string | null>(null);
  draftFile = signal<File | null>(null); 
  showDraftRaw = signal(false);
  confirmingFile = signal(false);

  readonly selectedVoucher = this.vaultState.selected;

  constructor() {
    effect(() => {
      const voucher = this.selectedVoucher();
      if (voucher?.conversationId) {
        this.chatState.loadConversation(voucher.conversationId);
      }
    });
  }

  ngOnInit(): void { }
  getVoucher(message: ChatMessage): Voucher | null {
    return message.voucherAnalyzed ?? null;
  }
  ngAfterViewChecked(): void {
    this.msgEnd?.nativeElement?.scrollIntoView({ behavior: 'smooth' });
  }


  onFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) this.pendingFile.set(input.files[0]);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    const file = event.dataTransfer?.files[0];
    if (file) this.pendingFile.set(file);
  }

  clearFile(): void { this.pendingFile.set(null); }


  send(): void {
    const file = this.pendingFile();
    const text = this.text().trim();

    if (file) {
      this.startValidationFlow(file);
      return;
    }

    if (!text) return;
    const selectedV = this.selectedVoucher();
    const contextMsg = selectedV
      ? `[Contexto: comprobante ID=${selectedV.id}, Pagador=${selectedV.payer}, Receptor=${selectedV.payee}, Monto=${selectedV.currency} ${selectedV.amount}, Banco=${selectedV.bankName}, Fecha=${selectedV.paymentDate}, Ref=${selectedV.referenceNumber}, Estado=${selectedV.status}]\n${text}`
      : text;

    this.chatState.sendMessage(contextMsg, undefined, selectedV?.conversationId);
    this.text.set('');
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); this.send(); }
  }


  startValidationFlow(file: File): void {
    this.extracting.set(true);
    this.pendingFile.set(null);
    this.text.set('');

    this.api.extractOnly(file).subscribe({
      next: (resp) => {
        this.draftData.set({ ...resp.extracted });
        this.draftFileB64.set(resp.fileBase64);
        this.draftFileMime.set(resp.fileMime);
        this.draftFileName.set(resp.fileName);
        this.draftFile.set(file);
        this.extracting.set(false);
        this.validationMode.set(true);
      },
      error: () => {
        this.extracting.set(false);

        this.chatState.sendMessage('Analiza este comprobante', file);
      },
    });
  }

  cancelValidation(): void {
    this.validationMode.set(false);
    this.draftData.set(null);
    this.draftFileB64.set(null);
    this.draftFileMime.set(null);
    this.draftFile.set(null);
    this.showDraftRaw.set(false);
  }

  confirmAndSave(): void {
    const file = this.draftFile();
    const draft = this.draftData();
    if (!file || !draft) return;

    this.confirmingFile.set(true);

    const selectedV = this.selectedVoucher();
    const form = new FormData();
    form.append('file', file);
    form.append('payer', draft.payer);
    form.append('payee', draft.payee);
    form.append('amount', draft.amount);
    form.append('currency', draft.currency);
    form.append('payment_date', draft.payment_date);
    form.append('description', draft.description ?? '');
    form.append('reference_number', draft.reference_number);
    form.append('bank_name', draft.bank_name);
    form.append('confidence_score', String(draft.confidence_score ?? ''));
    if (selectedV?.conversationId) {
      form.append('conversationId', selectedV.conversationId);
    }

    this.api.confirmVoucher(form).subscribe({
      next: (resp) => {
        if (resp.voucherAnalyzed) {
          this.vaultState.addOrUpdate(resp.voucherAnalyzed);
          this.vaultState.loadInsights();
        }
        this.chatState.addAssistantMessage(resp);
        this.confirmingFile.set(false);
        this.cancelValidation();
      },
      error: () => {
        this.confirmingFile.set(false);
      },
    });
  }

  updateDraft(field: keyof ExtractedDraft, value: string): void {
    const data = this.draftData();
    if (data) this.draftData.set({ ...data, [field]: value });
  }

  getDraftPreviewUrl(): SafeUrl {
    const b64 = this.draftFileB64();
    const mime = this.draftFileMime();
    if (!b64 || !mime) return '';
    return this.sanitizer.bypassSecurityTrustUrl(`data:${mime};base64,${b64}`);
  }

  isPdf(): boolean {
    return this.draftFileMime()?.includes('pdf') ?? false;
  }

  formatJson(obj: unknown): string { return JSON.stringify(obj, null, 2); }
  placeholder(): string {
    const sv = this.selectedVoucher();
    return sv ? `Pregunta sobre ${sv.payee || sv.payer}…` : 'Escribe un mensaje o adjunta un comprobante…';
  }
  toggleRawJson(id: string): void { this.showRawJson.update(view => view === id ? null : id); }
  toggleDraftRaw(): void { this.showDraftRaw.set(!this.showDraftRaw()); }
  getStatusLabel(status: string): string {
    return ({ ANALYZED: 'Procesado', PENDING: 'Pendiente', CORRECTED: 'Corregido', REJECTED: 'Error' } as any)[status] ?? status;
  }
  getStatusClass(status: string): string {
    return ({
      ANALYZED: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
      PENDING: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
      CORRECTED: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
      REJECTED: 'text-red-400 bg-red-400/10 border-red-400/20',
    } as any)[status] ?? 'text-gray-400 bg-gray-400/10 border-gray-400/20';
  }
}
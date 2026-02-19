import {
  Component, OnInit, inject, signal,
  ViewChild, ElementRef, AfterViewChecked, input
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatStateService } from '../../core/services/chat-state.service';
import { VoucherStateService } from '../../core/services/voucher-state.service';



@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
})
export class ChatComponent implements OnInit, AfterViewChecked {
  @ViewChild('msgEnd') msgEnd!: ElementRef<HTMLDivElement>;

  readonly chatState   = inject(ChatStateService);
  readonly vaultState  = inject(VoucherStateService);

  text         = signal('');
  dragging     = signal(false);
  pendingFile  = signal<File | null>(null);

  readonly selectedVoucher = this.vaultState.selected;

  ngOnInit(): void {}

  ngAfterViewChecked(): void {
    this.msgEnd?.nativeElement?.scrollIntoView({ behavior: 'smooth' });
  }

  send(): void {
    const t    = this.text().trim();
    const file = this.pendingFile();
    if (!t && !file) return;
    this.chatState.sendMessage(t || 'Analiza este comprobante', file ?? undefined);
    this.text.set('');
    this.pendingFile.set(null);
  }

  onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.send(); }
  }

  onFileInput(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.files?.[0]) this.pendingFile.set(input.files[0]);
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.dragging.set(false);
    const file = e.dataTransfer?.files[0];
    if (file) this.pendingFile.set(file);
  }

  placeholder(): string {
    const sv = this.selectedVoucher();
    if (sv) return `Pregunta sobre ${sv.payee || sv.payer}…`;
    return 'Escribe un mensaje o adjunta un comprobante…';
  }

  clearFile(): void { this.pendingFile.set(null); }
}
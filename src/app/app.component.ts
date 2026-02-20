import { Component, HostListener, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VoucherPanelComponent } from './features/vouchers/voucher-panel.component';
import { ChatComponent } from './features/chat/chat.component';
import { InsightsPanelComponent } from './features/insights/insights-panel.component';
import { Voucher } from './core/models/voucher.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, VoucherPanelComponent, ChatComponent, InsightsPanelComponent],
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
  modalVoucher      = signal<Voucher | null>(null);
  leftPanelVisible  = signal(true);
  rightPanelVisible = signal(true);
  isMobile          = signal(false);

  ngOnInit(): void {
    this.checkBreakpoint();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.checkBreakpoint();
  }

  private checkBreakpoint(): void {
    const mobile = window.innerWidth < 768;
    this.isMobile.set(mobile);
    if (mobile) {
      // En mobile los paneles empiezan cerrados
      this.leftPanelVisible.set(false);
      this.rightPanelVisible.set(false);
    }
  }

  openModal(v: Voucher): void { this.modalVoucher.set(v); }
  closeModal(): void           { this.modalVoucher.set(null); }

  toggleLeft(): void {
    this.leftPanelVisible.update(v => !v);
    // En mobile: abrir left cierra right
    if (this.isMobile() && !this.leftPanelVisible()) return;
    if (this.isMobile()) this.rightPanelVisible.set(false);
  }

  toggleRight(): void {
    this.rightPanelVisible.update(v => !v);
    // En mobile: abrir right cierra left
    if (this.isMobile() && !this.rightPanelVisible()) return;
    if (this.isMobile()) this.leftPanelVisible.set(false);
  }

  closeAllPanels(): void {
    this.leftPanelVisible.set(false);
    this.rightPanelVisible.set(false);
  }
}
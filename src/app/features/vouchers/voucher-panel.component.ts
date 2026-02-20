import { Component, OnInit, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Voucher } from '../../core/models/voucher.model';
import { VoucherStateService } from '../../core/services/voucher-state.service';


@Component({
  selector: 'app-voucher-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './voucher-panel.component.html',
})
export class VoucherPanelComponent implements OnInit {
  readonly state = inject(VoucherStateService);
  voucherSelected = output<Voucher>();

  ngOnInit(): void {
    this.state.loadVouchers({ limit: 20 });
  }

  select(v: Voucher): void {
    this.state.selectVoucher(v.id);
    this.voucherSelected.emit(v);
  }

  onSearch(q: string): void {
    this.state.searchQuery.set(q);
  }

  statusColor(status: string): string {
    const map: Record<string, string> = {
      ANALYZED:  'text-emerald-400 bg-emerald-400/10',
      PENDING:   'text-amber-400 bg-amber-400/10',
      CORRECTED: 'text-blue-400 bg-blue-400/10',
      REJECTED:  'text-red-400 bg-red-400/10',
    };
    return map[status] ?? 'text-gray-400 bg-gray-400/10';
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      ANALYZED:  'Procesado',
      PENDING:   'Pendiente',
      CORRECTED: 'Corregido',
      REJECTED:  'Rechazado',
    };
    return map[status] ?? status;
  }

  categoryIcon(v: Voucher): string {
    const b = v.bankName?.toLowerCase() ?? '';
    if (b.includes('uber') || v.payee?.toLowerCase().includes('uber')) return '🚗';
    if (v.payee?.toLowerCase().includes('farm')) return '💊';
    if (v.payee?.toLowerCase().includes('soriana') || v.payee?.toLowerCase().includes('costco')) return '🛒';
    if (v.payee?.toLowerCase().includes('cfe')) return '⚡';
    return '🧾';
  }
}
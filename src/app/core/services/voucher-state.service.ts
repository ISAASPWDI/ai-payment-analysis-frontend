import { Injectable, signal, computed, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Voucher, VoucherFilters, VoucherInsights } from '../models/voucher.model';

@Injectable({ providedIn: 'root' })
export class VoucherStateService {
  private readonly api = inject(ApiService);

  readonly vouchers      = signal<Voucher[]>([]);
  readonly selectedId    = signal<string | null>(null);
  readonly insights      = signal<VoucherInsights | null>(null);
  readonly loading       = signal(false);
  readonly searchQuery   = signal('');

  readonly selected = computed(() =>
    this.vouchers().find(v => v.id === this.selectedId()) ?? null
  );

  readonly filtered = computed(() => {
    const q = this.searchQuery().toLowerCase();
    if (!q) return this.vouchers();
    return this.vouchers().filter(v =>
      v.payer.toLowerCase().includes(q) ||
      v.payee.toLowerCase().includes(q) ||
      v.bankName?.toLowerCase().includes(q) ||
      v.referenceNumber?.toLowerCase().includes(q)
    );
  });

  loadVouchers(filters: VoucherFilters = {}): void {
    this.loading.set(true);
    this.api.getVouchers(filters).subscribe({
      next:  v  => { this.vouchers.set(v); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  loadInsights(): void {
    this.api.getInsights().subscribe(i => this.insights.set(i));
  }

  selectVoucher(id: string): void {
    this.selectedId.set(id);
  }

  addOrUpdate(v: Voucher): void {
    this.vouchers.update(list => {
      const idx = list.findIndex(x => x.id === v.id);
      if (idx >= 0) { const n = [...list]; n[idx] = v; return n; }
      return [v, ...list];
    });
  }

  patchVoucher(id: string, payload: Partial<Voucher>): void {
    this.api.updateVoucher(id, payload).subscribe(updated => {
      this.addOrUpdate(updated);
      this.loadInsights();
    });
  }
}
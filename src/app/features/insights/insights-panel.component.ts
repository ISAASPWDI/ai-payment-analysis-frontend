import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VoucherStateService } from '../../core/services/voucher-state.service';


@Component({
  selector: 'app-insights-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './insights-panel.component.html',
})
export class InsightsPanelComponent implements OnInit {
  readonly state = inject(VoucherStateService);

  ngOnInit(): void {
    this.state.loadInsights();
    this.state.loadVouchers({ limit: 50 });
  }

  weeklyData(): number[] {
    const vouchers = this.state.vouchers();
    const weeks    = [0, 0, 0, 0];
    vouchers.forEach(v => {
      const d   = new Date(v.paymentDate);
      const day = d.getDate();
      const w   = Math.min(Math.floor((day - 1) / 7), 3);
      weeks[w] += Number(v.amount);
    });
    return weeks;
  }

  maxWeekly(): number {
    return Math.max(...this.weeklyData(), 1);
  }

  barHeight(val: number): number {
    return Math.round((val / this.maxWeekly()) * 100);
  }

  topBank(): string {
    const ins = this.state.insights();
    if (!ins?.byBank?.length) return '—';
    return ins.byBank.reduce((a, b) => Number(a.total) > Number(b.total) ? a : b).bank;
  }
}
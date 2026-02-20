import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { VoucherStateService } from '../../core/services/voucher-state.service';
import { Voucher } from '../../core/models/voucher.model';

type Period = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface BarData {
  label: string;
  value: number;
}

@Component({
  selector: 'app-insights-panel',
  standalone: true,
  imports: [CommonModule, NgClass],
  templateUrl: './insights-panel.component.html',
})
export class InsightsPanelComponent {
  readonly state = inject(VoucherStateService);

  ngOnInit(): void {
    this.state.loadInsights();
    this.loadForPeriod('weekly');
  }
  readonly maxBankCount = computed(() => {
    const banks = this.state.insights()?.byBank ?? [];
    const max = Math.max(...banks.map(b => Number(b.count)), 1);
    return Math.ceil(max * 1.4);
  });

  bankBarWidth(count: unknown): number {
    return Math.round((Number(count) / this.maxBankCount()) * 100);
  }

  readonly period = signal<Period>('weekly');

  readonly periods: { key: Period; label: string }[] = [
    { key: 'daily', label: 'Día' },
    { key: 'weekly', label: 'Sem' },
    { key: 'monthly', label: 'Mes' },
    { key: 'yearly', label: 'Año' },
  ];

  setPeriod(period: Period): void {
    this.period.set(period);
    this.loadForPeriod(period);
  }
  private toLocalISODate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private loadForPeriod(period: Period): void {
    const now = new Date();
    let dateFrom: Date;
    const dateTo = new Date(now);

    switch (period) {
      case 'daily':
        dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'weekly':
        dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        break;
      case 'monthly':
        dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'yearly':
        dateFrom = new Date(now.getFullYear(), 0, 1);
        break;
    }

    const filters = {
      limit: 200,
      dateFrom: this.toLocalISODate(dateFrom!),
      dateTo: this.toLocalISODate(dateTo),
    };
    this.state.loadVouchers(filters);
  }

  readonly chartTitle = computed(() => ({
    daily: 'Gasto por hora (hoy)',
    weekly: 'Gasto por día (esta semana)',
    monthly: 'Gasto por semana (este mes)',
    yearly: 'Gasto por mes (este año)',
  }[this.period()]));

  readonly chartData = computed<BarData[]>(() => {
    const vouchers = this.state.vouchers();
    const period = this.period();
    if (period === 'daily') return this.buildDaily(vouchers);
    if (period === 'weekly') return this.buildWeekly(vouchers);
    if (period === 'monthly') return this.buildMonthly(vouchers);
    return this.buildYearly(vouchers);
  });

  readonly maxValue = computed(() =>
    Math.max(...this.chartData().map(date => date.value), 1)
  );

  barHeight(value: number): number {
    const height = Math.round((value / this.maxValue()) * 100);
    return height;
  }

  topBank(): string {
    const ins = this.state.insights();
    if (!ins?.byBank?.length) return '—';
    return ins.byBank.reduce((a, b) =>
      Number(a.total) > Number(b.total) ? a : b
    ).bank;
  }


  private parseDate(raw: unknown): Date {
    if (raw instanceof Date) return raw;
    const str = String(raw ?? '').trim();
    if (!str) return new Date(NaN);

    // YYYY-MM-DD sin hora 
    const ymd = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (ymd) return new Date(`${ymd[1]}-${ymd[2]}-${ymd[3]}T00:00:00`);

    // DD/MM/YYYY
    const dmy = str.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
    if (dmy) return new Date(`${dmy[3]}-${dmy[2]}-${dmy[1]}T00:00:00`);

    return new Date(str);
  }

  private isValid(d: Date): boolean {
    return !isNaN(d.getTime());
  }


  private buildDaily(vouchers: Voucher[]): BarData[] {
    const hours: BarData[] = Array.from({ length: 8 }, (_, i) => ({
      label: `${String(i * 3).padStart(2, '0')}h`,
      value: 0,
    }));
    vouchers.forEach(voucher => {
      const date = this.parseDate(voucher.paymentDate);
      if (!this.isValid(date)) return;
      const idx = Math.floor(date.getHours() / 3);
      if (idx < hours.length) hours[idx].value += Number(voucher.amount) || 0;
    });
    return hours;
  }

  private buildWeekly(vouchers: Voucher[]): BarData[] {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const result: BarData[] = days.map(label => ({ label, value: 0 }));
    vouchers.forEach(voucher => {
      const date = this.parseDate(voucher.paymentDate);
      if (!this.isValid(date)) return;
      result[date.getDay()].value += Number(voucher.amount) || 0;
    });
    return result;
  }

  private buildMonthly(vouchers: Voucher[]): BarData[] {
    const weeks: BarData[] = [
      { label: 'Sem 1', value: 0 },
      { label: 'Sem 2', value: 0 },
      { label: 'Sem 3', value: 0 },
      { label: 'Sem 4', value: 0 },
    ];
    vouchers.forEach(voucher => {
      const date = this.parseDate(voucher.paymentDate);
      if (!this.isValid(date)) return;
      weeks[Math.min(Math.floor((date.getDate() - 1) / 7), 3)].value += Number(voucher.amount) || 0;
    });
    return weeks;
  }

  private buildYearly(vouchers: Voucher[]): BarData[] {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const result: BarData[] = months.map(label => ({ label, value: 0 }));
    vouchers.forEach(voucher => {
      const date = this.parseDate(voucher.paymentDate);
      if (!this.isValid(date)) return;
      result[date.getMonth()].value += Number(voucher.amount) || 0;
    });
    return result;
  }
}
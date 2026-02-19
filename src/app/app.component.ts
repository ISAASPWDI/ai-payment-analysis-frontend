import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VoucherPanelComponent } from './features/vouchers/voucher-panel.component';
import { ChatComponent } from './features/chat/chat.component';
import { InsightsPanelComponent } from './features/insights/insights-panel.component';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, VoucherPanelComponent, ChatComponent, InsightsPanelComponent],
  templateUrl: './app.component.html',
})
export class AppComponent {}
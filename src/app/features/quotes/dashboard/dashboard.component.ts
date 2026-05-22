import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { CurrencyPipe, NgClass } from '@angular/common';
import {
  QuoteService,
  QuoteResponse,
  QuoteKpiResponse,
} from '../../../core/services/quote.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    CurrencyPipe,
    NgClass,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private quoteService = inject(QuoteService);

  quotes: QuoteResponse[] = [];
  kpis: QuoteKpiResponse = { pending: 0, calculated: 0, approved: 0 };

  displayedColumns: string[] = [
    'id',
    'customerName',
    'customerCnpj',
    'totalPremium',
    'status',
    'actions',
  ];

  totalElements = 0;
  pageSize = 10;
  currentPage = 0;
  isLoading = false;

  ngOnInit() {
    this.loadQuotes();
    this.loadKpis();
  }

  loadKpis() {
    this.quoteService.getKpis().subscribe({
      next: (data) => (this.kpis = data),
      error: (err) => console.error('Erro ao carregar KPIs', err),
    });
  }

  loadQuotes() {
    this.isLoading = true;
    this.quoteService.getQuotes(this.currentPage, this.pageSize).subscribe({
      next: (page) => {
        this.quotes = page.content;
        this.totalElements = page.totalElements;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erro ao carregar cotações:', err);
        this.isLoading = false;
      },
    });
  }

  onPageChange(event: PageEvent) {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadQuotes();
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'status-pending';
      case 'CALCULATED':
        return 'status-calculated';
      case 'APPROVED':
        return 'status-approved';
      default:
        return 'status-default';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'Pendente';
      case 'CALCULATED':
        return 'Calculado';
      case 'APPROVED':
        return 'Aprovado';
      default:
        return status;
    }
  }
}

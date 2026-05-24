import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CurrencyPipe, NgClass } from '@angular/common';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
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
    ReactiveFormsModule,
    CurrencyPipe,
    NgClass,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private quoteService = inject(QuoteService);
  private fb = inject(FormBuilder);

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

  filterForm: FormGroup = this.fb.group({
    term: [''],
    status: [''],
  });

  ngOnInit() {
    this.loadQuotes();
    this.loadKpis();

    this.filterForm.valueChanges
      .pipe(debounceTime(500), distinctUntilChanged())
      .subscribe(() => {
        this.currentPage = 0;
        this.loadQuotes();
      });
  }

  loadKpis() {
    this.quoteService.getKpis().subscribe({
      next: (data) => (this.kpis = data),
      error: (err) => console.error('Erro ao carregar KPIs', err),
    });
  }

  loadQuotes() {
    this.isLoading = true;
    const filters = this.filterForm.value;

    this.quoteService
      .getQuotes(this.currentPage, this.pageSize, filters)
      .subscribe({
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

  clearFilters() {
    this.filterForm.reset({ term: '', status: '' });
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

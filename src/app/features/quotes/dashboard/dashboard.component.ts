import { Component, inject, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  QuoteService,
  QuoteSummary,
} from '../../../core/services/quote.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    MatCardModule,
    MatIconModule,
    MatTableModule,
    MatButtonModule,
    MatChipsModule,
    DatePipe,
    CurrencyPipe,
    RouterLink,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private quoteService = inject(QuoteService);

  displayedColumns: string[] = [
    'customerName',
    'createdAt',
    'status',
    'totalPremium',
    'actions',
  ];

  quotes: QuoteSummary[] = [];
  isLoading = true;

  kpis = { pending: 12, calculated: 5, approved: 28 };

  ngOnInit() {
    this.loadQuotes();
  }

  loadQuotes() {
    this.isLoading = true;
    this.quoteService.getQuotes(0, 10).subscribe({
      next: (response) => {
        this.quotes = response.content;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error searching for quotes.', err);
        this.isLoading = false;
      },
    });
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface QuoteSummary {
  id: string;
  customerName: string;
  status: 'PENDING' | 'CALCULATED' | 'APPROVED';
  createdAt: string;
  updatedAt: string;
  totalPremium?: number;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
}

export interface VehicleQuote {
  licensePlate: string;
  fipeCode: string;
  yearId: string;
  coverageLimit: number;
}

export interface CreateQuoteRequest {
  customerName: string;
  customerCnpj: string;
  brokerName: string;
  vehicles: VehicleQuote[];
}

@Injectable({
  providedIn: 'root',
})
export class QuoteService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/quotes`;

  getQuotes(
    page: number = 0,
    size: number = 10,
  ): Observable<PageResponse<QuoteSummary>> {
    return this.http.get<PageResponse<QuoteSummary>>(
      `${this.apiUrl}?page=${page}&size=${size}`,
    );
  }

  createQuote(data: CreateQuoteRequest): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(this.apiUrl, data);
  }

  calculateQuote(id: number, data: CreateQuoteRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/calculate`, data);
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface QuoteResponse {
  id: number;
  customerName: string;
  customerCnpj: string;
  brokerName: string;
  totalPremium: number | null;
  status: string;
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

export interface QuoteKpiResponse {
  pending: number;
  calculated: number;
  approved: number;
}

export interface QuoteVehicleDetails {
  id: number;
  licensePlate: string;
  fipeCode: string;
  yearId: string;
  coverageLimit: number;
  modelName: string;
  fipeValue: number;
  calculatedPremium: number | null;
}

export interface QuoteDetails {
  id: number;
  customerName: string;
  customerCnpj: string;
  brokerName: string;
  status: string;
  totalPremium: number | null;
  vehicles: QuoteVehicleDetails[];
}

@Injectable({
  providedIn: 'root',
})
export class QuoteService {
  private http = inject(HttpClient);

  private apiUrl = `${environment.apiUrl}/quotes`;
  private documentApiUrl = `${environment.apiUrl}/documents`;

  getQuotes(
    page: number = 0,
    size: number = 10,
  ): Observable<PageResponse<QuoteResponse>> {
    return this.http.get<PageResponse<QuoteResponse>>(
      `${this.apiUrl}?page=${page}&size=${size}`,
    );
  }

  createQuote(data: CreateQuoteRequest): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(this.apiUrl, data);
  }

  calculateQuote(id: number, data: CreateQuoteRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/calculate`, data);
  }

  getKpis(): Observable<QuoteKpiResponse> {
    return this.http.get<QuoteKpiResponse>(`${this.apiUrl}/kpis`);
  }

  getQuoteById(id: number): Observable<QuoteDetails> {
    return this.http.get<QuoteDetails>(`${this.apiUrl}/${id}`);
  }

  updateQuote(id: number, data: CreateQuoteRequest): Observable<QuoteResponse> {
    return this.http.put<QuoteResponse>(`${this.apiUrl}/${id}`, data);
  }

  approveQuote(id: number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/approve`, {});
  }

  resendDocument(id: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/resend-document`, {});
  }

  downloadProposal(id: number): Observable<Blob> {
    return this.http.get(`${this.documentApiUrl}/quotes/${id}/pdf`, {
      responseType: 'blob',
    });
  }
}

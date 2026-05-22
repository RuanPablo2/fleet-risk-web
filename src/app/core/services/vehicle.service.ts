import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface VehicleSearchResult {
  fipeCode: string;
  name: string;
  yearId: string;
  price?: number;
}

export interface VehicleYear {
  code: string;
  name: string;
}

@Injectable({
  providedIn: 'root',
})
export class VehicleService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/vehicles`;

  searchModels(query: string): Observable<VehicleSearchResult[]> {
    return this.http.get<VehicleSearchResult[]>(
      `${this.apiUrl}/models/search?query=${query}`,
    );
  }

  getAvailableYears(fipeCode: string): Observable<VehicleYear[]> {
    return this.http.get<VehicleYear[]>(`${this.apiUrl}/${fipeCode}/years`);
  }
}

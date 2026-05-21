import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface AuthResponse {
  token: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = `${environment.apiUrl}/auth`;

  currentUserToken = signal<string | null>(
    localStorage.getItem('fleetrisk_token'),
  );

  login(credentials: any) {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/login`, credentials)
      .pipe(
        tap((response) => {
          this.setSession(response.token);
        }),
      );
  }

  register(brokerData: any) {
    return this.http.post<any>(`${this.apiUrl}/register`, brokerData);
  }

  logout() {
    localStorage.removeItem('fleetrisk_token');
    this.currentUserToken.set(null);
    this.router.navigate(['/auth/login']);
  }

  isAuthenticated(): boolean {
    return !!this.currentUserToken();
  }

  private setSession(token: string) {
    localStorage.setItem('fleetrisk_token', token);
    this.currentUserToken.set(token);
    this.router.navigate(['/quotes']);
  }
}

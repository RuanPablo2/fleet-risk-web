import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(
        (m) => m.LoginComponent,
      ),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register.component').then(
        (m) => m.RegisterComponent,
      ),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./core/layout/layout.component').then((m) => m.LayoutComponent),
    children: [
      {
        path: 'quotes',
        loadComponent: () =>
          import('./features/quotes/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
      },
      {
        path: 'quotes/new',
        loadComponent: () =>
          import('./features/quotes/quote-create/quote-create.component').then(
            (m) => m.QuoteCreateComponent,
          ),
      },
      {
        path: 'quotes/edit/:id',
        loadComponent: () =>
          import('./features/quotes/quote-edit/quote-edit.component').then(
            (m) => m.QuoteEditComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];

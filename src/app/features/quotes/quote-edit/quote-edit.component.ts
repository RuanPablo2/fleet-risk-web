import { Component, inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  FormControl,
} from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { MatStepperModule } from '@angular/material/stepper';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CurrencyPipe, AsyncPipe } from '@angular/common';
import { Observable, of } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  switchMap,
  catchError,
} from 'rxjs/operators';
import {
  QuoteService,
  CreateQuoteRequest,
  VehicleQuote,
  QuoteDetails,
} from '../../../core/services/quote.service';
import {
  VehicleService,
  VehicleSearchResult,
  VehicleYear,
} from '../../../core/services/vehicle.service';

@Component({
  selector: 'app-quote-edit',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatStepperModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatAutocompleteModule,
    MatProgressSpinnerModule,
    CurrencyPipe,
    AsyncPipe,
  ],
  templateUrl: './quote-edit.component.html',
  styleUrl: './quote-edit.component.scss',
})
export class QuoteEditComponent implements OnInit {
  private fb = inject(FormBuilder);
  private quoteService = inject(QuoteService);
  private vehicleService = inject(VehicleService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  quoteId!: number;
  isLoadingData = true;
  isSubmitting = false;

  customerForm: FormGroup = this.fb.group({
    customerName: ['', [Validators.required, Validators.minLength(3)]],
    customerCnpj: [
      '',
      [Validators.required, Validators.minLength(18), Validators.maxLength(18)],
    ],
  });

  vehicleForm: FormGroup = this.fb.group({
    licensePlate: [
      '',
      [Validators.required, Validators.minLength(8), Validators.maxLength(8)],
    ],
    fipeCode: ['', Validators.required],
    yearId: ['', Validators.required],
    coverageLimit: [1000000, [Validators.required, Validators.min(1)]],
  });

  modelSearchControl = new FormControl('');
  filteredVehicles$!: Observable<VehicleSearchResult[]>;
  availableYears: VehicleYear[] = [];
  isLoadingYears = false;

  vehicles: VehicleQuote[] = [];
  displayedColumns: string[] = [
    'licensePlate',
    'fipeCode',
    'yearId',
    'coverageLimit',
    'actions',
  ];

  ngOnInit() {
    this.quoteId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadQuoteData();

    this.filteredVehicles$ = this.modelSearchControl.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      switchMap((query) => {
        if (query && query.length >= 3) {
          return this.vehicleService
            .searchModels(query)
            .pipe(catchError(() => of([])));
        }
        return of([]);
      }),
    );
  }

  loadQuoteData() {
    this.quoteService.getQuoteById(this.quoteId).subscribe({
      next: (quote: QuoteDetails) => {
        this.customerForm.patchValue({
          customerName: quote.customerName,
          customerCnpj: quote.customerCnpj,
        });

        this.vehicles = quote.vehicles.map((v) => ({
          licensePlate: v.licensePlate,
          fipeCode: v.fipeCode,
          yearId: v.yearId,
          coverageLimit: v.coverageLimit,
        }));

        this.isLoadingData = false;
      },
      error: (err) => {
        console.error('Erro ao carregar cotação:', err);
        alert('Cotação não encontrada ou sem permissão.');
        this.router.navigate(['/quotes']);
      },
    });
  }

  onCnpjInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');
    if (value.length > 14) value = value.slice(0, 14);
    value = value.replace(/^(\d{2})(\d)/, '$1.$2');
    value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
    value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
    value = value.replace(/(\d{4})(\d)/, '$1-$2');
    input.value = value;
    this.customerForm
      .get('customerCnpj')
      ?.setValue(value, { emitEvent: false });
  }

  onPlateInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (value.length > 7) value = value.slice(0, 7);
    if (value.length > 3)
      value = value.replace(/^([A-Z]{3})([0-9A-Z]{0,4})/, '$1-$2');
    input.value = value;
    this.vehicleForm.get('licensePlate')?.setValue(value, { emitEvent: false });
  }

  displayVehicle(vehicle: VehicleSearchResult): string {
    return vehicle ? `${vehicle.name} (FIPE: ${vehicle.fipeCode})` : '';
  }

  onVehicleSelected(vehicle: VehicleSearchResult) {
    this.vehicleForm.patchValue({ fipeCode: vehicle.fipeCode, yearId: '' });
    this.availableYears = [];
    this.isLoadingYears = true;
    this.vehicleService.getAvailableYears(vehicle.fipeCode).subscribe({
      next: (years) => {
        this.availableYears = years;
        this.isLoadingYears = false;
      },
      error: () => (this.isLoadingYears = false),
    });
  }

  addVehicle() {
    if (this.vehicleForm.valid) {
      this.vehicles = [...this.vehicles, this.vehicleForm.value];
      this.vehicleForm.reset({ coverageLimit: 1000000 });
      this.modelSearchControl.reset();
      this.availableYears = [];
    }
  }

  removeVehicle(index: number) {
    this.vehicles = this.vehicles.filter((_, i) => i !== index);
  }

  onSubmit(shouldCalculate: boolean) {
    if (this.customerForm.valid && this.vehicles.length > 0) {
      this.isSubmitting = true;
      const payload: CreateQuoteRequest = {
        customerName: this.customerForm.value.customerName,
        customerCnpj: this.customerForm.value.customerCnpj,
        brokerName: 'Corretor Logado',
        vehicles: this.vehicles,
      };

      if (shouldCalculate) {
        this.quoteService.calculateQuote(this.quoteId, payload).subscribe({
          next: () => this.router.navigate(['/quotes']),
          error: (err) => {
            console.error('Erro ao calcular:', err);
            this.isSubmitting = false;
          },
        });
      } else {
        this.quoteService.updateQuote(this.quoteId, payload).subscribe({
          next: () => this.router.navigate(['/quotes']),
          error: (err) => {
            console.error('Erro ao atualizar:', err);
            this.isSubmitting = false;
          },
        });
      }
    }
  }
}

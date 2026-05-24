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

import { WebsocketService } from '../../../core/services/websocket.service';

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
  private websocketService = inject(WebsocketService);

  quoteId!: number;
  isLoadingData = true;
  isSubmitting = false;
  isCalculating = false;
  isActionProcessing = false;
  isApproved = false;
  quoteDetails?: QuoteDetails;

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

    this.customerForm.valueChanges.subscribe(() => {
      this.resetCalculationState();
    });

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

    this.websocketService.watchQuoteStatus(this.quoteId).subscribe((status) => {
      if (status === 'CALCULATED') {
        console.log('Recarregando a tela...');
        this.isSubmitting = false;
        this.isCalculating = false;
        this.loadQuoteData();
      }
    });
  }

  loadQuoteData() {
    this.quoteService.getQuoteById(this.quoteId).subscribe({
      next: (quote: QuoteDetails) => {
        this.quoteDetails = quote;
        this.isApproved = quote.status === 'APPROVED';

        this.customerForm.patchValue(
          {
            customerName: quote.customerName,
            customerCnpj: quote.customerCnpj,
          },
          { emitEvent: false },
        );

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

  resetCalculationState() {
    if (this.quoteDetails?.totalPremium || this.isApproved) {
      if (this.quoteDetails) {
        this.quoteDetails.totalPremium = null;
      }
      this.isApproved = false;
      console.log(
        'Cotação alterada! Prêmio invalidado, necessário recalcular.',
      );
    }
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
    this.resetCalculationState();
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
      this.resetCalculationState();
    }
  }

  removeVehicle(index: number) {
    this.vehicles = this.vehicles.filter((_, i) => i !== index);
    this.resetCalculationState();
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
        this.isCalculating = true;
        this.quoteService.calculateQuote(this.quoteId, payload).subscribe({
          next: () => {
            console.log('Cálculo enviado para a fila. Aguardando retorno...');
          },
          error: (err) => {
            console.error('Erro ao calcular:', err);
            this.isSubmitting = false;
            this.isCalculating = false;
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

  onApproveQuote() {
    if (
      confirm('Confirma a aprovação desta cotação? A proposta será gerada.')
    ) {
      this.isActionProcessing = true;
      this.quoteService.approveQuote(this.quoteId).subscribe({
        next: () => {
          alert('Cotação aprovada com sucesso! O documento está sendo gerado.');
          this.loadQuoteData();
          this.isActionProcessing = false;
        },
        error: (err) => {
          console.error('Erro ao aprovar cotação', err);
          alert('Erro ao aprovar cotação.');
          this.isActionProcessing = false;
        },
      });
    }
  }

  onResendEmail() {
    this.isActionProcessing = true;
    this.quoteService.resendDocument(this.quoteId).subscribe({
      next: () => {
        alert(
          'Comando enviado! O e-mail com a proposta será reenviado em instantes.',
        );
        this.isActionProcessing = false;
      },
      error: () => {
        alert('Erro ao solicitar reenvio do documento.');
        this.isActionProcessing = false;
      },
    });
  }

  onDownloadProposal() {
    this.isActionProcessing = true;
    this.quoteService.downloadProposal(this.quoteId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Proposta_Frota_${this.quoteId}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.isActionProcessing = false;
      },
      error: () => {
        alert('O PDF ainda está sendo gerado pelo motor ou ocorreu um erro.');
        this.isActionProcessing = false;
      },
    });
  }
}

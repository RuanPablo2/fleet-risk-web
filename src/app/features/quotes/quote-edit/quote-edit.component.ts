import { Component, inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { MatStepperModule } from '@angular/material/stepper';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CurrencyPipe } from '@angular/common';

import {
  QuoteService,
  CreateQuoteRequest,
  QuoteDetails,
} from '../../../core/services/quote.service';
import { WebsocketService } from '../../../core/services/websocket.service';

import { QuoteVehicleDialogComponent } from '../quote-vehicle-dialog/quote-vehicle-dialog.component';

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
    MatDialogModule,
    MatProgressSpinnerModule,
    CurrencyPipe,
  ],
  templateUrl: './quote-edit.component.html',
  styleUrl: './quote-edit.component.scss',
})
export class QuoteEditComponent implements OnInit {
  private fb = inject(FormBuilder);
  private quoteService = inject(QuoteService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private websocketService = inject(WebsocketService);
  private dialog = inject(MatDialog);

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

  vehicles: any[] = [];

  displayedColumns: string[] = [
    'licensePlate',
    'modelName',
    'fipeCode',
    'yearId',
    'coverages',
    'calculatedPremium',
    'actions',
  ];

  ngOnInit() {
    this.quoteId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadQuoteData();

    if (history.state && history.state.isCalculating) {
      this.isCalculating = true;
      this.isSubmitting = true;
      this.startPollingFallback();
    }

    this.customerForm.valueChanges.subscribe(() => {
      this.resetCalculationState();
    });

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

        this.vehicles = quote.vehicles.map((v: any) => ({
          licensePlate: v.licensePlate,
          modelName: v.modelName || 'Modelo não informado',
          fipeCode: v.fipeCode,
          yearId: v.yearId,
          coverages: v.coverages || [],
          calculatedPremium: v.calculatedPremium,
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

  openAddVehicleDialog() {
    const dialogRef = this.dialog.open(QuoteVehicleDialogComponent, {
      width: '800px',
      maxWidth: '95vw',
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (
        result &&
        result.vehicles &&
        result.vehicles.length > 0 &&
        !result.isEdit
      ) {
        this.vehicles = [...this.vehicles, ...result.vehicles];
        this.resetCalculationState();
      }
    });
  }

  editVehicle(index: number) {
    const dialogRef = this.dialog.open(QuoteVehicleDialogComponent, {
      width: '800px',
      maxWidth: '95vw',
      disableClose: true,
      data: {
        vehicle: this.vehicles[index],
        index: index,
      },
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (
        result &&
        result.vehicles &&
        result.vehicles.length > 0 &&
        result.isEdit
      ) {
        this.vehicles[result.editIndex] = result.vehicles[0];
        this.vehicles = [...this.vehicles];
        this.resetCalculationState();
      }
    });
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
            this.startPollingFallback();
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
        a.download = `Proposta${this.quoteId}.pdf`;
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

  startPollingFallback() {
    const pollInterval = setInterval(() => {
      if (!this.isCalculating) {
        clearInterval(pollInterval);
        return;
      }

      this.quoteService.getQuoteById(this.quoteId).subscribe({
        next: (quote) => {
          if (quote.status === 'CALCULATED' || quote.status === 'APPROVED') {
            console.log('🔄 Fallback: O cálculo já terminou no backend!');
            this.isCalculating = false;
            this.isSubmitting = false;
            this.loadQuoteData();
            clearInterval(pollInterval);
          }
        },
      });
    }, 3000);
  }
}

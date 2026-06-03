import { Component, inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatStepperModule } from '@angular/material/stepper';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import {
  QuoteService,
  CreateQuoteRequest,
  VehicleQuote,
} from '../../../core/services/quote.service';

import { QuoteVehicleDialogComponent } from '../quote-vehicle-dialog/quote-vehicle-dialog.component';

@Component({
  selector: 'app-quote-create',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatStepperModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatDialogModule,
  ],
  templateUrl: './quote-create.component.html',
  styleUrl: './quote-create.component.scss',
})
export class QuoteCreateComponent implements OnInit {
  private fb = inject(FormBuilder);
  private quoteService = inject(QuoteService);
  private router = inject(Router);
  private dialog = inject(MatDialog);

  customerForm: FormGroup = this.fb.group({
    customerName: ['', [Validators.required, Validators.minLength(3)]],
    customerCnpj: [
      '',
      [Validators.required, Validators.minLength(18), Validators.maxLength(18)],
    ],
  });

  vehicles: VehicleQuote[] = [];

  displayedColumns: string[] = [
    'licensePlate',
    'modelName',
    'fipeCode',
    'yearId',
    'coverages',
    'actions',
  ];

  isSubmitting = false;

  ngOnInit() {}

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

  openAddVehicleDialog() {
    const dialogRef = this.dialog.open(QuoteVehicleDialogComponent, {
      width: '800px',
      maxWidth: '95vw',
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result && result.vehicles && result.vehicles.length > 0) {
        this.vehicles = [...this.vehicles, ...result.vehicles];
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
      }
    });
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

      this.quoteService.createQuote(payload).subscribe({
        next: (response) => {
          if (shouldCalculate) {
            this.quoteService.calculateQuote(response.id, payload).subscribe({
              next: () => {
                this.router.navigate(['/quotes/edit', response.id], {
                  state: { isCalculating: true },
                });
              },
              error: (err) => {
                console.error('Erro ao acionar cálculo:', err);
                alert('Rascunho salvo, mas erro ao calcular.');
                this.router.navigate(['/quotes/edit', response.id]);
              },
            });
          } else {
            this.router.navigate(['/quotes']);
          }
        },
        error: (err) => {
          console.error('Erro ao criar cotação:', err);
          alert('Erro ao salvar. Verifique a conexão.');
          this.isSubmitting = false;
        },
      });
    }
  }
}

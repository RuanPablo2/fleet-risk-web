import { Component, inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  FormControl,
  FormArray,
} from '@angular/forms';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { AsyncPipe, CommonModule } from '@angular/common';
import { Observable, of } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  switchMap,
  catchError,
} from 'rxjs/operators';

import {
  VehicleService,
  VehicleSearchResult,
  VehicleYear,
} from '../../../core/services/vehicle.service';
import {
  CoverageType,
  VehicleCoverageRequest,
  VehicleQuote,
} from '../../../core/services/quote.service';

export interface QuoteVehicleDialogData {
  vehicle?: VehicleQuote;
  index?: number;
}

@Component({
  selector: 'app-quote-vehicle-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatAutocompleteModule,
    MatCheckboxModule,
    AsyncPipe,
  ],
  templateUrl: './quote-vehicle-dialog.component.html',
  styleUrl: './quote-vehicle-dialog.component.scss',
})
export class QuoteVehicleDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private vehicleService = inject(VehicleService);
  public dialogRef = inject(MatDialogRef<QuoteVehicleDialogComponent>);

  public data: QuoteVehicleDialogData =
    inject(MAT_DIALOG_DATA, { optional: true }) || {};
  public isEditMode = false;

  modelSearchControl = new FormControl('');
  filteredVehicles$!: Observable<VehicleSearchResult[]>;
  availableYears: VehicleYear[] = [];
  isLoadingYears = false;

  form: FormGroup = this.fb.group({
    vehicleBase: this.fb.group({
      fipeCode: ['', Validators.required],
      modelName: [''],
      yearId: ['', Validators.required],
    }),

    coverages: this.fb.group({
      casco: [false],
      cascoPercentage: [100, [Validators.min(50), Validators.max(150)]],
      rcfDm: [false],
      rcfDmValue: [50000, [Validators.min(10000)]],
      rcfDc: [false],
      rcfDcValue: [50000, [Validators.min(10000)]],
      rcfDmo: [false],
      rcfDmoValue: [10000, [Validators.min(5000)]],
      appMorte: [false],
      appMorteValue: [10000, [Validators.min(5000)]],
    }),

    plateCount: [
      1,
      [Validators.required, Validators.min(1), Validators.max(50)],
    ],
    plates: this.fb.array([this.createPlateControl()]),
  });

  ngOnInit() {
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

    this.form.get('plateCount')?.valueChanges.subscribe((count) => {
      if (!this.isEditMode) this.updatePlatesArray(count || 1);
    });

    if (this.data && this.data.vehicle) {
      this.isEditMode = true;
      this.loadVehicleData(this.data.vehicle);
    }
  }

  get platesArray(): FormArray {
    return this.form.get('plates') as FormArray;
  }

  private createPlateControl(): FormControl {
    return this.fb.control('', [
      Validators.required,
      Validators.minLength(8),
      Validators.maxLength(8),
    ]);
  }

  private updatePlatesArray(count: number) {
    const currentLength = this.platesArray.length;
    if (count > currentLength) {
      for (let i = currentLength; i < count; i++)
        this.platesArray.push(this.createPlateControl());
    } else if (count < currentLength) {
      for (let i = currentLength - 1; i >= count; i--)
        this.platesArray.removeAt(i);
    }
  }

  displayVehicle(vehicle: VehicleSearchResult | string): string {
    if (typeof vehicle === 'string') return vehicle;
    return vehicle ? `${vehicle.name} (FIPE: ${vehicle.fipeCode})` : '';
  }

  onVehicleSelected(vehicle: VehicleSearchResult) {
    this.form.get('vehicleBase')?.patchValue({
      fipeCode: vehicle.fipeCode,
      modelName: vehicle.name,
      yearId: '',
    });
    this.loadYearsForFipe(vehicle.fipeCode);
  }

  private loadYearsForFipe(fipeCode: string, preselectedYear?: string) {
    this.availableYears = [];
    this.isLoadingYears = true;
    this.vehicleService.getAvailableYears(fipeCode).subscribe({
      next: (years) => {
        this.availableYears = years;
        this.isLoadingYears = false;
        if (preselectedYear) {
          this.form.get('vehicleBase.yearId')?.setValue(preselectedYear);
        }
      },
      error: (err) => {
        console.error('Error fetching FIPE years:', err);
        this.isLoadingYears = false;
      },
    });
  }

  private loadVehicleData(vehicle: VehicleQuote) {
    this.modelSearchControl.setValue(vehicle.modelName || '', {
      emitEvent: false,
    });
    this.form.get('vehicleBase')?.patchValue({
      fipeCode: vehicle.fipeCode,
      modelName: vehicle.modelName || '',
      yearId: vehicle.yearId,
    });

    this.loadYearsForFipe(vehicle.fipeCode, vehicle.yearId);

    this.form.get('plateCount')?.setValue(1);
    this.form.get('plateCount')?.disable();
    this.platesArray.at(0).setValue(vehicle.licensePlate);

    const covValues = {
      casco: false,
      cascoPercentage: 100,
      rcfDm: false,
      rcfDmValue: 50000,
      rcfDc: false,
      rcfDcValue: 50000,
      rcfDmo: false,
      rcfDmoValue: 10000,
      appMorte: false,
      appMorteValue: 10000,
    };

    vehicle.coverages.forEach((cov) => {
      switch (cov.type) {
        case CoverageType.CASCO:
          covValues.casco = true;
          covValues.cascoPercentage = cov.fipePercentage ?? 100;
          break;
        case CoverageType.RCF_DM:
          covValues.rcfDm = true;
          covValues.rcfDmValue = cov.limitAmount ?? 50000;
          break;
        case CoverageType.RCF_DC:
          covValues.rcfDc = true;
          covValues.rcfDcValue = cov.limitAmount ?? 50000;
          break;
        case CoverageType.RCF_DMO:
          covValues.rcfDmo = true;
          covValues.rcfDmoValue = cov.limitAmount ?? 10000;
          break;
        case CoverageType.APP_MORTE:
          covValues.appMorte = true;
          covValues.appMorteValue = cov.limitAmount ?? 10000;
          break;
      }
    });

    this.form.get('coverages')?.patchValue(covValues);
  }

  onPlateInput(event: Event, index: number) {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (value.length > 7) value = value.slice(0, 7);
    if (value.length > 3)
      value = value.replace(/^([A-Z]{3})([0-9A-Z]{0,4})/, '$1-$2');
    input.value = value;
    this.platesArray.at(index).setValue(value, { emitEvent: false });
  }

  onSubmit() {
    if (this.form.valid) {
      const formValue = this.form.getRawValue();
      const covForm = formValue.coverages;
      const coverages: VehicleCoverageRequest[] = [];

      if (covForm.casco)
        coverages.push({
          type: CoverageType.CASCO,
          fipePercentage: covForm.cascoPercentage,
          limitAmount: 0,
        });
      if (covForm.rcfDm)
        coverages.push({
          type: CoverageType.RCF_DM,
          fipePercentage: 0,
          limitAmount: covForm.rcfDmValue,
        });
      if (covForm.rcfDc)
        coverages.push({
          type: CoverageType.RCF_DC,
          fipePercentage: 0,
          limitAmount: covForm.rcfDcValue,
        });
      if (covForm.rcfDmo)
        coverages.push({
          type: CoverageType.RCF_DMO,
          fipePercentage: 0,
          limitAmount: covForm.rcfDmoValue,
        });
      if (covForm.appMorte)
        coverages.push({
          type: CoverageType.APP_MORTE,
          fipePercentage: 0,
          limitAmount: covForm.appMorteValue,
        });

      if (coverages.length === 0) {
        alert(
          'Por favor, selecione pelo menos uma cobertura para este veículo.',
        );
        return;
      }

      const newVehicles: VehicleQuote[] = formValue.plates.map(
        (plate: string) => ({
          licensePlate: plate,
          fipeCode: formValue.vehicleBase.fipeCode,
          yearId: formValue.vehicleBase.yearId,
          modelName: formValue.vehicleBase.modelName,
          coverages: coverages,
        }),
      );

      this.dialogRef.close({
        isEdit: this.isEditMode,
        editIndex: this.data.index,
        vehicles: newVehicles,
      });
    }
  }
}

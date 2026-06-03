import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuoteVehicleDialogComponent } from './quote-vehicle-dialog.component';

describe('QuoteVehicleDialogComponent', () => {
  let component: QuoteVehicleDialogComponent;
  let fixture: ComponentFixture<QuoteVehicleDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuoteVehicleDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QuoteVehicleDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

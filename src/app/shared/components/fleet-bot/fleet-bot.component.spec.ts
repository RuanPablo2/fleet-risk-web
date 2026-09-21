import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FleetBotComponent } from './fleet-bot.component';

describe('FleetBotComponent', () => {
  let component: FleetBotComponent;
  let fixture: ComponentFixture<FleetBotComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FleetBotComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FleetBotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

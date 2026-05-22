import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TomaTurnoPage } from './toma-turno';

describe('TomaTurnoPage', () => {
  let component: TomaTurnoPage;
  let fixture: ComponentFixture<TomaTurnoPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TomaTurnoPage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TomaTurnoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

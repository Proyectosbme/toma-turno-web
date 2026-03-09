import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HolaMundo } from './hola-mundo';

describe('HolaMundo', () => {
  let component: HolaMundo;
  let fixture: ComponentFixture<HolaMundo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HolaMundo]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HolaMundo);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

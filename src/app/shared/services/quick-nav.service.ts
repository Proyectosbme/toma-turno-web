import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { QuickNavItem } from '../components/quick-nav/quick-nav';

export type QuickNavState = {
  title: string;
  items: QuickNavItem[];
  hintTitle?: string;
  hintText?: string;
  hintIcon?: string;
};

const EMPTY_STATE: QuickNavState = {
  title: '',
  items: []
};

@Injectable({
  providedIn: 'root'
})
export class QuickNavService {
  private readonly stateSubject = new BehaviorSubject<QuickNavState>(EMPTY_STATE);
  readonly state$ = this.stateSubject.asObservable();

  setState(state: QuickNavState): void {
    this.stateSubject.next(state);
  }

  clear(): void {
    this.stateSubject.next(EMPTY_STATE);
  }
}

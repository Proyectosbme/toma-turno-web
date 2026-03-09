import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { MenuItem } from '@core/layout/models/menu.model';

@Injectable({
    providedIn: 'root'
})
export class MenuStateService {
    private readonly menuItemsSubject = new BehaviorSubject<MenuItem[]>([]);

    readonly menuItems$ = this.menuItemsSubject.asObservable();

    setMenu(items: MenuItem[] | null | undefined): void {
        this.menuItemsSubject.next(items ?? []);
    }

    getMenuSnapshot(): MenuItem[] {
        return this.menuItemsSubject.getValue();
    }
}

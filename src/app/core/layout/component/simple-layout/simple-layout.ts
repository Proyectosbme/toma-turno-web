import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import Keycloak from 'keycloak-js';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

interface MenuItem {
    codigo: number;
    label: string;
    icon?: string;
    routerLink?: string[];
    items?: MenuItem[];
}

@Component({
    selector: 'app-simple-layout',
    standalone: true,
    imports: [CommonModule, RouterModule],
    template: `
        <div style="display:flex; height:100vh;">
            <!-- Sidebar -->
            <div style="width:240px; background:#1e1e2e; color:#fff; padding:16px; overflow-y:auto;">
                <h3 style="margin:0 0 16px;">Menú</h3>
                <ng-container *ngFor="let grupo of menu">
                    <div style="margin-bottom:12px;">
                        <div style="font-weight:bold; padding:6px 0; opacity:0.7; font-size:12px; text-transform:uppercase;">
                            <i [class]="grupo.icon" style="margin-right:6px;"></i>{{ grupo.label }}
                        </div>
                        <div *ngFor="let item of grupo.items"
                             (click)="navegar(item.routerLink)"
                             style="padding:8px 12px; cursor:pointer; border-radius:4px; margin:2px 0;"
                             onmouseover="this.style.background='#ffffff22'"
                             onmouseout="this.style.background='transparent'">
                            <i [class]="item.icon" style="margin-right:8px;"></i>{{ item.label }}
                        </div>
                    </div>
                </ng-container>
                <hr style="border-color:#ffffff33; margin:16px 0;">
                <div (click)="logout()" style="padding:8px 12px; cursor:pointer; color:#ff6b6b;">
                    <i class="pi pi-sign-out" style="margin-right:8px;"></i>Cerrar sesión
                </div>
            </div>
            <!-- Contenido -->
            <div style="flex:1; padding:32px; overflow-y:auto;">
                <h1>Hola, {{ usuario }}</h1>
                <router-outlet></router-outlet>
            </div>
        </div>
    `
})
export class SimpleLayout implements OnInit {
    private kc     = inject(Keycloak);
    private http   = inject(HttpClient);
    private router = inject(Router);

    menu: MenuItem[] = [];

    get usuario(): string {
        return this.kc.tokenParsed?.['preferred_username'] ?? '';
    }

    async ngOnInit(): Promise<void> {
        try {
            this.menu = await firstValueFrom(this.http.get<MenuItem[]>('/assets/menu/menu.json'));
        } catch {
            this.menu = [];
        }
    }

    navegar(link?: string[]): void {
        if (link) this.router.navigate(link);
    }

    logout(): void {
        this.kc.logout({ redirectUri: window.location.origin + '/inicio' });
    }
}

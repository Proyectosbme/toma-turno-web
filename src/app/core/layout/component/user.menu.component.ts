import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { AuthService } from '@auth/services/auth.service';

@Component({
    selector: 'app-user-menu',
    standalone: true,
    imports: [CommonModule, RouterModule, ButtonModule, MenuModule, AvatarModule],
    templateUrl: './user.menu.component.html',
    styleUrl: './user.menu.component.scss'
})
export class UserMenuComponent implements OnInit {
    items: MenuItem[] = [];
    iniciales = '';
    nombreCompleto = '';
    nombreSucursal = '';

    constructor(
        private readonly authService: AuthService,
        private readonly router: Router
    ) {}

    ngOnInit() {
        const usuario = this.authService.getUsuario();
        const nombres   = usuario?.nombres   ?? '';
        const apellidos = usuario?.apellidos ?? '';
        this.nombreCompleto  = `${nombres} ${apellidos}`.trim() || usuario?.codigoUsuario || 'Usuario';
        this.nombreSucursal  = usuario?.nombreSucursal ?? '';
        this.iniciales = [nombres, apellidos]
            .filter(Boolean)
            .map(s => s.charAt(0).toUpperCase())
            .join('');

        this.items = [
            {
                label: this.nombreCompleto,
                items: [
                    {
                        label: 'Cerrar Sesión',
                        icon: 'pi pi-sign-out',
                        command: () => {
                            this.authService.logout();
                            this.router.navigate(['/auth/login']);
                        }
                    }
                ]
            }
        ];
    }
}

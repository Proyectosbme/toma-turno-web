import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { SelectModule } from 'primeng/select';
import { AppFloatingConfigurator } from '@core/layout/component/app.floatingconfigurator';
import { AuthApiClient } from '@auth/api/auth-api.client';
import { AuthService } from '@auth/services/auth.service';
import { SucursalApiClient } from '@general/api/sucursal-api.client';
import { BrandingService } from '@core/layout/service/branding.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, ButtonModule, InputTextModule, PasswordModule, FormsModule, RouterModule, AppFloatingConfigurator, SelectModule],
    templateUrl: './login.component.html'
})
export class Login implements OnInit {
    readonly branding = inject(BrandingService);

    codigoUsuario: string = '';
    contrasena: string = '';
    idSucursal: number | null = null;
    error: string = '';
    cargando: boolean = false;
    opcionesSucursales: { label: string; value: number }[] = [];

    constructor(
        private readonly authApiClient: AuthApiClient,
        private readonly authService: AuthService,
        private readonly router: Router,
        private readonly sucursalApiClient: SucursalApiClient
    ) {}

    async ngOnInit(): Promise<void> {
        try {
            const sucursales = await this.sucursalApiClient.listarTodas();
            this.opcionesSucursales = sucursales
                .filter(s => s.estado === 1)
                .map(s => ({ label: s.nombre, value: s.codigo }));
        } catch {
            this.opcionesSucursales = [];
        }
    }

    async iniciarSesion(): Promise<void> {
        if (!this.idSucursal) {
            this.error = 'Seleccione una sucursal para continuar.';
            return;
        }
        this.error = '';
        this.cargando = true;
        try {
            const usuario = await this.authApiClient.login(this.codigoUsuario, this.contrasena, this.idSucursal);
            this.authService.setUsuario(usuario);
            await this.branding.cargar();
            this.redirigir(usuario.perfil);
        } catch (err: any) {
            const mensaje = err?.error?.error;
            this.error = mensaje ?? 'Credenciales inválidas. Verifique su usuario y contraseña.';
        } finally {
            this.cargando = false;
        }
    }

    private redirigir(perfil: string): void {
        switch (perfil) {
            case 'ADMIN':    this.router.navigate(['/general/sucursal']); break;
            case 'MONITOR':  this.router.navigate(['/turnos/toma-turno']); break;
            case 'PUBLICO':  this.router.navigate(['/turnos/seleccion-turno']); break;
            case 'OPERADOR': this.router.navigate(['/turnos/operador']); break;
            default:         this.router.navigate(['/']);
        }
    }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { SucursalApiClient } from '@general/api/sucursal-api.client';
import { PuestoApiClient } from '@general/api/puesto-api.client';
import { AuthApiClient } from '@auth/api/auth-api.client';
import { AppFloatingConfigurator } from '@core/layout/component/app.floatingconfigurator';

interface Opcion { label: string; value: number; }

@Component({
    selector: 'app-registro',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, ButtonModule, SelectModule, InputTextModule, AppFloatingConfigurator],
    templateUrl: './registro.component.html'
})
export class Registro implements OnInit {

    form = new FormGroup({
        nombres:    new FormControl('', [Validators.required, Validators.maxLength(100)]),
        apellidos:  new FormControl('', [Validators.required, Validators.maxLength(100)]),
        dui:        new FormControl('', [Validators.maxLength(20)]),
        telefono:   new FormControl('', [Validators.maxLength(20)]),
        idSucursal:  new FormControl<number | null>(null, [Validators.required]),
        idPuesto:    new FormControl<number | null>(null, [Validators.required]),
        correlativo: new FormControl<number | null>(null, [Validators.required, Validators.min(1)])
    });

    sucursales: Opcion[] = [];
    puestos: Opcion[] = [];
    cargando = false;
    exitoso = false;
    codigoGenerado = '';
    error = '';

    constructor(
        private sucursalApi: SucursalApiClient,
        private puestoApi: PuestoApiClient,
        private authApi: AuthApiClient,
        private router: Router
    ) {}

    async ngOnInit(): Promise<void> {
        const lista = await this.sucursalApi.listarTodas();
        this.sucursales = lista.map(s => ({ label: s.nombre, value: s.codigo }));
    }

    async onSucursalChange(idSucursal: number | null): Promise<void> {
        this.form.get('idPuesto')!.setValue(null);
        this.puestos = [];
        if (!idSucursal) return;
        const lista = await this.puestoApi.buscarPorFiltros(idSucursal);
        this.puestos = lista.map(p => ({ label: p.nombre, value: p.id }));
    }

    async registrar(): Promise<void> {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        this.cargando = true;
        this.error = '';
        try {
            const v = this.form.value;
            const resp = await this.authApi.registrar({
                nombres:              v.nombres!,
                apellidos:            v.apellidos!,
                dui:                  v.dui || '',
                telefono:             v.telefono || '',
                idSucursal:           v.idSucursal!,
                idPuesto:             v.idPuesto!,
                perfil:               'OPERADOR',
                estado:               1,
                correlativo:          v.correlativo ?? null,
                atenderCasosEspeciales: null,
                ip:                   '',
                usuario:              '',
                perfilCreador:        ''
            });
            this.codigoGenerado = resp.codigoUsuario;
            this.exitoso = true;
        } catch {
            this.error = 'Ocurrió un error al registrar. Intenta nuevamente.';
        } finally {
            this.cargando = false;
        }
    }

    irALogin(): void {
        this.router.navigate(['/']);
    }
}

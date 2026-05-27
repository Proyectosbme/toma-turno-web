import { Component, OnInit, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AuthService } from '@auth/services/auth.service';
import { SucursalApiClient } from '@general/api/sucursal-api.client';
import { SucursalResponseDTO } from '@general/dto/sucursal.dto';
import { ReporteApiClient } from '../../api/reporte-api.client';
import { extraerMensajeError } from '@shared/utils/error.util';
import { PageLayoutComponent } from '@shared/components/page-layout/page-layout.component';
import { PageTitleComponent } from '@shared/components/page-title/page-title';
import { SectionComponent } from '@shared/components/section/section.component';

@Component({
    selector: 'app-reportes-actuales',
    standalone: true,
    imports: [
        ReactiveFormsModule,
        ButtonModule,
        SelectModule,
        ToastModule,
        PageLayoutComponent,
        PageTitleComponent,
        SectionComponent
    ],
    providers: [MessageService],
    templateUrl: './reportes-actuales.html',
    styleUrl: './reportes-actuales.scss'
})
export class ReportesActualesPage implements OnInit {

    private readonly authService = inject(AuthService);
    private readonly reporteApi = inject(ReporteApiClient);
    private readonly sucursalApi = inject(SucursalApiClient);
    private readonly messageService = inject(MessageService);
    private readonly fb = inject(FormBuilder);

    form: FormGroup = this.fb.group({
        tipoReporte: [null, Validators.required],
        sucursal:    [null, Validators.required]
    });

    tiposReporte = [
        { label: 'Atención por sucursal', value: 'sucursal' }
    ];

    opcionesSucursales: { label: string; value: number }[] = [];
    generando = false;

    get esAdmin(): boolean { return this.authService.esAdmin(); }
    get nombreSucursalFija(): string { return this.authService.getUsuario()?.nombreSucursal ?? ''; }

    async ngOnInit(): Promise<void> {
        if (this.esAdmin) {
            await this.cargarSucursales();
        } else {
            const usuario = this.authService.getUsuario();
            if (usuario) {
                this.opcionesSucursales = [{ label: usuario.nombreSucursal, value: usuario.idSucursal }];
                this.form.get('sucursal')!.setValue(usuario.idSucursal);
                this.form.get('sucursal')!.disable();
            }
        }
    }

    private async cargarSucursales(): Promise<void> {
        try {
            const sucursales: SucursalResponseDTO[] = await this.sucursalApi.listarTodas();
            this.opcionesSucursales = sucursales.map(s => ({ label: s.nombre, value: s.codigo }));
        } catch (err) {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: extraerMensajeError(err) });
        }
    }

    async generarReporte(): Promise<void> {
        const idSucursal = this.form.get('sucursal')!.value as number;

        this.generando = true;
        try {
            const blob = await this.reporteApi.generarReporteActual(idSucursal);
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
            setTimeout(() => URL.revokeObjectURL(url), 10000);
        } catch (err) {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: extraerMensajeError(err) });
        } finally {
            this.generando = false;
        }
    }
}

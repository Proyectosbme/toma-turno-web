import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { AuthService } from '@auth/services/auth.service';
import { TurnoApiClient } from '@turnos/api/turno-api.client';
import { TurnoWebSocketApi } from '@turnos/api/turno-websocket.api';
import { DetalleColaxPuestoApiClient } from '@general/api/detallecolaxpuesto-api.client';
import { TurnoResponseDTO } from '@turnos/dto/turno.dto';
import { DetalleColaxPuestoResponseDTO } from '@general/dto/detallecolaxpuesto.dto';
import { extraerMensajeError } from '@shared/utils/error.util';
import { PageLayoutComponent } from '@shared/components/page-layout/page-layout.component';
import { PageTitleComponent } from '@shared/components/page-title/page-title';

@Component({
    selector: 'app-turnos-pasados',
    standalone: true,
    imports: [
        CommonModule,
        ButtonModule,
        TagModule,
        ToastModule,
        TooltipModule,
        PageLayoutComponent,
        PageTitleComponent
    ],
    providers: [MessageService],
    templateUrl: './turnos-pasados.html',
    styleUrl: './turnos-pasados.scss'
})
export class TurnosPasadosPage implements OnInit, OnDestroy {

    private readonly authService = inject(AuthService);
    private readonly turnoApi = inject(TurnoApiClient);
    private readonly turnoWebSocket = inject(TurnoWebSocketApi);
    private readonly detalleColaxPuestoApi = inject(DetalleColaxPuestoApiClient);
    private readonly messageService = inject(MessageService);

    private wsSubscription?: Subscription;

    private get idSucursalActual(): number {
        return this.authService.getUsuario()?.idSucursal ?? 0;
    }
    get idPuesto(): number | null {
        return this.authService.getUsuario()?.idPuesto ?? null;
    }
    private get idUsuarioActual(): number | undefined {
        return this.authService.getUsuario()?.id ?? undefined;
    }

    colasAsignadas: DetalleColaxPuestoResponseDTO[] = [];
    turnos: TurnoResponseDTO[] = [];
    cargando = false;
    llamandoId: number | null = null;

    async ngOnInit(): Promise<void> {
        await this.cargarColas();
        await this.cargar();

        this.turnoWebSocket.connect();
        this.wsSubscription = this.turnoWebSocket.mensajes.subscribe(() => {
            this.cargar();
        });
    }

    ngOnDestroy(): void {
        this.wsSubscription?.unsubscribe();
        this.turnoWebSocket.close();
    }

    private async cargarColas(): Promise<void> {
        if (!this.idPuesto) return;
        try {
            this.colasAsignadas = await this.detalleColaxPuestoApi.listarPorPuesto(
                this.idPuesto, this.idSucursalActual
            );
        } catch {
            // sin colas asignadas — se muestra lista vacía
        }
    }

    async cargar(): Promise<void> {
        if (this.colasAsignadas.length === 0) return;

        this.cargando = true;
        try {
            const hoy = new Date().toLocaleDateString('en-CA');
            const idSucursalCola = this.colasAsignadas[0].idSucursalCola;
            const colasUnicas = [...new Map(this.colasAsignadas.map(c => [c.idCola, c])).values()];

            const resultados = await Promise.all(
                colasUnicas.map(c =>
                    this.turnoApi.buscar({ idSucursal: idSucursalCola, idCola: c.idCola, fecha: hoy })
                )
            );

            // FINALIZADO (4), TRASLADO (3) y SIN_ATENDER (5) — LLAMADO y CREADO no son "pasados"
            this.turnos = resultados
                .flat()
                .filter(t => t.estado === 3 || t.estado === 4 || t.estado === 5)
                .sort((a, b) => {
                    const da = a.fechaLlamada ?? a.fechaCreacion;
                    const db = b.fechaLlamada ?? b.fechaCreacion;
                    return new Date(db).getTime() - new Date(da).getTime();
                });
        } catch (err) {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: extraerMensajeError(err) });
        } finally {
            this.cargando = false;
        }
    }

    async rellamar(turno: TurnoResponseDTO): Promise<void> {
        if (!this.idPuesto) return;
        this.llamandoId = turno.id;
        const dto = { idPuesto: this.idPuesto, idSucursalPuesto: this.idSucursalActual, idUsuario: this.idUsuarioActual };
        try {
            // Estado 5 (SIN_ATENDER): usar /llamar porque el turno volvió a estado pendiente
            // Resto (LLAMADO, FINALIZADO, TRASLADO): usar /re-llamar
            if (turno.estado === 5) {
                await this.turnoApi.llamar(turno.idSucursal, turno.codigoTurno, turno.fechaCreacion, dto);
            } else {
                await this.turnoApi.rellamar(turno.idSucursal, turno.codigoTurno, turno.fechaCreacion, dto);
            }
            this.messageService.add({
                severity: 'success', summary: 'Turno llamado',
                detail: `${turno.codigoTurno} ha sido llamado nuevamente`
            });
        } catch (err) {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: extraerMensajeError(err) });
        } finally {
            this.llamandoId = null;
        }
    }

    etiquetaEstado(estado: number): string {
        switch (estado) {
            case 3: return 'Trasladado';
            case 4: return 'Finalizado';
            case 5: return 'Sin atender';
            default: return '';
        }
    }

    severidadEstado(estado: number): 'warn' | 'success' | 'secondary' | 'danger' {
        switch (estado) {
            case 3: return 'warn';
            case 4: return 'success';
            case 5: return 'danger';
            default: return 'secondary';
        }
    }

    nombreCola(idCola: number): string {
        const c = this.colasAsignadas.find(x => x.idCola === idCola);
        return c?.nombreCola ?? `Cola ${idCola}`;
    }
}

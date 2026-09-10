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
import { EstadoOperadorApiClient } from '@turnos/api/estadooperador-api.client';
import { TurnoHoyResponseDTO } from '@turnos/dto/turnohoy.dto';
import { EstadoOperador } from '@turnos/dto/estadooperador.dto';
import { extraerMensajeError } from '@shared/utils/error.util';
import { PageLayoutComponent } from '@shared/components/page-layout/page-layout.component';
import { PageTitleComponent } from '@shared/components/page-title/page-title';

const ESTADOS_PASADOS = ['TRASLADO', 'FINALIZADO', 'SIN_ATENDER', 'EN_ESPERA'];

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
    private readonly estadoOperadorApi = inject(EstadoOperadorApiClient);
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

    turnos: (TurnoHoyResponseDTO & { numeroDia: number })[] = [];
    cargando = false;
    llamandoId: number | null = null;
    operadorActivo = false;

    async ngOnInit(): Promise<void> {
        await this.cargarEstadoOperador();
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

    private async cargarEstadoOperador(): Promise<void> {
        if (!this.idUsuarioActual) return;
        try {
            const estadoOperador = await this.estadoOperadorApi.buscarVigente(this.idUsuarioActual, this.idSucursalActual);
            this.operadorActivo = estadoOperador?.idEstadoOperador === EstadoOperador.ACTIVA;
        } catch {
            this.operadorActivo = false;
        }
    }

    async cargar(): Promise<void> {
        if (!this.idUsuarioActual) return;

        this.cargando = true;
        try {
            const resultados = await this.turnoApi.buscarHoy(this.idSucursalActual, this.idUsuarioActual);
            const filtrados = resultados.filter(t => ESTADOS_PASADOS.includes(t.estadoTurno));

            // Numeración del día (1, 2, 3...) por orden de llegada (fechaCreacion) — el id de la
            // base de datos es acumulado entre días y confunde (ej. empieza en 17 porque ayer
            // ya hubo 16 turnos), así que se ignora para lo que se muestra en pantalla.
            const ordenLlegada = [...filtrados].sort((a, b) =>
                new Date(a.fechaCreacion).getTime() - new Date(b.fechaCreacion).getTime()
            );
            const numeroPorId = new Map(ordenLlegada.map((t, i) => [t.id, i + 1]));

            this.turnos = filtrados
                .map(t => ({ ...t, numeroDia: numeroPorId.get(t.id)! }))
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

    async rellamar(turno: TurnoHoyResponseDTO): Promise<void> {
        if (!this.idPuesto) return;
        this.llamandoId = turno.id;
        const dto = { idPuesto: this.idPuesto, idSucursalPuesto: this.idSucursalActual, idUsuario: this.idUsuarioActual };
        try {
            if (turno.estadoTurno === 'SIN_ATENDER' || turno.estadoTurno === 'EN_ESPERA') {
                await this.turnoApi.llamar(turno.idSucursalTicket, turno.codigoTurno, turno.fechaCreacion, dto);
            } else {
                await this.turnoApi.rellamar(turno.idSucursalTicket, turno.codigoTurno, turno.fechaCreacion, dto);
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

    puedeRellamar(estado: string): boolean {
        return this.operadorActivo && (estado === 'SIN_ATENDER' || estado === 'EN_ESPERA');
    }

    etiquetaEstado(estado: string): string {
        switch (estado) {
            case 'TRASLADO':    return 'Trasladado';
            case 'FINALIZADO':  return 'Finalizado';
            case 'SIN_ATENDER': return 'Sin atender';
            case 'EN_ESPERA':   return 'En espera';
            default: return estado;
        }
    }

    severidadEstado(estado: string): 'warn' | 'success' | 'secondary' | 'danger' {
        switch (estado) {
            case 'TRASLADO':    return 'warn';
            case 'FINALIZADO':  return 'success';
            case 'SIN_ATENDER': return 'danger';
            case 'EN_ESPERA':   return 'secondary';
            default: return 'secondary';
        }
    }

    nombreCola(turno: TurnoHoyResponseDTO): string {
        return turno.detalle ? `${turno.cola} → ${turno.detalle}` : turno.cola;
    }
}

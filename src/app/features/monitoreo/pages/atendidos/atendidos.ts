import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AuthService } from '@auth/services/auth.service';
import { TurnoApiClient } from '@turnos/api/turno-api.client';
import { TurnoWebSocketApi } from '@turnos/api/turno-websocket.api';
import { TurnoHoyResponseDTO } from '@turnos/dto/turnohoy.dto';
import { extraerMensajeError } from '@shared/utils/error.util';
import { PageLayoutComponent } from '@shared/components/page-layout/page-layout.component';
import { PageTitleComponent } from '@shared/components/page-title/page-title';

@Component({
    selector: 'app-monitoreo-atendidos',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ButtonModule,
        SelectModule,
        ToastModule,
        PageLayoutComponent,
        PageTitleComponent
    ],
    providers: [MessageService],
    templateUrl: './atendidos.html',
    styleUrl: './atendidos.scss'
})
export class MonitoreoAtendidosPage implements OnInit, OnDestroy {

    private readonly authService = inject(AuthService);
    private readonly turnoApi = inject(TurnoApiClient);
    private readonly turnoWebSocket = inject(TurnoWebSocketApi);
    private readonly messageService = inject(MessageService);

    private get idSucursalActual(): number {
        return this.authService.getUsuario()?.idSucursal ?? 0;
    }

    todos: TurnoHoyResponseDTO[] = [];
    cargando = false;

    colaSeleccionada: string | null = null;
    detalleSeleccionado: string | null = null;
    usuarioSeleccionado: number | string | null = null;

    opcionesColas: { label: string; value: string | null }[] = [{ label: 'Todas las colas', value: null }];
    opcionesDetalles: { label: string; value: string | null }[] = [{ label: 'Todos los detalles', value: null }];
    opcionesUsuarios: { label: string; value: (number | string) | null }[] = [{ label: 'Todos los usuarios', value: null }];

    get turnos(): TurnoHoyResponseDTO[] {
        return this.todos.filter(t =>
            (!this.colaSeleccionada || t.cola === this.colaSeleccionada) &&
            (!this.detalleSeleccionado || t.detalle === this.detalleSeleccionado) &&
            (this.usuarioSeleccionado == null || this.claveUsuario(t) === this.usuarioSeleccionado)
        );
    }

    private wsSubscription?: Subscription;

    async ngOnInit(): Promise<void> {
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

    async cargar(): Promise<void> {
        this.cargando = true;
        try {
            const resultados = await this.turnoApi.buscarHoy(this.idSucursalActual);
            this.todos = resultados
                .filter(t => t.estadoTurno === 'FINALIZADO')
                .sort((a, b) => {
                    const da = a.fechaFinalizacion ?? a.fechaCreacion;
                    const db = b.fechaFinalizacion ?? b.fechaCreacion;
                    return new Date(db).getTime() - new Date(da).getTime();
                });

            const colas = [...new Set(resultados.map(t => t.cola))].sort((a, b) => a.localeCompare(b));
            this.opcionesColas = [{ label: 'Todas las colas', value: null }, ...colas.map(c => ({ label: c, value: c }))];

            const usuarios = new Map<number | string, string>();
            for (const t of this.todos) {
                usuarios.set(this.claveUsuario(t), this.nombreUsuario(t));
            }
            this.opcionesUsuarios = [
                { label: 'Todos los usuarios', value: null },
                ...[...usuarios.entries()]
                    .map(([value, label]) => ({ label, value }))
                    .sort((a, b) => a.label.localeCompare(b.label))
            ];
            if (this.usuarioSeleccionado != null && !usuarios.has(this.usuarioSeleccionado)) {
                this.usuarioSeleccionado = null;
            }

            this.actualizarOpcionesDetalles();
        } catch (err) {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: extraerMensajeError(err) });
        } finally {
            this.cargando = false;
        }
    }

    onColaCambiada(): void {
        this.actualizarOpcionesDetalles();
    }

    private actualizarOpcionesDetalles(): void {
        const base = this.colaSeleccionada
            ? this.todos.filter(t => t.cola === this.colaSeleccionada)
            : this.todos;
        const detalles = [...new Set(base.map(t => t.detalle).filter((d): d is string => !!d))]
            .sort((a, b) => a.localeCompare(b));
        this.opcionesDetalles = [{ label: 'Todos los detalles', value: null }, ...detalles.map(d => ({ label: d, value: d }))];
        if (this.detalleSeleccionado && !detalles.includes(this.detalleSeleccionado)) {
            this.detalleSeleccionado = null;
        }
    }

    private nombreUsuario(turno: TurnoHoyResponseDTO): string {
        return turno.nombreCompleto || turno.codigoUsuario || 'Sin usuario';
    }

    private claveUsuario(turno: TurnoHoyResponseDTO): number | string {
        return turno.idUsuario ?? turno.codigoUsuario ?? this.nombreUsuario(turno);
    }

    nombreCola(turno: TurnoHoyResponseDTO): string {
        return turno.detalle ? `${turno.cola} → ${turno.detalle}` : turno.cola;
    }

    /** Minutos redondeados entre dos fechas ISO, o '—' si falta alguna. */
    minutosEntre(desdeIso: string | null, hastaIso: string | null): string {
        if (!desdeIso || !hastaIso) return '—';
        const min = Math.round((new Date(hastaIso).getTime() - new Date(desdeIso).getTime()) / 60000);
        return Number.isFinite(min) ? `${min}` : '—';
    }
}

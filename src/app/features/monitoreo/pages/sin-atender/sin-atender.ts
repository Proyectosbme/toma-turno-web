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
    selector: 'app-monitoreo-sin-atender',
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
    templateUrl: './sin-atender.html',
    styleUrl: './sin-atender.scss'
})
export class MonitoreoSinAtenderPage implements OnInit, OnDestroy {

    private readonly authService = inject(AuthService);
    private readonly turnoApi = inject(TurnoApiClient);
    private readonly turnoWebSocket = inject(TurnoWebSocketApi);
    private readonly messageService = inject(MessageService);

    private get idSucursalActual(): number {
        return this.authService.getUsuario()?.idSucursal ?? 0;
    }

    todos: TurnoHoyResponseDTO[] = [];
    cargando = false;
    ahora = Date.now();

    colaSeleccionada: string | null = null;
    opcionesColas: { label: string; value: string | null }[] = [{ label: 'Todas las colas', value: null }];

    get turnos(): TurnoHoyResponseDTO[] {
        return this.colaSeleccionada
            ? this.todos.filter(t => t.cola === this.colaSeleccionada)
            : this.todos;
    }

    private wsSubscription?: Subscription;
    private timerInterval?: ReturnType<typeof setInterval>;

    async ngOnInit(): Promise<void> {
        await this.cargar();

        this.turnoWebSocket.connect();
        this.wsSubscription = this.turnoWebSocket.mensajes.subscribe(() => {
            this.cargar();
        });

        this.timerInterval = setInterval(() => { this.ahora = Date.now(); }, 1000);
    }

    ngOnDestroy(): void {
        this.wsSubscription?.unsubscribe();
        this.turnoWebSocket.close();
        clearInterval(this.timerInterval);
    }

    async cargar(): Promise<void> {
        this.cargando = true;
        try {
            const resultados = await this.turnoApi.buscarHoy(this.idSucursalActual);
            this.todos = resultados
                .filter(t => t.estadoTurno === 'CREADO')
                .sort((a, b) => new Date(a.fechaCreacion).getTime() - new Date(b.fechaCreacion).getTime());

            // Las opciones del filtro salen de TODOS los turnos de hoy (no solo los pendientes),
            // así una cola no desaparece del selector solo porque en este momento no tiene nadie sin atender.
            const colas = [...new Set(resultados.map(t => t.cola))].sort((a, b) => a.localeCompare(b));
            this.opcionesColas = [{ label: 'Todas las colas', value: null }, ...colas.map(c => ({ label: c, value: c }))];
        } catch (err) {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: extraerMensajeError(err) });
        } finally {
            this.cargando = false;
        }
    }

    nombreCola(turno: TurnoHoyResponseDTO): string {
        return turno.detalle ? `${turno.cola} → ${turno.detalle}` : turno.cola;
    }

    /** "X min" o "Xh Ym" en vivo desde la creación */
    tiempoEsperaTexto(fechaIso: string): string {
        const min = Math.floor((this.ahora - new Date(fechaIso).getTime()) / 60000);
        if (min < 1) return '< 1 min';
        if (min < 60) return `${min} min`;
        return `${Math.floor(min / 60)}h ${min % 60}m`;
    }

    /** Minutos en espera — para aplicar clases de color */
    tiempoEsperaMin(fechaIso: string): number {
        return Math.floor((this.ahora - new Date(fechaIso).getTime()) / 60000);
    }
}

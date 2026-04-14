import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { BadgeModule } from 'primeng/badge';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { TurnoApiClient } from '@turnos/api/turno-api.client';
import { TurnoWebSocketApi } from '@turnos/api/turno-websocket.api';
import { DetalleColaxPuestoApiClient } from '@general/api/detallecolaxpuesto-api.client';
import { TurnoResponseDTO } from '@turnos/dto/turno.dto';
import { DetalleColaxPuestoResponseDTO } from '@general/dto/detallecolaxpuesto.dto';
import { extraerMensajeError } from '@shared/utils/error.util';
import { AuthService } from '@auth/services/auth.service';
import { PageLayoutComponent } from '@shared/components/page-layout/page-layout.component';
import { PageTitleComponent } from '@shared/components/page-title/page-title';
import { ColaApiClient } from '@general/api/cola-api.client';
import { ColaResponseDTO } from '@general/dto/cola.dto';
import { DetalleResponseDTO } from '@general/dto/detalle.dto';

@Component({
    selector: 'app-operador',
    standalone: true,
    imports: [
        CommonModule,
        ButtonModule,
        CardModule,
        TagModule,
        BadgeModule,
        ToastModule,
        ConfirmDialogModule,
        ProgressSpinnerModule,
        TooltipModule,
        DialogModule,
        PageLayoutComponent,
        PageTitleComponent
    ],
    providers: [MessageService, ConfirmationService],
    templateUrl: './operador.html',
    styleUrl: './operador.scss'
})
export class OperadorPage implements OnInit, OnDestroy {

    private readonly authService = inject(AuthService);

    get idSucursalActual(): number {
        return this.authService.getUsuario()?.idSucursal ?? 0;
    }

    get idPuesto(): number | null {
        return this.authService.getUsuario()?.idPuesto ?? null;
    }

    get tienePuestoAsignado(): boolean {
        return this.idPuesto != null && this.idPuesto > 0;
    }

    /** Clave única por usuario para persistir su turno activo entre recargas */
    private get turnoActualKey(): string {
        return `op_turno_${this.authService.getUsuario()?.id ?? 0}`;
    }

    private get idUsuarioActual(): number | undefined {
        return this.authService.getUsuario()?.id ?? undefined;
    }

    nombrePuesto = '';

    colasAsignadas: DetalleColaxPuestoResponseDTO[] = [];
    turnoActual: TurnoResponseDTO | null = null;
    turnosEnEspera: TurnoResponseDTO[] = [];
    turnosFinalizados: TurnoResponseDTO[] = [];

    // Reasignar dialog
    mostrarDialogoReasignar = false;
    colasReasignar: ColaResponseDTO[] = [];
    colaReasignarSeleccionada: ColaResponseDTO | null = null;
    detallesReasignar: DetalleResponseDTO[] = [];
    detalleReasignarSeleccionado: DetalleResponseDTO | null = null;
    cargandoReasignar = false;

    cargando = false;
    cargandoInicial = false;
    ahora = Date.now();

    private wsSubscription?: Subscription;
    private timerInterval?: ReturnType<typeof setInterval>;

    constructor(
        private readonly turnoApi: TurnoApiClient,
        private readonly detalleColaxPuestoApi: DetalleColaxPuestoApiClient,
        private readonly messageService: MessageService,
        private readonly confirmationService: ConfirmationService,
        private readonly turnoWebSocket: TurnoWebSocketApi,
        private readonly colaApi: ColaApiClient,
    ) {}

    ngOnInit(): void {
        this.cargarInicial();
        this.turnoWebSocket.connect();
        this.wsSubscription = this.turnoWebSocket.mensajes.subscribe(() => {
            if (!this.cargandoInicial) this.refrescarTurnos();
        });
        this.timerInterval = setInterval(() => { this.ahora = Date.now(); }, 1000);
    }

    ngOnDestroy(): void {
        this.wsSubscription?.unsubscribe();
        this.turnoWebSocket.close();
        clearInterval(this.timerInterval);
    }

    private async cargarInicial(): Promise<void> {
        if (!this.tienePuestoAsignado) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Sin puesto asignado',
                detail: 'Este usuario no tiene un puesto asignado. Contacte al administrador.',
                life: 0
            });
            return;
        }
        try {
            this.cargandoInicial = true;
            const usuario = this.authService.getUsuario();
            const base = usuario?.nombrePuesto ?? 'Puesto';
            const corr = usuario?.correlativo != null ? ` ${usuario.correlativo}` : '';
            this.nombrePuesto = base + corr;
            this.colasAsignadas = await this.detalleColaxPuestoApi.listarPorPuesto(
                this.idPuesto!, this.idSucursalActual
            );
            await this.refrescarTurnos();
        } catch (err) {
            this.messageService.add({
                severity: 'error', summary: 'Error al cargar',
                detail: extraerMensajeError(err), life: 5000
            });
        } finally {
            this.cargandoInicial = false;
        }
    }

    async refrescarTurnos(): Promise<void> {
        const hoy = new Date().toLocaleDateString('en-CA');

        const idSucursalColas = this.colasAsignadas[0]?.idSucursalCola ?? this.idSucursalActual;
        const idPuesto        = this.idPuesto ?? undefined;

        const [turnosLlamados, turnosFinalizados, turnosEnEspera] = await Promise.all([
            this.turnoApi.buscar({ idSucursal: idSucursalColas, estado: 2, fecha: hoy }),
            this.turnoApi.buscar({ idSucursal: idSucursalColas, estado: 4, fecha: hoy }),
            this.turnoApi.buscar({
                idSucursal: idSucursalColas,
                estado: 1,
                fecha: hoy,
                idPuesto,
                idSucursalPuesto: idPuesto != null ? this.idSucursalActual : undefined
            })
        ]);

        const idUsr = this.idUsuarioActual;
        this.turnosFinalizados = turnosFinalizados.filter(t => idUsr != null && t.idUsuario === idUsr);

        // El backend ya devuelve los turnos ordenados por prioridad del puesto
        this.turnosEnEspera = turnosEnEspera;

        // Cada operador rastrea SU turno activo por código (guardado en localStorage por user ID).
        // Así dos operadores con el mismo idPuesto son completamente independientes.
        const codigoGuardado = localStorage.getItem(this.turnoActualKey);
        if (codigoGuardado) {
            this.turnoActual = turnosLlamados.find(t => t.codigoTurno === codigoGuardado) ?? null;
            if (!this.turnoActual) localStorage.removeItem(this.turnoActualKey); // ya fue finalizado
        } else {
            // Auto-recuperación al reiniciar sesión: buscar por idUsuario si localStorage está vacío
            this.turnoActual = idUsr != null
                ? (turnosLlamados.find(t => t.idUsuario === idUsr) ?? null)
                : null;
            if (this.turnoActual) {
                localStorage.setItem(this.turnoActualKey, this.turnoActual.codigoTurno);
            }
        }
    }

    async llamarSiguiente(): Promise<void> {
        if (!this.tienePuestoAsignado) {
            this.messageService.add({
                severity: 'warn', summary: 'Sin puesto asignado',
                detail: 'No se puede llamar un turno sin puesto asignado.', life: 4000
            });
            return;
        }
        if (this.turnosEnEspera.length === 0) {
            this.messageService.add({
                severity: 'warn', summary: 'Sin turnos', detail: 'No hay turnos en espera', life: 3000
            });
            return;
        }
        await this.ejecutarLlamar(this.turnosEnEspera[0]);
    }

    async volverALlamar(): Promise<void> {
        if (!this.turnoActual) return;
        const codigo = this.turnoActual.codigoTurno;
        try {
            this.cargando = true;
            await this.turnoApi.llamar(
                this.turnoActual.idSucursal,
                this.turnoActual.codigoTurno,
                this.turnoActual.fechaCreacion,
                { idPuesto: this.idPuesto!, idSucursalPuesto: this.idSucursalActual, idUsuario: this.idUsuarioActual }
            );
            this.messageService.add({
                severity: 'info', summary: 'Re-anunciado',
                detail: `Turno ${codigo} anunciado nuevamente`, life: 3000
            });
        } catch (err) {
            this.messageService.add({
                severity: 'error', summary: 'Error al re-anunciar', detail: extraerMensajeError(err), life: 5000
            });
        } finally {
            this.cargando = false;
        }
    }

    async finalizar(): Promise<void> {
        if (!this.turnoActual) return;
        await this.ejecutarFinalizar('Turno finalizado correctamente');
    }

    saltarTurno(): void {
        if (!this.turnoActual) return;
        this.confirmationService.confirm({
            message: `¿Marcar el turno ${this.turnoActual.codigoTurno} como sin atender?`,
            header: 'No llegó / Sin atender',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Sí, marcar',
            rejectLabel: 'Cancelar',
            accept: () => this.ejecutarSinAtender()
        });
    }

    private async ejecutarSinAtender(): Promise<void> {
        if (!this.turnoActual) return;
        const turno = this.turnoActual;
        try {
            this.cargando = true;
            await this.turnoApi.sinAtender(turno.idSucursal, turno.codigoTurno, turno.fechaCreacion);
            this.turnoActual = null;
            localStorage.removeItem(this.turnoActualKey);
            await this.refrescarTurnos();
            this.messageService.add({
                severity: 'warn', summary: 'Sin atender',
                detail: `Turno ${turno.codigoTurno} marcado como sin atender`, life: 3000
            });
        } catch (err) {
            this.messageService.add({
                severity: 'error', summary: 'Error', detail: extraerMensajeError(err), life: 5000
            });
        } finally {
            this.cargando = false;
        }
    }

    private async ejecutarLlamar(turno: TurnoResponseDTO): Promise<void> {
        try {
            this.cargando = true;
            this.turnoActual = await this.turnoApi.llamar(
                turno.idSucursal, turno.codigoTurno, turno.fechaCreacion,
                { idPuesto: this.idPuesto!, idSucursalPuesto: this.idSucursalActual, idUsuario: this.idUsuarioActual }
            );
            if (this.turnoActual) {
                localStorage.setItem(this.turnoActualKey, this.turnoActual.codigoTurno);
            }
            await this.refrescarTurnos();
            this.messageService.add({
                severity: 'success', summary: 'Turno llamado',
                detail: `Turno ${turno.codigoTurno}`, life: 3000
            });
        } catch (err) {
            this.messageService.add({
                severity: 'error', summary: 'Error al llamar', detail: extraerMensajeError(err), life: 5000
            });
        } finally {
            this.cargando = false;
        }
    }

    private async ejecutarFinalizar(mensajeExito: string): Promise<void> {
        if (!this.turnoActual) return;
        const turno = this.turnoActual;
        try {
            this.cargando = true;
            await this.turnoApi.finalizar(turno.idSucursal, turno.codigoTurno, turno.fechaCreacion);
            this.turnoActual = null;
            localStorage.removeItem(this.turnoActualKey);
            await this.refrescarTurnos();
            this.messageService.add({
                severity: 'success', summary: mensajeExito,
                detail: `Turno ${turno.codigoTurno}`, life: 3000
            });
        } catch (err) {
            this.messageService.add({
                severity: 'error', summary: 'Error al finalizar', detail: extraerMensajeError(err), life: 5000
            });
        } finally {
            this.cargando = false;
        }
    }

    async abrirReasignar(): Promise<void> {
        if (!this.turnoActual) return;
        this.colaReasignarSeleccionada = null;
        this.detallesReasignar = [];
        this.detalleReasignarSeleccionado = null;
        try {
            this.cargandoReasignar = true;
            const colasUnicas = [...new Map(this.colasAsignadas.map(c => [c.idCola, c])).values()];
            const idSucursalColas = colasUnicas[0]?.idSucursalCola ?? this.idSucursalActual;
            const todasLasColas = await this.colaApi.buscar({ idSucursal: idSucursalColas });
            this.colasReasignar = todasLasColas
                .filter(c => c.estado === 1)
                .sort((a, b) => a.prioridad - b.prioridad);
            this.mostrarDialogoReasignar = true;
        } catch (err) {
            this.messageService.add({
                severity: 'error', summary: 'Error', detail: extraerMensajeError(err), life: 5000
            });
        } finally {
            this.cargandoReasignar = false;
        }
    }

    async seleccionarColaReasignar(cola: ColaResponseDTO): Promise<void> {
        this.colaReasignarSeleccionada = cola;
        this.detalleReasignarSeleccionado = null;
        try {
            const colaConDetalles = await this.colaApi.buscarConDetalles(cola.id, cola.idSucursal);
            this.detallesReasignar = (colaConDetalles.detalles ?? []).filter(d => d.estado === 1);
        } catch {
            this.detallesReasignar = [];
        }
    }

    async confirmarReasignar(): Promise<void> {
        if (!this.turnoActual || !this.colaReasignarSeleccionada) return;
        if (this.detallesReasignar.length > 0 && !this.detalleReasignarSeleccionado) return;
        const turno = this.turnoActual;
        const cola = this.colaReasignarSeleccionada;
        try {
            this.cargandoReasignar = true;
            await this.turnoApi.reasignar(
                turno.idSucursal, turno.codigoTurno, turno.fechaCreacion,
                {
                    idSucursalDestino: cola.idSucursal,
                    idColaDestino: cola.id,
                    idDetalleDestino: this.detalleReasignarSeleccionado?.idDetalle,
                }
            );
            this.turnoActual = null;
            localStorage.removeItem(this.turnoActualKey);
            this.mostrarDialogoReasignar = false;
            await this.refrescarTurnos();
            this.messageService.add({
                severity: 'success', summary: 'Turno reasignado',
                detail: `Turno ${turno.codigoTurno} enviado a ${cola.nombre} con prioridad`, life: 4000
            });
        } catch (err) {
            this.messageService.add({
                severity: 'error', summary: 'Error al reasignar', detail: extraerMensajeError(err), life: 5000
            });
        } finally {
            this.cargandoReasignar = false;
        }
    }

    /* ── Helpers de tiempo ───────────────────────── */

    /** mm:ss en vivo desde que se llamó el turno */
    tiempoAtencion(fechaIso: string): string {
        const seg = Math.floor((this.ahora - new Date(fechaIso).getTime()) / 1000);
        const mm = Math.floor(seg / 60).toString().padStart(2, '0');
        const ss = (seg % 60).toString().padStart(2, '0');
        return `${mm}:${ss}`;
    }

    /** "X min" o "Xh Ym" en vivo desde la creación — para lista de espera */
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

    /** Tiempo fijo que esperó antes de ser llamado (fechaCreacion → fechaLlamada) */
    tiempoEsperantesTexto(turno: TurnoResponseDTO): string {
        if (!turno.fechaLlamada) return '';
        const min = Math.floor(
            (new Date(turno.fechaLlamada).getTime() - new Date(turno.fechaCreacion).getTime()) / 60000
        );
        if (min < 1) return '< 1 min';
        return `${min} min`;
    }

    /** Tiempo promedio de atención (solo finalizados con ambas fechas) */
    promedioAtencionTexto(): string {
        const conTiempo = this.turnosFinalizados.filter(t => t.fechaLlamada && t.fechaFinalizacion);
        if (conTiempo.length === 0) return '—';
        const totalMs = conTiempo.reduce((sum, t) =>
            sum + (new Date(t.fechaFinalizacion!).getTime() - new Date(t.fechaLlamada!).getTime()), 0
        );
        const avgMin = Math.round(totalMs / conTiempo.length / 60000);
        return avgMin < 1 ? '< 1 min' : `${avgMin} min`;
    }

    nombreColaPorId(idCola: number): string {
        return this.colasAsignadas.find(c => c.idCola === idCola)?.nombreCola ?? `Cola ${idCola}`;
    }

    horaDesde(fechaIso: string): string {
        return new Date(fechaIso).toLocaleTimeString('es-CR', {
            hour: '2-digit', minute: '2-digit'
        });
    }
}

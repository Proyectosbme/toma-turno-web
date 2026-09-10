import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
import { EstadoOperadorApiClient } from '@turnos/api/estadooperador-api.client';
import { DetalleColaxPuestoApiClient } from '@general/api/detallecolaxpuesto-api.client';
import { TurnoResponseDTO, EstadoTurno } from '@turnos/dto/turno.dto';
import { EstadoOperadorResponseDTO, EstadoOperador, TipoDescanso, OPCIONES_TIPO_DESCANSO } from '@turnos/dto/estadooperador.dto';
import { DetalleColaxPuestoResponseDTO } from '@general/dto/detallecolaxpuesto.dto';
import { extraerMensajeError } from '@shared/utils/error.util';
import { AuthService } from '@auth/services/auth.service';
import { PageLayoutComponent } from '@shared/components/page-layout/page-layout.component';
import { PageTitleComponent } from '@shared/components/page-title/page-title';
import { ColaApiClient } from '@general/api/cola-api.client';
import { ColaResponseDTO } from '@general/dto/cola.dto';
import { DetalleResponseDTO } from '@general/dto/detalle.dto';
import { ConfiguracionServicio } from '@general/services/configuracion.servicio';

@Component({
    selector: 'app-operador',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
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

    get atiendeEspeciales(): boolean {
        return (this.authService.getUsuario()?.atenderCasosEspeciales ?? 0) === 1;
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
    turnosPausados: TurnoResponseDTO[] = [];

    // Reasignar dialog
    mostrarDialogoReasignar = false;
    colasReasignar: ColaResponseDTO[] = [];
    colaReasignarSeleccionada: ColaResponseDTO | null = null;
    detallesReasignar: DetalleResponseDTO[] = [];
    detalleReasignarSeleccionado: DetalleResponseDTO | null = null;
    cargandoReasignar = false;

    // Retomar turno dialog — solo turnos EN_ESPERA (los sin atender se retoman desde Turnos pasados)
    mostrarDialogoRetomar = false;
    turnosRetomar: TurnoResponseDTO[] = [];
    cargandoRetomar = false;

    casosEspecialesActivados = false;
    turnoAutomaticoActivado = false;
    cargando = false;
    cargandoInicial = false;
    bloqueoVolverALlamar = false;
    ahora = Date.now();

    // Estado del operador (activar/cerrar/descanso)
    estadoOperador: EstadoOperadorResponseDTO | null = null;
    cargandoEstadoOperador = false;
    mostrarDialogoDescanso = false;
    opcionesTipoDescanso = OPCIONES_TIPO_DESCANSO;

    // Comentario obligatorio cuando el tipo de descanso es "Otro"
    mostrarDialogoComentarioOtro = false;
    comentarioOtro = '';
    private tipoDescansoPendiente: TipoDescanso | null = null;

    get operadorActivo(): boolean {
        return this.estadoOperador?.idEstadoOperador === EstadoOperador.ACTIVA;
    }

    get operadorEnDescanso(): boolean {
        return this.estadoOperador?.idEstadoOperador === EstadoOperador.DESCANSO;
    }

    get operadorCerrado(): boolean {
        return !this.operadorActivo && !this.operadorEnDescanso;
    }

    get nombreTipoDescanso(): string {
        const opcion = this.opcionesTipoDescanso.find(o => o.value === this.estadoOperador?.idTipoDescanso);
        return opcion?.label ?? 'Descanso';
    }

    private wsSubscription?: Subscription;
    private timerInterval?: ReturnType<typeof setInterval>;

    constructor(
        private readonly turnoApi: TurnoApiClient,
        private readonly detalleColaxPuestoApi: DetalleColaxPuestoApiClient,
        private readonly messageService: MessageService,
        private readonly confirmationService: ConfirmationService,
        private readonly turnoWebSocket: TurnoWebSocketApi,
        private readonly colaApi: ColaApiClient,
        private readonly configuracionServicio: ConfiguracionServicio,
        private readonly estadoOperadorApi: EstadoOperadorApiClient,
    ) {}

    ngOnInit(): void {
        this.cargarInicial();
        this.turnoWebSocket.connect(undefined, this.idUsuarioActual);
        this.wsSubscription = this.turnoWebSocket.mensajes.subscribe((evento) => {
            if (!this.cargandoInicial && evento.idSucursal === this.idSucursalActual) this.refrescarTurnos();
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
            const [colasAsignadas, configs, estadoOperador] = await Promise.all([
                this.detalleColaxPuestoApi.listarPorPuesto(this.idPuesto!, this.idSucursalActual),
                this.configuracionServicio.buscarPorSucursal(this.idSucursalActual),
                this.estadoOperadorApi.buscarVigente(this.idUsuarioActual!, this.idSucursalActual)
            ]);
            this.colasAsignadas = colasAsignadas;
            const cfgEspecial = configs.find(c => c.nombre === 'CASOS_ESPECIALES');
            this.casosEspecialesActivados = cfgEspecial?.estado === 1 && cfgEspecial?.parametro === 1;
            const cfgTurnoAutomatico = configs.find(c => c.nombre === 'TURNO_AUTOMATICO');
            this.turnoAutomaticoActivado = cfgTurnoAutomatico?.estado === 1 && cfgTurnoAutomatico?.parametro === 1;
            this.estadoOperador = estadoOperador;
            await this.refrescarTurnos();

            // Si entro/recargo ya ACTIVA (sin pasar por /abrir ni /descanso/quitar) y hay
            // turnos en espera, el llamado automático nunca se disparó para esos turnos —
            // se reintenta acá. No-op si no hay turnos pendientes o si ya tengo uno asignado.
            if (this.turnoAutomaticoActivado
                && this.estadoOperador?.idEstadoOperador === EstadoOperador.ACTIVA
                && !this.turnoActual
                && this.turnosEnEspera.length > 0) {
                try {
                    await this.estadoOperadorApi.verificarAutomatico(this.idUsuarioActual!, this.idSucursalActual, this.idPuesto!);
                    // El evento TURNO_LLAMADO del WebSocket llega mientras cargandoInicial
                    // todavía es true y el suscriptor lo ignora — se refresca acá para no
                    // depender de ese evento y mostrar el turno recién asignado de una vez.
                    await this.refrescarTurnos();
                } catch {
                    // best-effort: si falla, el operador sigue viendo la cola en espera y puede llamar manualmente
                }
            }
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

        const [turnosLlamados, turnosFinalizados, turnosEnEspera, turnosMarcadosEnEspera] = await Promise.all([
            this.turnoApi.buscar({ idSucursal: idSucursalColas, estado: EstadoTurno.LLAMADO, fecha: hoy }),
            this.turnoApi.buscar({ idSucursal: idSucursalColas, estado: EstadoTurno.FINALIZADO, fecha: hoy }),
            this.turnoApi.buscar({
                idSucursal: idSucursalColas,
                estado: EstadoTurno.CREADO,
                fecha: hoy,
                idPuesto,
                idSucursalPuesto: idPuesto != null ? this.idSucursalActual : undefined
            }),
            this.turnoApi.buscar({ idSucursal: idSucursalColas, estado: EstadoTurno.EN_ESPERA, fecha: hoy })
        ]);

        const idUsr = this.idUsuarioActual;
        this.turnosFinalizados = turnosFinalizados.filter(t => idUsr != null && t.idUsuario === idUsr);

        const clavesAsignadas = new Set(this.colasAsignadas.map(c => `${c.idCola}-${c.idDetalle}-${c.idSucursalCola}`));
        const filtrados = turnosEnEspera.filter(t => clavesAsignadas.has(`${t.idCola}-${t.idDetalle}-${t.idSucursal}`));

        this.turnosPausados = turnosMarcadosEnEspera.filter(t =>
            clavesAsignadas.has(`${t.idCola}-${t.idDetalle}-${t.idSucursal}`)
        );

        const porFecha = (a: TurnoResponseDTO, b: TurnoResponseDTO) =>
            new Date(a.fechaCreacion).getTime() - new Date(b.fechaCreacion).getTime();

        if (this.atiendeEspeciales && this.casosEspecialesActivados) {
            const especiales = filtrados.filter(t => t.tipoCasoEspecial != null && t.tipoCasoEspecial > 0).sort(porFecha);
            const normales   = filtrados.filter(t => !t.tipoCasoEspecial || t.tipoCasoEspecial === 0).sort(porFecha);
            this.turnosEnEspera = [...especiales, ...normales];
        } else {
            this.turnosEnEspera = filtrados.sort(porFecha);
        }

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
        if (!this.turnoActual || this.bloqueoVolverALlamar) return;
        this.bloqueoVolverALlamar = true;
        setTimeout(() => { this.bloqueoVolverALlamar = false; }, 2000);
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
        this.refrescarTurnos().catch(() => {});
    }

    marcarEnEspera(): void {
        if (!this.turnoActual) return;
        this.confirmationService.confirm({
            message: `¿Marcar el turno ${this.turnoActual.codigoTurno} como en espera?`,
            header: 'En espera',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Sí, marcar',
            rejectLabel: 'Cancelar',
            accept: () => this.ejecutarEnEspera()
        });
    }

    private async ejecutarEnEspera(): Promise<void> {
        if (!this.turnoActual) return;
        const turno = this.turnoActual;
        try {
            this.cargando = true;
            await this.turnoApi.enEspera(turno.idSucursal, turno.codigoTurno, turno.fechaCreacion);
            this.turnoActual = null;
            localStorage.removeItem(this.turnoActualKey);
            this.messageService.add({
                severity: 'warn', summary: 'En espera',
                detail: `Turno ${turno.codigoTurno} marcado como en espera`, life: 3000
            });
        } catch (err) {
            this.messageService.add({
                severity: 'error', summary: 'Error', detail: extraerMensajeError(err), life: 5000
            });
        } finally {
            this.cargando = false;
        }
        this.refrescarTurnos().catch(() => {});
    }

    private async ejecutarLlamar(turno: TurnoResponseDTO): Promise<void> {
        // Guarda síncrona: si dos clics/taps llegan casi juntos (pantalla táctil, doble-click),
        // el segundo debe descartarse aquí mismo. El binding [disabled]="cargando" del botón no
        // alcanza a repintarse a tiempo entre ambos eventos.
        if (this.cargando) return;
        try {
            this.cargando = true;
            this.turnoActual = await this.turnoApi.llamar(
                turno.idSucursal, turno.codigoTurno, turno.fechaCreacion,
                { idPuesto: this.idPuesto!, idSucursalPuesto: this.idSucursalActual, idUsuario: this.idUsuarioActual }
            );
            if (this.turnoActual) {
                localStorage.setItem(this.turnoActualKey, this.turnoActual.codigoTurno);
            }
            this.turnosEnEspera = this.turnosEnEspera.filter(t => t.codigoTurno !== turno.codigoTurno);
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
        this.refrescarTurnos().catch(() => {});
    }

    private async ejecutarFinalizar(mensajeExito: string): Promise<void> {
        if (!this.turnoActual) return;
        const turno = this.turnoActual;
        try {
            this.cargando = true;
            await this.turnoApi.finalizar(turno.idSucursal, turno.codigoTurno, turno.fechaCreacion);
            this.turnoActual = null;
            localStorage.removeItem(this.turnoActualKey);
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
        this.refrescarTurnos().catch(() => {});
    }

    async abrirRetomar(): Promise<void> {
        try {
            this.cargandoRetomar = true;
            const hoy = new Date().toLocaleDateString('en-CA');
            const idSucursalColas = this.colasAsignadas[0]?.idSucursalCola ?? this.idSucursalActual;
            const enEspera = await this.turnoApi.buscar({
                idSucursal: idSucursalColas,
                estado: EstadoTurno.EN_ESPERA,
                fecha: hoy
            });
            const clavesAsignadas = new Set(this.colasAsignadas.map(c => `${c.idCola}-${c.idDetalle}-${c.idSucursalCola}`));
            this.turnosRetomar = enEspera.filter(t => clavesAsignadas.has(`${t.idCola}-${t.idDetalle}-${t.idSucursal}`));
            this.mostrarDialogoRetomar = true;
        } catch (err) {
            this.messageService.add({
                severity: 'error', summary: 'Error', detail: extraerMensajeError(err), life: 5000
            });
        } finally {
            this.cargandoRetomar = false;
        }
    }

    async retomarTurno(turno: TurnoResponseDTO): Promise<void> {
        this.mostrarDialogoRetomar = false;
        await this.finalizarActivoSiExiste();
        await this.ejecutarLlamar(turno);
    }

    async llamarDirecto(turno: TurnoResponseDTO): Promise<void> {
        await this.finalizarActivoSiExiste();
        await this.ejecutarLlamar(turno);
    }

    /** Llamar un turno en espera puede hacerse con un turno activo: ese turno pasa a finalizado. */
    private async finalizarActivoSiExiste(): Promise<void> {
        if (!this.turnoActual) return;
        await this.ejecutarFinalizar('Turno finalizado, se atiende el turno en espera');
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
            const todasLasColas = await this.colaApi.buscarColasConDetalle(idSucursalColas);
            this.colasReasignar = todasLasColas
                .filter(c => c.estado === 1 && (c.detalles ?? []).some(d => d.estado === 1));
            this.mostrarDialogoReasignar = true;
        } catch (err) {
            this.messageService.add({
                severity: 'error', summary: 'Error', detail: extraerMensajeError(err), life: 5000
            });
        } finally {
            this.cargandoReasignar = false;
        }
    }

    seleccionarColaReasignar(cola: ColaResponseDTO): void {
        this.colaReasignarSeleccionada = cola;
        this.detalleReasignarSeleccionado = null;
        this.detallesReasignar = (cola.detalles ?? []).filter(d => d.estado === 1);
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
                detail: `Turno ${turno.codigoTurno} enviado a ${cola.nombre}`, life: 4000
            });
        } catch (err) {
            this.messageService.add({
                severity: 'error', summary: 'Error al reasignar', detail: extraerMensajeError(err), life: 5000
            });
        } finally {
            this.cargandoReasignar = false;
        }
    }

    /* ── Estado del operador (activar/cerrar/descanso) ────── */

    async abrirOperador(): Promise<void> {
        if (!this.tienePuestoAsignado || this.cargandoEstadoOperador) return;
        try {
            this.cargandoEstadoOperador = true;
            this.estadoOperador = await this.estadoOperadorApi.abrir(this.idUsuarioActual!, this.idSucursalActual, this.idPuesto!);
            this.messageService.add({ severity: 'success', summary: 'Activado', life: 3000 });
            await this.refrescarTurnos();
        } catch (err) {
            this.messageService.add({
                severity: 'error', summary: 'Error al activar', detail: extraerMensajeError(err), life: 5000
            });
        } finally {
            this.cargandoEstadoOperador = false;
        }
    }

    cerrarOperador(): void {
        if (!this.tienePuestoAsignado) return;
        this.confirmationService.confirm({
            message: this.turnoActual
                ? `Se finalizará el turno ${this.turnoActual.codigoTurno} en atención. ¿Finalizar?`
                : '¿Finalizar? No podrás recibir turnos hasta que te actives de nuevo.',
            header: 'Finalizar',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Sí, finalizar',
            rejectLabel: 'Cancelar',
            accept: () => this.ejecutarCerrarOperador()
        });
    }

    private async ejecutarCerrarOperador(): Promise<void> {
        if (this.cargandoEstadoOperador) return;
        try {
            this.cargandoEstadoOperador = true;
            this.estadoOperador = await this.estadoOperadorApi.cerrar(this.idUsuarioActual!, this.idSucursalActual, this.idPuesto!);
            this.turnoActual = null;
            localStorage.removeItem(this.turnoActualKey);
            this.messageService.add({ severity: 'success', summary: 'Finalizado', life: 3000 });
            await this.refrescarTurnos();
        } catch (err) {
            this.messageService.add({
                severity: 'error', summary: 'Error al finalizar', detail: extraerMensajeError(err), life: 5000
            });
        } finally {
            this.cargandoEstadoOperador = false;
        }
    }

    abrirDialogoDescanso(): void {
        if (!this.tienePuestoAsignado) return;
        this.mostrarDialogoDescanso = true;
    }

    seleccionarTipoDescanso(tipo: TipoDescanso): void {
        this.mostrarDialogoDescanso = false;
        if (tipo === TipoDescanso.OTRO) {
            // "Otro" pide explicar el motivo antes de continuar.
            this.tipoDescansoPendiente = tipo;
            this.comentarioOtro = '';
            this.mostrarDialogoComentarioOtro = true;
            return;
        }
        this.confirmarEIniciarDescanso(tipo);
    }

    confirmarComentarioOtro(): void {
        if (!this.comentarioOtro.trim() || !this.tipoDescansoPendiente) return;
        this.mostrarDialogoComentarioOtro = false;
        this.confirmarEIniciarDescanso(this.tipoDescansoPendiente, this.comentarioOtro.trim());
    }

    private confirmarEIniciarDescanso(tipo: TipoDescanso, comentario?: string): void {
        if (this.turnoActual) {
            this.confirmationService.confirm({
                message: `Se finalizará el turno ${this.turnoActual.codigoTurno} en atención. ¿Iniciar descanso?`,
                header: 'Descanso',
                icon: 'pi pi-exclamation-triangle',
                acceptLabel: 'Sí, iniciar descanso',
                rejectLabel: 'Cancelar',
                accept: () => this.ejecutarIniciarDescanso(tipo, comentario)
            });
        } else {
            this.ejecutarIniciarDescanso(tipo, comentario);
        }
    }

    private async ejecutarIniciarDescanso(tipo: TipoDescanso, comentario?: string): Promise<void> {
        if (this.cargandoEstadoOperador) return;
        try {
            this.cargandoEstadoOperador = true;
            this.estadoOperador = await this.estadoOperadorApi.iniciarDescanso(
                this.idUsuarioActual!, this.idSucursalActual, this.idPuesto!, tipo, comentario
            );
            this.turnoActual = null;
            localStorage.removeItem(this.turnoActualKey);
            this.messageService.add({ severity: 'success', summary: 'Descanso iniciado', life: 3000 });
            await this.refrescarTurnos();
        } catch (err) {
            this.messageService.add({
                severity: 'error', summary: 'Error al iniciar descanso', detail: extraerMensajeError(err), life: 5000
            });
        } finally {
            this.cargandoEstadoOperador = false;
        }
    }

    async quitarDescanso(): Promise<void> {
        if (!this.tienePuestoAsignado || this.cargandoEstadoOperador) return;
        try {
            this.cargandoEstadoOperador = true;
            this.estadoOperador = await this.estadoOperadorApi.quitarDescanso(
                this.idUsuarioActual!, this.idSucursalActual, this.idPuesto!
            );
            this.messageService.add({ severity: 'success', summary: 'Descanso terminado', life: 3000 });
            await this.refrescarTurnos();
        } catch (err) {
            this.messageService.add({
                severity: 'error', summary: 'Error al terminar descanso', detail: extraerMensajeError(err), life: 5000
            });
        } finally {
            this.cargandoEstadoOperador = false;
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

    nombreColaPorId(idCola: number, idDetalle?: number, idSucursal?: number): string {
        const match = this.colasAsignadas.find(c =>
            c.idCola === idCola &&
            (idDetalle  == null || c.idDetalle === idDetalle) &&
            (idSucursal == null || c.idSucursalCola === idSucursal)
        );
        if (!match) return `Cola ${idCola}`;
        return match.nombreDetalle ? `${match.nombreCola} → ${match.nombreDetalle}` : match.nombreCola;
    }

    horaDesde(fechaIso: string): string {
        return new Date(fechaIso).toLocaleTimeString('es-CR', {
            hour: '2-digit', minute: '2-digit'
        });
    }
}

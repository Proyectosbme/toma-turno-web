import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { ColaApiClient } from '@general/api/cola-api.client';
import { PersonaApiClient } from '@general/api/persona-api.client';
import { TurnoApiClient } from '@turnos/api/turno-api.client';
import { ColaResponseDTO } from '@general/dto/cola.dto';
import { DetalleResponseDTO } from '@general/dto/detalle.dto';
import { TurnoResponseDTO } from '@turnos/dto/turno.dto';
import { extraerMensajeError } from '@shared/utils/error.util';
import { AuthService } from '@auth/services/auth.service';
import { ConfiguracionServicio } from '@general/services/configuracion.servicio';
import { LayoutService } from '@core/layout/service/layout.service';
import { ImpresoraService } from '@shared/services/impresora.service';
import { TicketService } from '@shared/services/ticket.service';

export interface DuiData {
    numero: string;
    nombres: string;
    apellidos: string;
    fechaNacimiento: string; // DD/MM/YYYY
    sexo: string;
}

@Component({
    selector: 'app-seleccion-turno',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, ProgressSpinnerModule, ToastModule, DialogModule],
    providers: [MessageService],
    templateUrl: './seleccion-turno.html',
    styleUrl: './seleccion-turno.scss'
})
export class SeleccionTurnoPage implements OnInit, OnDestroy {

    readonly layoutService = inject(LayoutService);

    private readonly authService = inject(AuthService);

    get idSucursalActual(): number {
        return this.authService.getUsuario()?.idSucursal ?? 0;
    }

    /* ── Paso actual ── */
    pasoActual: 'escaneo' | 'especial' | 'colas' = 'colas';
    lectorBarcodeActivo = false;
    duiData: DuiData | null = null;
    casosEspecialesActivados = false;
    tipoCasoEspecial: number | null = null;
    get duiEscaneado(): string { return this.duiData?.numero ?? ''; }
    cargandoConfig = false;

    /* ── Colas ── */
    colas: ColaResponseDTO[] = [];
    colaSeleccionada: ColaResponseDTO | null = null;
    detalles: DetalleResponseDTO[] = [];
    detalleSeleccionado: DetalleResponseDTO | null = null;
    cargandoColas    = false;
    cargandoDetalles = false;
    cargandoTurno    = false;
    turnoGenerado: TurnoResponseDTO | null = null;

    /* ── Lector físico de barcode ── */
    inputScanner = '';

    /* ── Auto-reset ── */
    cuentaRegresiva = 0;
    private _autoResetTimer: any = null;
    private _cuentaInterval: any = null;

    /* ── Impresora ── */
    modalImpresoraVisible = false;

    get impresoraConfigurada(): boolean {
        return this.impresoraService.estaConfigurada();
    }

    constructor(
        private readonly colaApi:               ColaApiClient,
        private readonly personaApi:            PersonaApiClient,
        private readonly turnoApi:              TurnoApiClient,
        private readonly messageService:        MessageService,
        private readonly configuracionServicio: ConfiguracionServicio,
        readonly impresoraService:              ImpresoraService,
        private readonly ticketService:         TicketService,
    ) {}

    ngOnInit(): void {
        this.cargarConfigEscaneo();
        if (!this.impresoraService.estaConfigurada()) {
            this.modalImpresoraVisible = true;
        }
    }

    ngOnDestroy(): void { this.cancelarAutoReset(); }

    /* ══════════════════════════════════════════
       Config de escaneo
    ══════════════════════════════════════════ */
    private async cargarConfigEscaneo(): Promise<void> {
        this.cargandoConfig = true;
        try {
            const configs = await this.configuracionServicio.buscarPorSucursal(this.idSucursalActual);
            const cfgEspecial = configs.find(c => c.nombre === 'CASOS_ESPECIALES');
            this.casosEspecialesActivados = cfgEspecial?.estado === 1 && cfgEspecial?.parametro === 1;
            const cfg = configs.find(c => c.nombre === 'ESCANEAR_DUI');
            this.lectorBarcodeActivo = cfg?.estado === 1 && cfg?.parametro === 1;
            if (this.lectorBarcodeActivo) {
                this.pasoActual = 'escaneo';
            } else if (this.casosEspecialesActivados) {
                this.pasoActual = 'especial';
            } else {
                this.pasoActual = 'colas';
                this.cargarColas();
            }
        } catch {
            this.pasoActual = 'colas';
            this.cargarColas();
        } finally {
            this.cargandoConfig = false;
        }
    }

    /* ══════════════════════════════════════════
       Lector físico de código de barras
    ══════════════════════════════════════════ */
    onScannerKeydown(event: KeyboardEvent): void {
        if (event.key === 'Enter' && this.inputScanner.trim()) {
            const raw = this.inputScanner.trim();
            this.confirmarDui({ numero: raw, nombres: '', apellidos: '', fechaNacimiento: '', sexo: '' });
            this.inputScanner = '';
        }
    }

    /* ══════════════════════════════════════════
       Confirmar / omitir DUI
    ══════════════════════════════════════════ */
    confirmarDui(data: DuiData): void {
        this.duiData = data;
        if (this.casosEspecialesActivados && data.fechaNacimiento) {
            const edad = this.calcularEdad(data.fechaNacimiento);
            if (edad >= 60) this.tipoCasoEspecial = 1;
        }
        if (this.casosEspecialesActivados) {
            this.pasoActual = 'especial';
        } else {
            this.pasoActual = 'colas';
            if (this.colas.length === 0) this.cargarColas();
        }
    }

    omitirEscaneo(): void {
        this.duiData = null;
        this.tipoCasoEspecial = null;
        if (this.casosEspecialesActivados) {
            this.pasoActual = 'especial';
        } else {
            this.pasoActual = 'colas';
            if (this.colas.length === 0) this.cargarColas();
        }
    }

    /* ══════════════════════════════════════════
       Caso especial
    ══════════════════════════════════════════ */
    seleccionarCasoEspecial(tipo: number | null): void {
        this.tipoCasoEspecial = tipo;
    }

    confirmarCasoEspecial(): void {
        this.pasoActual = 'colas';
        if (this.colas.length === 0) this.cargarColas();
    }

    calcularEdad(fechaDDMMYYYY: string): number {
        const p = fechaDDMMYYYY.split('/');
        if (p.length !== 3) return 0;
        const nac = new Date(+p[2], +p[1] - 1, +p[0]);
        const hoy = new Date();
        let edad = hoy.getFullYear() - nac.getFullYear();
        const m = hoy.getMonth() - nac.getMonth();
        if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
        return edad;
    }

    /* ══════════════════════════════════════════
       Carga de colas
    ══════════════════════════════════════════ */
    private async cargarColas(): Promise<void> {
        try {
            this.cargandoColas = true;
            const resultado = await this.colaApi.buscarColasConDetalle(this.idSucursalActual);
            this.colas = resultado
                .filter(c => c.estado === 1)
                .sort((a, b) => a.prioridad - b.prioridad);
        } catch (err) {
            this.messageService.add({
                severity: 'error', summary: 'Error',
                detail: 'No se pudieron cargar las colas: ' + extraerMensajeError(err), life: 5000
            });
        } finally {
            this.cargandoColas = false;
        }
    }

    async seleccionarCola(cola: ColaResponseDTO): Promise<void> {
        if (this.cargandoDetalles || this.cargandoTurno) return;
        this.colaSeleccionada    = cola;
        this.detalleSeleccionado = null;
        this.detalles            = [];
        try {
            this.cargandoDetalles = true;
            const colaConDetalles = await this.colaApi.buscarConDetalles(cola.id, cola.idSucursal);
            const detallesActivos = (colaConDetalles.detalles ?? []).filter(d => d.estado === 1);
            if (detallesActivos.length > 0) {
                this.detalles = detallesActivos;
            } else {
                await this.generarTurno(cola.id, null);
            }
        } catch (err) {
            this.messageService.add({
                severity: 'error', summary: 'Error',
                detail: 'No se pudieron cargar los detalles: ' + extraerMensajeError(err), life: 5000
            });
        } finally {
            this.cargandoDetalles = false;
        }
    }

    async seleccionarDetalle(detalle: DetalleResponseDTO): Promise<void> {
        if (this.cargandoTurno) return;
        this.detalleSeleccionado = detalle;
        await this.generarTurno(this.colaSeleccionada!.id, detalle.idDetalle);
    }

    private async generarTurno(idCola: number, idDetalle: number | null): Promise<void> {
        try {
            this.cargandoTurno = true;
            let idPersona: number | undefined;
            if (this.duiData) {
                const persona = await this.personaApi.crearOActualizar({
                    dui:             this.duiData.numero,
                    nombres:         this.duiData.nombres  || undefined,
                    apellidos:       this.duiData.apellidos || undefined,
                    fechaNacimiento: this.duiData.fechaNacimiento || undefined,
                    sexo:            this.duiData.sexo     || undefined,
                });
                idPersona = persona.id;
            }
            this.turnoGenerado = await this.turnoApi.crear({
                idSucursal: this.idSucursalActual,
                idCola,
                idDetalle:  idDetalle ?? undefined,
                idPersona,
                tipoCasoEspecial: this.tipoCasoEspecial ?? undefined,
            });
            this.generarPdfTicket();
            this.iniciarAutoReset();
        } catch (err) {
            this.messageService.add({
                severity: 'error', summary: 'Error al generar turno',
                detail: extraerMensajeError(err), life: 5000
            });
        } finally {
            this.cargandoTurno = false;
        }
    }

    /* ══════════════════════════════════════════
       Ticket PDF
    ══════════════════════════════════════════ */
    generarPdfTicket(): void {
        if (!this.turnoGenerado) return;
        const html = this.ticketService.generarHtml({
            turno:   this.turnoGenerado,
            cola:    this.colaSeleccionada,
            detalle: this.detalleSeleccionado,
            dui:     this.duiData,
        });
        this.impresoraService.imprimir(html);
    }

    /* ══════════════════════════════════════════
       Configuración de impresora
    ══════════════════════════════════════════ */
    abrirModalImpresora(): void {
        this.modalImpresoraVisible = true;
    }

    confirmarConfiguracion(): void {
        this.impresoraService.marcarComoConfigurada();
        this.modalImpresoraVisible = false;
    }

    limpiarConfiguracion(): void {
        this.impresoraService.limpiarConfiguracion();
        this.modalImpresoraVisible = false;
        this.messageService.add({
            severity: 'info', summary: 'Configuración eliminada',
            detail: 'La próxima impresión mostrará la guía de configuración', life: 3000
        });
    }

    private iniciarAutoReset(): void {
        this.cancelarAutoReset();
        this.cuentaRegresiva = 3;
        this._cuentaInterval = setInterval(() => {
            this.cuentaRegresiva--;
            if (this.cuentaRegresiva <= 0) {
                clearInterval(this._cuentaInterval);
                this._cuentaInterval = null;
            }
        }, 1000);
        this._autoResetTimer = setTimeout(() => this.nuevoTurno(), 3000);
    }

    private cancelarAutoReset(): void {
        if (this._autoResetTimer)   { clearTimeout(this._autoResetTimer);   this._autoResetTimer = null; }
        if (this._cuentaInterval)   { clearInterval(this._cuentaInterval);  this._cuentaInterval = null; }
        this.cuentaRegresiva = 0;
    }

    nuevoTurno(): void {
        this.cancelarAutoReset();
        this.colaSeleccionada    = null;
        this.detalleSeleccionado = null;
        this.detalles            = [];
        this.turnoGenerado       = null;
        this.tipoCasoEspecial    = null;

        if (this.lectorBarcodeActivo) {
            this.duiData    = null;
            this.inputScanner = '';
            this.pasoActual = 'escaneo';
        } else if (this.casosEspecialesActivados) {
            this.pasoActual = 'especial';
        }
    }
}

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
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
    imports: [CommonModule, FormsModule, ButtonModule, ProgressSpinnerModule, ToastModule, DialogModule, SelectModule],
    providers: [MessageService],
    templateUrl: './seleccion-turno.html',
    styleUrl: './seleccion-turno.scss'
})
export class SeleccionTurnoPage implements OnInit {

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

    /* ── Impresora ── */
    modalImpresoraVisible = false;
    impresoras: string[] = [];
    cargandoImpresoras = false;
    impresoraSeleccionada: string | null = null;

    get impresoraGuardada(): string | null {
        return this.impresoraService.getImpresoraPreferida();
    }

    constructor(
        private readonly colaApi:               ColaApiClient,
        private readonly personaApi:            PersonaApiClient,
        private readonly turnoApi:              TurnoApiClient,
        private readonly messageService:        MessageService,
        private readonly configuracionServicio: ConfiguracionServicio,
        readonly impresoraService:              ImpresoraService,
    ) {}

    ngOnInit(): void { this.cargarConfigEscaneo(); }

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
        const t = this.turnoGenerado;

        const fecha    = new Date(t.fechaCreacion);
        const fechaStr = fecha.toLocaleDateString('es-SV', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const horaStr  = fecha.toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' });

        const nombreCola    = this.colaSeleccionada?.nombre    ?? '';
        const nombreDetalle = this.detalleSeleccionado?.nombre ?? '';
        const dui           = this.duiData;

        const detalleRow = nombreDetalle
            ? `<tr><td class="lbl">Tipo</td><td>${nombreDetalle}</td></tr>` : '';

        const duiSeccion = dui ? `
  <div class="sep">----- DATOS DEL CIUDADANO -----</div>
  <table>
    <tr><td class="lbl">DUI</td><td>${dui.numero}</td></tr>
    ${dui.apellidos       ? `<tr><td class="lbl">Apellidos</td><td>${dui.apellidos}</td></tr>` : ''}
    ${dui.nombres         ? `<tr><td class="lbl">Nombres</td><td>${dui.nombres}</td></tr>` : ''}
    ${dui.fechaNacimiento ? `<tr><td class="lbl">Nacimiento</td><td>${dui.fechaNacimiento}</td></tr>` : ''}
  </table>` : '';

        const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><title>Ticket</title>
<style>
  @page{size:72mm auto;margin:3mm 4mm}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Courier New',monospace;font-size:10px;color:#000;width:100%}
  .centro{text-align:center}
  .titulo{font-size:13px;font-weight:bold;text-transform:uppercase;padding:4px 0 2px}
  .sep{font-size:9px;color:#555;padding:4px 0;text-align:center}
  .codigo{font-size:48px;font-weight:900;letter-spacing:4px;line-height:1;text-align:center;padding:8px 0}
  table{width:100%;border-collapse:collapse;padding:2px 0}
  td{padding:2px 1px;vertical-align:top;font-size:10px}
  .lbl{font-weight:bold;white-space:nowrap;padding-right:6px;width:38%}
  .pie{font-size:9px;font-style:italic;text-align:center;padding:6px 0 2px}
</style></head>
<body>
  <div class="centro titulo">*** TICKET DE TURNO ***</div>
  <div class="sep">================================</div>
  <div class="codigo">${t.codigoTurno}</div>
  <div class="sep">--------------------------------</div>
  <table>
    <tr><td class="lbl">Servicio</td><td>${nombreCola}</td></tr>
    ${detalleRow}
    <tr><td class="lbl">Fecha</td><td>${fechaStr}</td></tr>
    <tr><td class="lbl">Hora</td><td>${horaStr}</td></tr>
  </table>
  ${duiSeccion}
  <div class="sep">================================</div>
  <div class="pie">Por favor espere a ser llamado</div>
</body></html>`;

        this.impresoraService.imprimir(html);
    }

    /* ══════════════════════════════════════════
       Configuración de impresora
    ══════════════════════════════════════════ */
    async abrirModalImpresora(): Promise<void> {
        this.impresoraSeleccionada = this.impresoraService.getImpresoraPreferida();
        this.modalImpresoraVisible = true;
        this.impresoras = [];
        this.cargandoImpresoras = true;
        try {
            this.impresoras = await this.impresoraService.obtenerImpresoras();
        } catch {
            this.messageService.add({
                severity: 'warn', summary: 'QZ Tray no disponible',
                detail: 'No se pudo conectar a QZ Tray. Asegúrate de que esté instalado y corriendo.',
                life: 5000
            });
        } finally {
            this.cargandoImpresoras = false;
        }
    }

    guardarImpresora(): void {
        if (this.impresoraSeleccionada) {
            this.impresoraService.setImpresoraPreferida(this.impresoraSeleccionada);
            this.messageService.add({
                severity: 'success', summary: 'Impresora guardada',
                detail: `Se usará "${this.impresoraSeleccionada}" para imprimir tickets`, life: 3000
            });
        } else {
            this.impresoraService.limpiarImpresora();
            this.messageService.add({
                severity: 'info', summary: 'Sin impresora',
                detail: 'Se usará el diálogo del navegador al imprimir', life: 3000
            });
        }
        this.modalImpresoraVisible = false;
    }

    nuevoTurno(): void {
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

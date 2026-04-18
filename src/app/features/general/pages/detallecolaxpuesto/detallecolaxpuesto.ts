import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { PageLayoutComponent } from '@shared/components/page-layout/page-layout.component';
import { SectionComponent } from '@shared/components/section/section.component';
import { PageTitleComponent } from '@shared/components/page-title/page-title';
import { TableComponent, TableItem } from '@shared/components/table/table';
import { SearchPanelComponent } from '@shared/components/search-panel/search-panel';
import { DetalleColaxPuestoServicio } from '@general/services/detallecolaxpuesto.servicio';
import { SucursalServicio } from '@general/services/sucursal.servicio';
import { PuestoServicio } from '@general/services/puesto.servicio';
import { ColaServicio } from '@general/services/cola.servicio';
import { COLUMNAS_TABLA, CAMPOS_FILTRO, crearFormularioFiltro } from './detallecolaxpuesto.config';
import { NotificacionServicio } from '@shared/services/notificacion.servicio';
import { extraerMensajeError } from '@shared/utils/error.util';
import { OpcionSelect } from '@shared/dto/opcion-select.dto';
import { ColaResponseDTO } from '@general/dto/cola.dto';
import { AuthService } from '@auth/services/auth.service';

@Component({
    selector: 'app-detallecolaxpuesto',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        ButtonModule,
        TooltipModule,
        DialogModule,
        ToastModule,
        SelectModule,
        InputNumberModule,
        PageLayoutComponent,
        SectionComponent,
        PageTitleComponent,
        TableComponent,
        SearchPanelComponent
    ],
    templateUrl: './detallecolaxpuesto.html',
    styleUrl: './detallecolaxpuesto.scss'
})
export class DetalleColaxPuestoPage implements OnInit {

    /* ── Tabla ── */
    detalles: TableItem[] = [];
    detalleSeleccionado: TableItem | null = null;
    cargando = false;
    columnas = COLUMNAS_TABLA;

    /* ── Filtro de puesto (ahora reactivo) ── */
    formularioFiltro = crearFormularioFiltro();
    camposFiltro = CAMPOS_FILTRO;
    advertencia = '';

    /** Puesto actualmente consultado (para habilitar el botón Asignar en el header) */
    puestoSeleccionado: { idPuesto: number; idSucursal: number } | null = null;
    nombrePuestoSeleccionado = '';

    /* ── Dialog asignar ── */
    dialogoVisible = false;
    cargandoDialog = false;
    opcionesDetalles: OpcionSelect[] = [];
    opcionesColas: OpcionSelect[] = [];
    colaSeleccionada: ColaResponseDTO | null = null;
    todosAsignados = false;

    formularioAsignar = new FormGroup({
        idCola: new FormControl<number | null>(null, [Validators.required]),
        idDetalle: new FormControl<number | null>(null),
        prioridad: new FormControl<number>(1, [Validators.required, Validators.min(1), Validators.max(10)])
    });

    constructor(
        private readonly detalleServicio: DetalleColaxPuestoServicio,
        private readonly sucursalServicio: SucursalServicio,
        private readonly puestoServicio: PuestoServicio,
        private readonly colaServicio: ColaServicio,
        private readonly notificacion: NotificacionServicio,
        private readonly authService: AuthService
    ) { }

    ngOnInit(): void {
        this.cargarSucursales();
        this.escucharCambioSucursal();
    }

    /* ══════════════════════════════════════════
       Carga inicial de sucursales
    ══════════════════════════════════════════ */
    private async cargarSucursales(): Promise<void> {
        try {
            let opciones = await this.sucursalServicio.obtenerOpciones();

            if (this.authService.esSubAdmin()) {
                const idFija = this.authService.idSucursalFija()!;
                opciones = opciones.filter(o => o.value === idFija);
                // Disparar el valueChanges para que cargue los puestos automáticamente
                this.formularioFiltro.get('idSucursal')?.setValue(idFija);
                this.formularioFiltro.get('idSucursal')?.disable();
            }

            const campo = this.camposFiltro.find(f => f.name === 'idSucursal');
            if (campo) campo.options = opciones;
        } catch {
            this.notificacion.error('Error', 'No se pudieron cargar las sucursales');
        }
    }

    /* ══════════════════════════════════════════
       Reaccionar al cambio de sucursal en el formulario
       (equivalente al antiguo onSucursalFiltroChange)
    ══════════════════════════════════════════ */
    private escucharCambioSucursal(): void {
    const controlPuesto = this.formularioFiltro.get('idPuesto')!;

    this.formularioFiltro.get('idSucursal')!.valueChanges.subscribe(async (idSucursal) => {
        controlPuesto.reset(null, { emitEvent: false });
        controlPuesto.disable({ emitEvent: false });
        this.detalles = [];
        this.detalleSeleccionado = null;
        this.puestoSeleccionado = null;

        const campoPuesto = this.camposFiltro.find(f => f.name === 'idPuesto');
        if (campoPuesto) campoPuesto.options = [];

        if (idSucursal == null) return;

        try {
            const opciones = await this.puestoServicio.obtenerOpciones(idSucursal);
            if (campoPuesto) campoPuesto.options = opciones;
            controlPuesto.enable({ emitEvent: false }); // habilitar solo si hay sucursal
        } catch {
            this.notificacion.error('Error', 'No se pudieron cargar los puestos');
        }
    });
}

    /* ══════════════════════════════════════════
       Listar detalles del puesto
    ══════════════════════════════════════════ */
    async listar(): Promise<void> {
        const { idSucursal, idPuesto } = this.formularioFiltro.getRawValue();

        if (idSucursal == null || idPuesto == null) {
            this.advertencia = 'Debe seleccionar una sucursal y un puesto';
            return;
        }

        this.advertencia = '';
        this.detalleSeleccionado = null;
        this.puestoSeleccionado = { idPuesto, idSucursal };

        const campoPuesto = this.camposFiltro.find(f => f.name === 'idPuesto');
        // eslint-disable-next-line eqeqeq
        const opcionPuesto = campoPuesto?.options?.find(o => o.value == idPuesto);
        this.nombrePuestoSeleccionado = opcionPuesto?.label ?? `Puesto #${idPuesto}`;

        try {
            this.cargando = true;
            const resultado = await this.detalleServicio.listarPorPuesto(idPuesto, idSucursal);

            this.detalles = resultado.map(d => ({
                _uid: `${d.idPuesto}_${d.idSucursalPuesto}_${d.idCola}_${d.idDetalle}_${d.idSucursalCola}`,
                idPuesto: d.idPuesto,
                idSucursalPuesto: d.idSucursalPuesto,
                idCola: d.idCola,
                idDetalle: d.idDetalle,
                idSucursalCola: d.idSucursalCola,
                prioridad: d.prioridad,
                nombreCola: d.nombreCola,
                nombreDetalle: d.nombreDetalle,
                userCreacion: d.userCreacion,
                fechaCreacion: d.fechaCreacion
            }));

            if (this.detalles.length === 0) {
                this.notificacion.advertencia('Sin resultados', 'El puesto no tiene detalles de cola asignados');
            }
        } catch (err) {
            this.notificacion.error('Error al listar', extraerMensajeError(err));
            this.detalles = [];
        } finally {
            this.cargando = false;
        }
    }

    limpiar(): void {
        this.formularioFiltro.reset();
        this.detalles = [];
        this.detalleSeleccionado = null;
        this.puestoSeleccionado = null;
        this.advertencia = '';

        const campoPuesto = this.camposFiltro.find(f => f.name === 'idPuesto');
        if (campoPuesto) campoPuesto.options = [];
    }

    seleccionarDetalle(item: TableItem): void {
        this.detalleSeleccionado = item;
    }

    /* ══════════════════════════════════════════
       Dialog — Asignar
    ══════════════════════════════════════════ */
    async abrirAsignar(): Promise<void> {
        if (!this.puestoSeleccionado) return;

        this.formularioAsignar.reset({ prioridad: 1 });
        this.opcionesColas = [];
        this.opcionesDetalles = [];
        this.colaSeleccionada = null;
        this.todosAsignados = false;
        this.dialogoVisible = true;

        try {
            const colas = await this.colaServicio.buscar({ idSucursal: this.puestoSeleccionado.idSucursal });
            this.opcionesColas = colas.map(c => ({ label: c.nombre, value: c.id }));
        } catch {
            this.notificacion.error('Error', 'No se pudieron cargar las colas');
        }
    }

    async onColaChange(idCola: number | null): Promise<void> {
        this.formularioAsignar.get('idDetalle')?.reset();
        this.opcionesDetalles = [];
        this.colaSeleccionada = null;
        this.todosAsignados = false;

        if (idCola == null || !this.puestoSeleccionado) return;

        try {
            const cola = await this.colaServicio.obtenerConDetalles(idCola, this.puestoSeleccionado.idSucursal);
            this.colaSeleccionada = cola;

            const yaAsignados = new Set(
                this.detalles
                    .filter(d => d['idCola'] === idCola)
                    .map(d => d['idDetalle'] as number)
            );

            this.opcionesDetalles = (cola.detalles ?? [])
                .filter(d => d.estado === 1 && !yaAsignados.has(d.idDetalle))
                .map(d => ({ label: d.nombre, value: d.idDetalle }));

            this.todosAsignados = this.opcionesDetalles.length === 0;
        } catch {
            this.notificacion.error('Error', 'No se pudieron cargar los detalles de la cola');
        }
    }

    cerrarDialogo(): void {
        this.dialogoVisible = false;
        this.formularioAsignar.reset({ prioridad: 1 });
        this.opcionesDetalles = [];
        this.colaSeleccionada = null;
        this.todosAsignados = false;
    }

    async asignar(): Promise<void> {
        if (this.formularioAsignar.controls.idCola.invalid || this.formularioAsignar.controls.prioridad.invalid) {
            this.formularioAsignar.markAllAsTouched();
            this.notificacion.advertencia('Formulario incompleto', 'Debes seleccionar una cola y una prioridad válida (1-10)');
            return;
        }
        if (!this.puestoSeleccionado || !this.colaSeleccionada) return;

        const { idCola, idDetalle, prioridad } = this.formularioAsignar.getRawValue();

        const idsAAsignar: number[] = idDetalle != null
            ? [idDetalle]
            : this.opcionesDetalles.map(o => o.value as number);

        if (idsAAsignar.length === 0) {
            this.notificacion.advertencia('Sin detalles', 'No hay detalles disponibles para asignar en esta cola');
            return;
        }

        try {
            this.cargandoDialog = true;
            const usuario = this.authService.getUsuario()?.codigoUsuario ?? '';
            for (const idDet of idsAAsignar) {
                await this.detalleServicio.asignar({
                    idPuesto: this.puestoSeleccionado.idPuesto,
                    idSucursalPuesto: this.puestoSeleccionado.idSucursal,
                    idCola: idCola!,
                    idDetalle: idDet,
                    idSucursalCola: this.colaSeleccionada.idSucursal,
                    prioridad: prioridad!,
                    usuario
                });
            }

            const msg = idsAAsignar.length > 1
                ? `${idsAAsignar.length} detalles fueron asignados al puesto correctamente`
                : 'El detalle fue asignado al puesto correctamente';
            this.notificacion.exito('Asignado', msg);
            this.cerrarDialogo();
            await this.listar();
        } catch (err) {
            this.notificacion.error('Error al asignar', extraerMensajeError(err));
        } finally {
            this.cargandoDialog = false;
        }
    }

    /* ══════════════════════════════════════════
       Desasignar
    ══════════════════════════════════════════ */
    async desasignar(): Promise<void> {
        if (!this.detalleSeleccionado) return;

        const d = this.detalleSeleccionado;
        try {
            this.cargando = true;
            await this.detalleServicio.desasignar(
                d['idPuesto'] as number,
                d['idSucursalPuesto'] as number,
                d['idCola'] as number,
                d['idDetalle'] as number,
                d['idSucursalCola'] as number
            );

            this.notificacion.exito('Desasignado', 'El detalle fue removido del puesto correctamente');
            this.detalleSeleccionado = null;
            await this.listar();
        } catch (err) {
            this.notificacion.error('Error al desasignar', extraerMensajeError(err));
        } finally {
            this.cargando = false;
        }
    }
}

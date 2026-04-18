import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { PageLayoutComponent } from '@shared/components/page-layout/page-layout.component';
import { SectionComponent } from '@shared/components/section/section.component';
import { PageTitleComponent } from '@shared/components/page-title/page-title';
import { FormPanelComponent } from '@shared/components/form-panel/form-panel';
import { TableComponent, TableItem } from '@shared/components/table/table';
import { SearchPanelComponent } from '@shared/components/search-panel/search-panel';
import { PuestoRequestDTO } from '@general/dto/puesto.dto';
import { PuestoServicio } from '@general/services/puesto.servicio';
import { SucursalServicio } from '@general/services/sucursal.servicio';
import { DetalleColaxPuestoServicio } from '@general/services/detallecolaxpuesto.servicio';
import { ColaServicio } from '@general/services/cola.servicio';
import {
    CAMPOS_FORMULARIO, CAMPOS_BUSQUEDA, COLUMNAS_TABLA,
    crearFormularioPuesto, crearFormularioBusqueda
} from './puesto.config';
import { COLUMNAS_TABLA as COLUMNAS_COLAS } from '../detallecolaxpuesto/detallecolaxpuesto.config';
import { NotificacionServicio } from '@shared/services/notificacion.servicio';
import { extraerMensajeError } from '@shared/utils/error.util';
import { OpcionSelect } from '@shared/dto/opcion-select.dto';
import { ColaResponseDTO } from '@general/dto/cola.dto';
import { AuthService } from '@auth/services/auth.service';

@Component({
    selector: 'app-puesto',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        ButtonModule,
        InputTextModule,
        TooltipModule,
        DialogModule,
        ToastModule,
        SelectModule,
        InputNumberModule,
        PageLayoutComponent,
        SectionComponent,
        PageTitleComponent,
        FormPanelComponent,
        TableComponent,
        SearchPanelComponent
    ],
    templateUrl: './puesto.html',
    styleUrl: './puesto.scss'
})
export class PuestoPage implements OnInit {

    /* ── Formulario crear / editar ── */
    formularioPuesto = crearFormularioPuesto();
    camposFormulario = CAMPOS_FORMULARIO;

    /* ── Búsqueda ── */
    formularioBusqueda = crearFormularioBusqueda();
    camposBusqueda = CAMPOS_BUSQUEDA;

    /* ── Tabla puestos ── */
    puestos: TableItem[] = [];
    puestoSeleccionado: TableItem | null = null;
    cargando = false;
    columnas = COLUMNAS_TABLA;

    /* ── Dialog puesto ── */
    dialogoVisible = false;
    dialogoTitulo = 'Nuevo Puesto';
    advertenciaBusqueda = '';

    /* ── Colas asignadas al puesto seleccionado ── */
    colasAsignadas: TableItem[] = [];
    colaAsignadaSeleccionada: TableItem | null = null;
    cargandoColas = false;
    columnasColas = COLUMNAS_COLAS;

    /* ── Dialog: asignar cola ── */
    dialogoColaVisible = false;
    cargandoDialogCola = false;
    opcionesColas: OpcionSelect[] = [];
    opcionesDetallesCola: OpcionSelect[] = [];
    colaSeleccionadaDialog: ColaResponseDTO | null = null;
    todosDetallesAsignados = false;

    formularioAsignarCola = new FormGroup({
        idCola: new FormControl<number | null>(null, [Validators.required]),
        /** Opcional: vacío = asignar todos los detalles disponibles de la cola */
        idDetalle: new FormControl<number | null>(null),
        prioridad: new FormControl<number>(1, [Validators.required, Validators.min(1), Validators.max(10)])
    });

    constructor(
        private readonly puestoServicio: PuestoServicio,
        private readonly sucursalServicio: SucursalServicio,
        private readonly detalleServicio: DetalleColaxPuestoServicio,
        private readonly colaServicio: ColaServicio,
        private readonly notificacion: NotificacionServicio,
        private readonly authService: AuthService
    ) { }

    ngOnInit(): void {
        this.cargarSucursales();
    }

    /* ══════════════════════════════════════════
       Carga de sucursales para selects
    ══════════════════════════════════════════ */
    private async cargarSucursales(): Promise<void> {
        try {
            let opciones = await this.sucursalServicio.obtenerOpciones();

            if (this.authService.esSubAdmin()) {
                const idFija = this.authService.idSucursalFija()!;
                opciones = opciones.filter(o => o.value === idFija);

                this.formularioBusqueda.get('idSucursal')?.setValue(idFija);
                this.formularioBusqueda.get('idSucursal')?.disable();
            }

            const campoFormulario = this.camposFormulario.find(f => f.name === 'idSucursal');
            if (campoFormulario) campoFormulario.options = opciones;

            const campoBusqueda = this.camposBusqueda.find(f => f.name === 'idSucursal');
            if (campoBusqueda) campoBusqueda.options = opciones;

            if (this.authService.esSubAdmin()) this.buscar();
        } catch {
            this.notificacion.error('Error', 'No se pudieron cargar las sucursales');
        }
    }

    /* ══════════════════════════════════════════
       Dialog puesto
    ══════════════════════════════════════════ */
    abrirNuevo(): void {
        this.puestoSeleccionado = null;
        this.limpiarSeccionColas();
        this.formularioPuesto.reset({ estado: 1 });
        if (this.authService.esSubAdmin()) {
            this.formularioPuesto.get('idSucursal')?.setValue(this.authService.idSucursalFija());
            this.formularioPuesto.get('idSucursal')?.disable();
        } else {
            this.formularioPuesto.get('idSucursal')?.enable();
        }
        this.dialogoTitulo = 'Nuevo Puesto';
        this.dialogoVisible = true;
    }

    abrirEditar(): void {
        if (!this.puestoSeleccionado) return;
        this.dialogoTitulo = 'Editar Puesto';
        this.formularioPuesto.patchValue({
            idSucursal: this.puestoSeleccionado['idSucursal'] as number,
            nombre: this.puestoSeleccionado['nombre'] as string,
                nombreLlamada: this.puestoSeleccionado['nombreLlamada'] as string,
            estado: this.puestoSeleccionado['estado'] as number
        });
        this.formularioPuesto.get('idSucursal')?.disable();
        this.dialogoVisible = true;
    }

    cerrarDialogo(): void {
        this.dialogoVisible = false;
        this.formularioPuesto.reset({ estado: 1 });
    }

    /* ══════════════════════════════════════════
       Guardar puesto
    ══════════════════════════════════════════ */
    async guardar(): Promise<void> {
        if (this.formularioPuesto.invalid) {
            this.formularioPuesto.markAllAsTouched();
            this.notificacion.advertencia('Formulario incompleto', 'Revisa los campos obligatorios');
            return;
        }

        const datos = this.formularioPuesto.getRawValue();
        const dto: PuestoRequestDTO = {
            idSucursal: Number(datos.idSucursal),
            nombre: datos.nombre ?? '',
            nombreLlamada: datos.nombreLlamada ?? '',
            estado: Number(datos.estado),
            usuario: this.authService.getUsuario()?.codigoUsuario ?? ''
        };

        try {
            this.cargando = true;
            const idExistente = this.puestoSeleccionado
                ? this.puestoSeleccionado['id'] as number
                : undefined;

            await this.puestoServicio.guardar(dto, idExistente);

            this.notificacion.exito(
                idExistente ? 'Puesto modificado' : 'Puesto creado',
                idExistente
                    ? `El puesto "${dto.nombre}" fue actualizado correctamente`
                    : `El puesto "${dto.nombre}" fue creado correctamente`
            );

            this.cerrarDialogo();
            await this.buscar();
        } catch (err) {
            this.notificacion.error('Error al guardar puesto', extraerMensajeError(err));
        } finally {
            this.cargando = false;
        }
    }

    /* ══════════════════════════════════════════
       Búsqueda
    ══════════════════════════════════════════ */
    async buscar(): Promise<void> {
        const filtro = this.formularioBusqueda.getRawValue();
        const tieneNombre = !!filtro.nombre?.trim();
        const tieneSucursal = filtro.idSucursal != null && filtro.idSucursal !== '';

        if (!tieneNombre && !tieneSucursal) {
            this.advertenciaBusqueda = 'Debe ingresar un nombre o seleccionar una sucursal';
            return;
        }

        this.advertenciaBusqueda = '';
        this.puestoSeleccionado = null;
        this.limpiarSeccionColas();

        try {
            this.cargando = true;
            const resultado = await this.puestoServicio.buscar({
                nombre: tieneNombre ? filtro.nombre!.trim() : undefined,
                idSucursal: tieneSucursal ? Number(filtro.idSucursal) : undefined
            });

            this.puestos = resultado.map(p => ({
                _uid: `${p.id}_${p.idSucursal}`,
                id: p.id,
                nombre: p.nombre,
                nombreLlamada: p.nombreLlamada,
                estado: p.estado,
                idSucursal: p.idSucursal,
                nombreSucursal: p.nombreSucursal
            }));

            if (this.puestos.length === 0) {
                this.notificacion.advertencia('Sin resultados', 'No se encontraron puestos con los filtros ingresados');
            }
        } catch (err) {
            this.notificacion.error('Error al buscar', extraerMensajeError(err));
            this.puestos = [];
        } finally {
            this.cargando = false;
        }
    }

    limpiarBusqueda(): void {
        this.formularioBusqueda.reset();
        if (this.authService.esSubAdmin()) {
            const idFija = this.authService.idSucursalFija()!;
            this.formularioBusqueda.get('idSucursal')?.setValue(idFija);
            this.formularioBusqueda.get('idSucursal')?.disable();
        }
        this.advertenciaBusqueda = '';
        this.puestos = [];
        this.puestoSeleccionado = null;
        this.limpiarSeccionColas();
    }

    /* ══════════════════════════════════════════
       Selección de puesto
    ══════════════════════════════════════════ */
    seleccionarPuesto(item: TableItem): void {
        this.puestoSeleccionado = item;
        this.cargarColasAsignadas(item);
    }

    /* ══════════════════════════════════════════
       Colas asignadas al puesto
    ══════════════════════════════════════════ */
    private limpiarSeccionColas(): void {
        this.colasAsignadas = [];
        this.colaAsignadaSeleccionada = null;
    }

    private async cargarColasAsignadas(puesto: TableItem): Promise<void> {
        const idPuesto = puesto['id'] as number;
        const idSucursal = puesto['idSucursal'] as number;

        this.colaAsignadaSeleccionada = null;
        try {
            this.cargandoColas = true;
            const resultado = await this.detalleServicio.listarPorPuesto(idPuesto, idSucursal);
            this.colasAsignadas = resultado.map(d => ({
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
        } catch (err) {
            this.notificacion.error('Error al cargar colas', extraerMensajeError(err));
            this.colasAsignadas = [];
        } finally {
            this.cargandoColas = false;
        }
    }

    seleccionarColaAsignada(item: TableItem): void {
        this.colaAsignadaSeleccionada = item;
    }

    /* ══════════════════════════════════════════
       Dialog: asignar cola al puesto
    ══════════════════════════════════════════ */
    async abrirAsignarCola(): Promise<void> {
        if (!this.puestoSeleccionado) return;

        this.formularioAsignarCola.reset({ prioridad: 1 });
        this.opcionesColas = [];
        this.opcionesDetallesCola = [];
        this.colaSeleccionadaDialog = null;
        this.todosDetallesAsignados = false;
        this.dialogoColaVisible = true;

        const idSucursal = this.puestoSeleccionado['idSucursal'] as number;
        try {
            const colas = await this.colaServicio.buscar({ idSucursal });
            this.opcionesColas = colas.map(c => ({ label: c.nombre, value: c.id }));
        } catch {
            this.notificacion.error('Error', 'No se pudieron cargar las colas');
        }
    }

    async onColaDialogChange(idCola: number | null): Promise<void> {
        this.formularioAsignarCola.get('idDetalle')?.reset();
        this.opcionesDetallesCola = [];
        this.colaSeleccionadaDialog = null;
        this.todosDetallesAsignados = false;

        if (idCola == null || !this.puestoSeleccionado) return;

        const idSucursal = this.puestoSeleccionado['idSucursal'] as number;
        try {
            const cola = await this.colaServicio.obtenerConDetalles(idCola, idSucursal);
            this.colaSeleccionadaDialog = cola;

            /* Filtrar detalles que ya están asignados a este puesto */
            const yaAsignados = new Set(
                this.colasAsignadas
                    .filter(d => d['idCola'] === idCola)
                    .map(d => d['idDetalle'] as number)
            );

            this.opcionesDetallesCola = (cola.detalles ?? [])
                .filter(d => d.estado === 1 && !yaAsignados.has(d.idDetalle))
                .map(d => ({ label: d.nombre, value: d.idDetalle }));

            this.todosDetallesAsignados = this.opcionesDetallesCola.length === 0;
        } catch {
            this.notificacion.error('Error', 'No se pudieron cargar los detalles de la cola');
        }
    }

    cerrarDialogoCola(): void {
        this.dialogoColaVisible = false;
        this.formularioAsignarCola.reset({ prioridad: 1 });
        this.opcionesDetallesCola = [];
        this.colaSeleccionadaDialog = null;
        this.todosDetallesAsignados = false;
    }

    async asignarCola(): Promise<void> {
        if (this.formularioAsignarCola.controls.idCola.invalid || this.formularioAsignarCola.controls.prioridad.invalid) {
            this.formularioAsignarCola.markAllAsTouched();
            this.notificacion.advertencia('Formulario incompleto', 'Debes seleccionar una cola y una prioridad válida (1-10)');
            return;
        }
        if (!this.puestoSeleccionado || !this.colaSeleccionadaDialog) return;

        const { idCola, idDetalle, prioridad } = this.formularioAsignarCola.getRawValue();
        const idPuesto = this.puestoSeleccionado['id'] as number;
        const idSucursalPuesto = this.puestoSeleccionado['idSucursal'] as number;

        /* Sin detalle específico → asignar todos los disponibles */
        const idsAAsignar: number[] = idDetalle != null
            ? [idDetalle]
            : this.opcionesDetallesCola.map(o => o.value as number);

        if (idsAAsignar.length === 0) {
            this.notificacion.advertencia('Sin detalles', 'No hay detalles disponibles para asignar en esta cola');
            return;
        }

        try {
            this.cargandoDialogCola = true;
            const usuario = this.authService.getUsuario()?.codigoUsuario ?? '';
            for (const idDet of idsAAsignar) {
                await this.detalleServicio.asignar({
                    idPuesto,
                    idSucursalPuesto,
                    idCola: idCola!,
                    idDetalle: idDet,
                    idSucursalCola: this.colaSeleccionadaDialog.idSucursal,
                    prioridad: prioridad!,
                    usuario
                });
            }

            const msg = idsAAsignar.length > 1
                ? `${idsAAsignar.length} detalles asignados al puesto correctamente`
                : 'Detalle asignado al puesto correctamente';
            this.notificacion.exito('Asignado', msg);
            this.cerrarDialogoCola();
            await this.cargarColasAsignadas(this.puestoSeleccionado);
        } catch (err) {
            this.notificacion.error('Error al asignar', extraerMensajeError(err));
        } finally {
            this.cargandoDialogCola = false;
        }
    }

    async desasignarCola(): Promise<void> {
        if (!this.colaAsignadaSeleccionada) return;

        const d = this.colaAsignadaSeleccionada;
        try {
            this.cargandoColas = true;
            await this.detalleServicio.desasignar(
                d['idPuesto'] as number,
                d['idSucursalPuesto'] as number,
                d['idCola'] as number,
                d['idDetalle'] as number,
                d['idSucursalCola'] as number
            );
            this.notificacion.exito('Desasignado', 'El detalle fue removido del puesto correctamente');
            this.colaAsignadaSeleccionada = null;
            await this.cargarColasAsignadas(this.puestoSeleccionado!);
        } catch (err) {
            this.notificacion.error('Error al desasignar', extraerMensajeError(err));
        } finally {
            this.cargandoColas = false;
        }
    }
}

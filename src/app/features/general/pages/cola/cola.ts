import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { PageLayoutComponent } from '@shared/components/page-layout/page-layout.component';
import { SectionComponent } from '@shared/components/section/section.component';
import { PageTitleComponent } from '@shared/components/page-title/page-title';
import { FormPanelComponent } from '@shared/components/form-panel/form-panel';
import { TableComponent, TableItem } from '@shared/components/table/table';
import { SearchPanelComponent } from '@shared/components/search-panel/search-panel';
import { ColaRequestDTO } from '@general/dto/cola.dto';
import { ColaServicio } from '@general/services/cola.servicio';
import { SucursalServicio } from '@general/services/sucursal.servicio';
import {
    CAMPOS_FORMULARIO, CAMPOS_BUSQUEDA, COLUMNAS_TABLA, COLUMNAS_TABLA_DETALLE, CAMPOS_FORMULARIO_DETALLE,
    crearFormularioCola, crearFormularioBusqueda, crearFormularioDetalle,
    VALIDADORES_CODIGO_COLA_NUEVO, VALIDADORES_CODIGO_COLA_EDITAR,
    VALIDADORES_CODIGO_DETALLE
} from './cola.config';
import { DetalleRequestDTO } from '@general/dto/detalle.dto';
import { NotificacionServicio } from '@shared/services/notificacion.servicio';
import { extraerMensajeError } from '@shared/utils/error.util';
import { AuthService } from '@auth/services/auth.service';

@Component({
    selector: 'app-cola',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        ButtonModule,
        InputTextModule,
        TooltipModule,
        DialogModule,
        ToastModule,
        PageLayoutComponent,
        SectionComponent,
        PageTitleComponent,
        FormPanelComponent,
        TableComponent,
        SearchPanelComponent
    ],
    templateUrl: './cola.html',
    styleUrl: './cola.scss'
})
export class ColaPage implements OnInit {

    /* ── Formulario detalle ── */
    formularioDetalle = crearFormularioDetalle();
    camposFormularioDetalle = CAMPOS_FORMULARIO_DETALLE;
    dialogoDetalleVisible = false;
    dialogoDetalleTitulo = 'Nuevo Detalle';
    cargandoDetalle = false;
    detalleSeleccionado: TableItem | null = null;

    /* ── Formulario de creación / edición ── */
    formularioCola = crearFormularioCola();
    camposFormulario = CAMPOS_FORMULARIO;

    /* ── Búsqueda ── */
    formularioBusqueda = crearFormularioBusqueda();
    camposBusqueda = CAMPOS_BUSQUEDA;

    /* ── Tabla colas ── */
    colas: TableItem[] = [];
    colaSeleccionada: TableItem | null = null;
    cargando = false;
    columnas = COLUMNAS_TABLA;

    /* ── Tabla detalles ── */
    columnasDetalle = COLUMNAS_TABLA_DETALLE;
    detalles: TableItem[] = [];
    cargandoDetalles = false;

    /* ── Dialog ── */
    dialogoVisible = false;
    dialogoTitulo = 'Nueva Cola';
    advertenciaBusqueda = '';

    constructor(
        private readonly colaServicio: ColaServicio,
        private readonly sucursalServicio: SucursalServicio,
        private readonly notificacion: NotificacionServicio,
        private readonly authService: AuthService
    ) { }

    ngOnInit(): void {
        this.cargarSucursales();
    }

    /** Nombre de la cola padre que se muestra en el diálogo de nuevo detalle */
    get nombreColaPadre(): string {
        if (!this.colaSeleccionada) return '';
        const nombre = this.colaSeleccionada['nombre'] as string;
        const sucursal = this.colaSeleccionada['nombreSucursal'] as string;
        return sucursal ? `${nombre}  —  ${sucursal}` : nombre;
    }

    /* ══════════════════════════════════════════
       Carga de sucursales
    ══════════════════════════════════════════ */
    private async cargarSucursales(): Promise<void> {
        try {
            let opciones = await this.sucursalServicio.obtenerOpciones();

            if (this.authService.idSucursalFija() !== null) {
                const idFija = this.authService.idSucursalFija()!;
                opciones = opciones.filter(o => o.value === idFija);

                this.formularioBusqueda.get('idSucursal')?.setValue(idFija);
                this.formularioBusqueda.get('idSucursal')?.disable();
            }

            const campoFormulario = this.camposFormulario.find(f => f.name === 'idSucursal');
            if (campoFormulario) campoFormulario.options = opciones;

            const campoBusqueda = this.camposBusqueda.find(f => f.name === 'idSucursal');
            if (campoBusqueda) campoBusqueda.options = opciones;

            if (this.authService.idSucursalFija() !== null) this.buscar();
        } catch (err) {
            this.notificacion.error('Error', 'No se pudieron cargar las sucursales');
        }
    }

    /* ══════════════════════════════════════════
       Dialog cola
    ══════════════════════════════════════════ */
    abrirNuevo(): void {
        this.colaSeleccionada = null;
        this.formularioCola.reset({ estado: 1 });
        if (this.authService.idSucursalFija() !== null) {
            this.formularioCola.get('idSucursal')?.setValue(this.authService.idSucursalFija());
            this.formularioCola.get('idSucursal')?.disable();
        } else {
            this.formularioCola.get('idSucursal')?.enable();
        }

        // Al crear, el código de la cola es una sola letra (el detalle antepone esta letra)
        const campoCodigo = this.camposFormulario.find(f => f.name === 'codigo');
        if (campoCodigo) {
            campoCodigo.mask = 'a';
            campoCodigo.placeholder = 'Ej: C';
        }
        const controlCodigo = this.formularioCola.get('codigo');
        controlCodigo?.setValidators(VALIDADORES_CODIGO_COLA_NUEVO);
        controlCodigo?.updateValueAndValidity();

        this.dialogoTitulo = 'Nueva Cola';
        this.dialogoVisible = true;
    }

    abrirEditar(): void {
        if (!this.colaSeleccionada) return;
        this.dialogoTitulo = 'Editar Cola';
        this.formularioCola.patchValue({
            idSucursal: this.colaSeleccionada['idSucursal'] as number,
            nombre: this.colaSeleccionada['nombre'] as string,
            codigo: this.colaSeleccionada['codigo'] as string,
            estado: this.colaSeleccionada['estado'] as number
        });
        this.formularioCola.get('idSucursal')?.disable();

        // En edición no se fuerza una sola letra: puede haber colas con códigos ya existentes más largos
        const campoCodigo = this.camposFormulario.find(f => f.name === 'codigo');
        if (campoCodigo) {
            campoCodigo.mask = undefined;
            campoCodigo.placeholder = 'Ej: CG';
        }
        const controlCodigo = this.formularioCola.get('codigo');
        controlCodigo?.setValidators(VALIDADORES_CODIGO_COLA_EDITAR);
        controlCodigo?.updateValueAndValidity();

        this.dialogoVisible = true;
    }

    cerrarDialogo(): void {
        this.dialogoVisible = false;
        this.formularioCola.reset({ estado: 1 });
    }

    /* ══════════════════════════════════════════
       Dialog detalle
    ══════════════════════════════════════════ */
    abrirNuevoDetalle(): void {
        if (!this.colaSeleccionada) return;
        this.detalleSeleccionado = null;
        this.dialogoDetalleTitulo = 'Nuevo Detalle';
        this.formularioDetalle.reset({ estado: 1 });

        // La letra de la cola queda fija en el input (parte de la máscara); solo se edita la propia.
        const letraCola = ((this.colaSeleccionada['codigo'] as string) ?? '').toUpperCase();
        const campoCodigo = this.camposFormularioDetalle.find(f => f.name === 'codigo');
        if (campoCodigo) {
            campoCodigo.mask = `${letraCola}a`;
            campoCodigo.label = `Código (empieza con "${letraCola}")`;
            campoCodigo.placeholder = `${letraCola}_`;
        }
        this.formularioDetalle.patchValue({ codigo: letraCola });
        const controlCodigo = this.formularioDetalle.get('codigo');
        controlCodigo?.setValidators(VALIDADORES_CODIGO_DETALLE);
        controlCodigo?.updateValueAndValidity();

        this.dialogoDetalleVisible = true;
    }

    abrirEditarDetalle(): void {
        if (!this.detalleSeleccionado) return;
        this.dialogoDetalleTitulo = 'Editar Detalle';
        this.formularioDetalle.patchValue({
            nombre: this.detalleSeleccionado['nombre'],
            codigo: this.detalleSeleccionado['codigo'],
            estado: this.detalleSeleccionado['estado']
        });

        // Misma regla al editar: la letra de la cola queda fija, solo se puede cambiar la propia.
        const letraCola = ((this.colaSeleccionada?.['codigo'] as string) ?? '').toUpperCase();
        const campoCodigo = this.camposFormularioDetalle.find(f => f.name === 'codigo');
        if (campoCodigo) {
            campoCodigo.mask = `${letraCola}a`;
            campoCodigo.label = `Código (empieza con "${letraCola}")`;
            campoCodigo.placeholder = `${letraCola}_`;
        }
        const controlCodigo = this.formularioDetalle.get('codigo');
        controlCodigo?.setValidators(VALIDADORES_CODIGO_DETALLE);
        controlCodigo?.updateValueAndValidity();

        this.dialogoDetalleVisible = true;
    }

    cerrarDialogoDetalle(): void {
        this.dialogoDetalleVisible = false;
        this.detalleSeleccionado = null;
        this.formularioDetalle.reset({ estado: 1 });
    }

    /* ══════════════════════════════════════════
       CRUD — Cola
    ══════════════════════════════════════════ */
    async guardar(): Promise<void> {
        if (this.formularioCola.invalid) {
            this.formularioCola.markAllAsTouched();
            this.notificacion.advertencia('Formulario incompleto', 'Revisa los campos obligatorios');
            return;
        }

        const datos = this.formularioCola.getRawValue();
        const dto: ColaRequestDTO = {
            idSucursal: Number(datos.idSucursal),
            nombre: datos.nombre ?? '',
            codigo: datos.codigo ?? '',
            estado: Number(datos.estado),
            usuario: this.authService.getUsuario()?.codigoUsuario ?? ''
        };

        try {
            this.cargando = true;
            const idExistente = this.colaSeleccionada
                ? this.colaSeleccionada['id'] as number
                : undefined;

            await this.colaServicio.guardar(dto, idExistente);

            this.notificacion.exito(
                idExistente ? 'Cola modificada' : 'Cola creada',
                idExistente
                    ? `La cola "${dto.nombre}" fue actualizada correctamente`
                    : `La cola "${dto.nombre}" fue creada correctamente`
            );

            this.cerrarDialogo();
            await this.buscar();
        } catch (err) {
            this.notificacion.error('Error al guardar cola', extraerMensajeError(err));
        } finally {
            this.cargando = false;
        }
    }

    /* ══════════════════════════════════════════
       CRUD — Detalle
    ══════════════════════════════════════════ */
    async guardarDetalle(): Promise<void> {
        if (this.formularioDetalle.invalid) {
            this.formularioDetalle.markAllAsTouched();
            this.notificacion.advertencia('Formulario incompleto', 'Revisa los campos obligatorios del detalle');
            return;
        }

        const esEdicion = this.detalleSeleccionado != null;
        const datos = this.formularioDetalle.getRawValue();
        // El input muestra la letra de la cola + la propia. Al crear, el backend antepone
        // la letra de la cola él mismo, así que solo se envía la propia; al editar, el
        // backend no recompone el código, así que se envía completo tal cual está en el input.
        const codigo = esEdicion ? (datos.codigo ?? '') : (datos.codigo ?? '').slice(1);
        const dto: DetalleRequestDTO = {
            nombre: datos.nombre ?? '',
            codigo,
            estado: Number(datos.estado),
            usuario: this.authService.getUsuario()?.codigoUsuario ?? ''
        };

        const idCola     = this.colaSeleccionada!['id'] as number;
        const idSucursal = this.colaSeleccionada!['idSucursal'] as number;

        try {
            this.cargandoDetalle = true;

            const colaActualizada = esEdicion
                ? await this.colaServicio.editarDetalle(idCola, idSucursal, this.detalleSeleccionado!['idDetalle'] as number, dto)
                : await this.colaServicio.guardarDetalle(idCola, idSucursal, dto);

            this.notificacion.exito(
                esEdicion ? 'Detalle modificado' : 'Detalle creado',
                `El detalle "${dto.nombre}" fue ${esEdicion ? 'actualizado' : 'creado'} correctamente`
            );
            this.cerrarDialogoDetalle();

            this.detalles = (colaActualizada.detalles ?? []).map(d => ({
                idDetalle: d.idDetalle,
                nombre: d.nombre,
                codigo: d.codigo,
                estado: d.estado
            }));
        } catch (err) {
            this.notificacion.error('Error al guardar detalle', extraerMensajeError(err));
        } finally {
            this.cargandoDetalle = false;
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
        this.colaSeleccionada = null;
        this.detalles = [];

        try {
            this.cargando = true;
            const resultado = await this.colaServicio.buscar({
                nombre: tieneNombre ? filtro.nombre!.trim() : undefined,
                idSucursal: tieneSucursal ? Number(filtro.idSucursal) : undefined
            });

            this.colas = resultado.map(cola => ({
                _uid: `${cola.id}_${cola.idSucursal}`,
                id: cola.id,
                codigo: cola.codigo,
                nombre: cola.nombre,
                estado: cola.estado,
                idSucursal: cola.idSucursal,
                nombreSucursal: cola.nombreSucursal
            }));

            if (this.colas.length === 0) {
                this.notificacion.advertencia('Sin resultados', 'No se encontraron colas con los filtros ingresados');
            }

        } catch (err) {
            this.notificacion.error('Error al buscar', extraerMensajeError(err));
            this.colas = [];
        } finally {
            this.cargando = false;
        }
    }

    limpiarBusqueda(): void {
        this.formularioBusqueda.reset();
        if (this.authService.idSucursalFija() !== null) {
            const idFija = this.authService.idSucursalFija()!;
            this.formularioBusqueda.get('idSucursal')?.setValue(idFija);
            this.formularioBusqueda.get('idSucursal')?.disable();
        }
        this.advertenciaBusqueda = '';
        this.colas = [];
        this.colaSeleccionada = null;
        this.detalles = [];
    }

    /* ══════════════════════════════════════════
       Selección — llama al back para traer detalles
    ══════════════════════════════════════════ */
    async seleccionarCola(item: TableItem): Promise<void> {
        this.colaSeleccionada = item;
        this.detalles = [];
        this.detalleSeleccionado = null;
        this.cargandoDetalles = true;

        try {
            const colaConDetalles = await this.colaServicio.obtenerConDetalles(
                item['id'] as number,
                item['idSucursal'] as number
            );

            this.detalles = (colaConDetalles.detalles ?? []).map(d => ({
                idDetalle: d.idDetalle,
                nombre: d.nombre,
                codigo: d.codigo,
                estado: d.estado
            }));
        } catch (err) {
            this.notificacion.error('Error', 'No se pudieron cargar los detalles de la cola');
        } finally {
            this.cargandoDetalles = false;
        }
    }
}
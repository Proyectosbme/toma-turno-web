import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { PageLayoutComponent } from '@shared/components/page-layout/page-layout.component';
import { SectionComponent } from '@shared/components/section/section.component';
import { PageTitleComponent } from '@shared/components/page-title/page-title';
import { FormPanelComponent } from '@shared/components/form-panel/form-panel';
import { TableComponent, TableItem } from '@shared/components/table/table';
import { SearchPanelComponent } from '@shared/components/search-panel/search-panel';
import { ConfiguracionRequestDTO } from '@general/dto/configuracion.dto';
import { ConfiguracionServicio } from '@general/services/configuracion.servicio';
import { SucursalServicio } from '@general/services/sucursal.servicio';
import {
    CAMPOS_FORMULARIO, CAMPOS_BUSQUEDA, COLUMNAS_TABLA,
    crearFormularioConfiguracion, crearFormularioBusqueda
} from './configuracion.config';
import { NotificacionServicio } from '@shared/services/notificacion.servicio';
import { extraerMensajeError } from '@shared/utils/error.util';

@Component({
    selector: 'app-configuracion',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        ButtonModule,
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
    templateUrl: './configuracion.html',
    styleUrl: './configuracion.scss'
})
export class ConfiguracionPage implements OnInit {

    /* ── Formulario crear / editar ── */
    formularioConfig = crearFormularioConfiguracion();
    camposFormulario = CAMPOS_FORMULARIO.map(c => ({ ...c }));

    /* ── Búsqueda ── */
    formularioBusqueda = crearFormularioBusqueda();
    camposBusqueda = CAMPOS_BUSQUEDA;

    /* ── Tabla ── */
    configuraciones: TableItem[] = [];
    configSeleccionada: TableItem | null = null;
    cargando = false;
    columnas = COLUMNAS_TABLA;

    /* ── Dialog ── */
    dialogoVisible = false;
    dialogoTitulo = 'Nueva Configuración';
    esEdicion = false;
    advertenciaBusqueda = '';

    constructor(
        private readonly configServicio: ConfiguracionServicio,
        private readonly sucursalServicio: SucursalServicio,
        private readonly notificacion: NotificacionServicio
    ) { }

    ngOnInit(): void {
        this.cargarSucursales();
    }

    /* ══════════════════════════════════════════
       Carga de sucursales
    ══════════════════════════════════════════ */
    private async cargarSucursales(): Promise<void> {
        try {
            const opciones = await this.sucursalServicio.obtenerOpciones();

            const campoForm = this.camposFormulario.find(f => f.name === 'idSucursal');
            if (campoForm) campoForm.options = opciones;

            const campoBusqueda = this.camposBusqueda.find(f => f.name === 'idSucursal');
            if (campoBusqueda) campoBusqueda.options = opciones;
        } catch {
            this.notificacion.error('Error', 'No se pudieron cargar las sucursales');
        }
    }

    /* ══════════════════════════════════════════
       Dialog
    ══════════════════════════════════════════ */
    abrirNuevo(): void {
        this.esEdicion = false;
        this.configSeleccionada = null;
        this.formularioConfig = crearFormularioConfiguracion(false);
        this.camposFormulario = CAMPOS_FORMULARIO.map(c => ({ ...c }));
        this.cargarSucursales();
        this.formularioConfig.get('idSucursal')?.enable();
        this.dialogoTitulo = 'Nueva Configuración';
        this.dialogoVisible = true;
    }

    abrirEditar(): void {
        if (!this.configSeleccionada) return;
        this.esEdicion = true;
        this.formularioConfig = crearFormularioConfiguracion(true);
        this.camposFormulario = CAMPOS_FORMULARIO.map(c => ({ ...c }));
        this.cargarSucursales();

        this.formularioConfig.patchValue({
            idSucursal: this.configSeleccionada['idSucursal'] as number,
            nombre: this.configSeleccionada['nombre'] as string,
            parametro: this.configSeleccionada['parametro'] as number,
            valorTexto: this.configSeleccionada['valorTexto'] as string,
            descripcion: this.configSeleccionada['descripcion'] as string,
            estado: this.configSeleccionada['estado'] as number
        });

        this.formularioConfig.get('idSucursal')?.disable();
        this.dialogoTitulo = 'Editar Configuración';
        this.dialogoVisible = true;
    }

    cerrarDialogo(): void {
        this.dialogoVisible = false;
        this.formularioConfig.reset({ estado: 1 });
    }

    /* ══════════════════════════════════════════
       Guardar
    ══════════════════════════════════════════ */
    async guardar(): Promise<void> {
        if (this.formularioConfig.invalid) {
            this.formularioConfig.markAllAsTouched();
            this.notificacion.advertencia('Formulario incompleto', 'Revisa los campos obligatorios');
            return;
        }

        const datos = this.formularioConfig.getRawValue();
        const dto: ConfiguracionRequestDTO = {
            idSucursal: Number(datos.idSucursal),
            nombre: datos.nombre ?? '',
            parametro: datos.parametro != null ? Number(datos.parametro) : null,
            valorTexto: datos.valorTexto ?? '',
            descripcion: datos.descripcion ?? '',
            estado: Number(datos.estado)
        };

        try {
            this.cargando = true;
            const idExistente = this.esEdicion && this.configSeleccionada
                ? this.configSeleccionada['idConfiguracion'] as number
                : undefined;

            await this.configServicio.guardar(dto, idExistente);

            this.notificacion.exito(
                this.esEdicion ? 'Configuración modificada' : 'Configuración creada',
                `La configuración "${dto.nombre}" fue ${this.esEdicion ? 'actualizada' : 'creada'} correctamente`
            );

            this.cerrarDialogo();
            await this.buscar();
        } catch (err) {
            this.notificacion.error('Error al guardar', extraerMensajeError(err));
        } finally {
            this.cargando = false;
        }
    }

    /* ══════════════════════════════════════════
       Búsqueda
    ══════════════════════════════════════════ */
    async buscar(): Promise<void> {
        const filtro = this.formularioBusqueda.getRawValue();
        const tieneSucursal = filtro.idSucursal != null && filtro.idSucursal !== '';

        if (!tieneSucursal) {
            this.advertenciaBusqueda = 'Debe seleccionar una sucursal';
            return;
        }

        this.advertenciaBusqueda = '';
        this.configSeleccionada = null;

        try {
            this.cargando = true;
            const resultado = await this.configServicio.buscarPorSucursal(Number(filtro.idSucursal));

            this.configuraciones = resultado.map(c => ({
                _uid: `${c.idConfiguracion}_${c.idSucursal}`,
                idConfiguracion: c.idConfiguracion,
                idSucursal: c.idSucursal,
                nombreSucursal: c.nombreSucursal,
                nombre: c.nombre,
                parametro: c.parametro,
                valorTexto: c.valorTexto,
                descripcion: c.descripcion,
                estado: c.estado
            }));

            if (this.configuraciones.length === 0) {
                this.notificacion.advertencia('Sin resultados', 'No hay configuraciones registradas para esta sucursal');
            }
        } catch (err) {
            this.notificacion.error('Error al buscar', extraerMensajeError(err));
            this.configuraciones = [];
        } finally {
            this.cargando = false;
        }
    }

    limpiarBusqueda(): void {
        this.formularioBusqueda.reset();
        this.advertenciaBusqueda = '';
        this.configuraciones = [];
        this.configSeleccionada = null;
    }

    /* ══════════════════════════════════════════
       Selección
    ══════════════════════════════════════════ */
    seleccionarConfig(item: TableItem): void {
        this.configSeleccionada = item;
    }
}

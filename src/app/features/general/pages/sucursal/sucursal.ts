import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { PageLayoutComponent } from '@shared/components/page-layout/page-layout.component';
import { PageTitleComponent } from '@shared/components/page-title/page-title';
import { COLUMNAS_TABLA as TABLASUCURSAL, CAMPOS_FORMULARIO, crearFormularioSucursal, crearFormularioBusqueda, CAMPOS_BUSQUEDA } from './sucursal.config';
import { SectionComponent } from '@shared/components/section/section.component';
import { TableComponent, TableItem } from '@shared/components/table/table';
import { SearchPanelComponent } from '@shared/components/search-panel/search-panel';
import { SucursalServicio } from '@general/services/sucursal.servicio';
import { FormPanelComponent } from '@shared/components/form-panel/form-panel';
import { SucursalRequestDTO, ReplicarResponseDTO } from '@general/dto/sucursal.dto';
import { NotificacionServicio } from '@shared/services/notificacion.servicio';
import { extraerMensajeError } from '@shared/utils/error.util';
import { ColaApiClient } from '@general/api/cola-api.client';

@Component({
    selector: 'app-sucursal',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        FormsModule,
        ButtonModule,
        InputTextModule,
        DialogModule,
        TooltipModule,
        ToastModule,
        PageLayoutComponent,
        PageTitleComponent,
        SectionComponent,
        TableComponent,
        SearchPanelComponent,
        FormPanelComponent
    ],
    templateUrl: './sucursal.html',
    styleUrl: './sucursal.scss',
})
export class Sucursal implements OnInit {

    esEdicion = false;

    // ════════════════════════════════════════
    // CICLO DE VIDA
    // ════════════════════════════════════════
    constructor(
        private readonly sucursalServicio: SucursalServicio,
        private readonly notificacion: NotificacionServicio,
        private readonly colaApi: ColaApiClient
    ) { }

    ngOnInit(): void {
        this.cargarTodas();
    }

    // ════════════════════════════════════════
    // FORMULARIOS
    // ════════════════════════════════════════
    formularioSucursal = crearFormularioSucursal();
    camposFormulario = CAMPOS_FORMULARIO;
    formularioBusqueda = crearFormularioBusqueda();
    camposBusqueda = CAMPOS_BUSQUEDA;

    // ════════════════════════════════════════
    // TABLA
    // ════════════════════════════════════════
    sucursales: TableItem[] = [];
    sucursalSeleccionada: TableItem | null = null;
    columnasTablaSucursal = TABLASUCURSAL;
    cargando = false;

    // ════════════════════════════════════════
    // BÚSQUEDA
    // ════════════════════════════════════════
    async cargarTodas(): Promise<void> {
        this.cargando = true;
        try {
            const resultados = await this.sucursalServicio.listarTodas();
            this.sucursales = this.mapearSucursales(resultados);
        } catch (err) {
            this.notificacion.error('Error al cargar sucursales', extraerMensajeError(err));
            this.sucursales = [];
        } finally {
            this.cargando = false;
        }
    }

    async buscar(): Promise<void> {
        const nombre = this.formularioBusqueda.get('nombre')?.value?.trim() || undefined;

        if (!nombre) {
            this.notificacion.advertencia('Campo requerido', 'Ingrese un nombre para buscar');
            return;
        }

        this.cargando = true;
        try {
            const resultados = await this.sucursalServicio.buscar({ nombre });
            this.sucursales = this.mapearSucursales(resultados);

            if (this.sucursales.length === 0) {
                this.notificacion.advertencia('Sin resultados', 'No se encontraron sucursales con ese nombre');
            }
        } catch (err) {
            this.notificacion.error('Error al buscar', extraerMensajeError(err));
            this.sucursales = [];
        } finally {
            this.cargando = false;
        }
    }

    limpiarBusqueda(): void {
        this.formularioBusqueda.reset();
        this.sucursalSeleccionada = null;
        this.cargarTodas();
    }

    private mapearSucursales(resultados: any[]): TableItem[] {
        return resultados.map(s => ({
            codigo: s.codigo,
            nombre: s.nombre,
            correo: s.correo,
            telefono: s.telefono,
            direccion: s.direccion,
            estado: s.estado
        }));
    }

    // ════════════════════════════════════════
    // SELECCIÓN
    // ════════════════════════════════════════
    seleccionarSucursal(item: TableItem): void {
        this.sucursalSeleccionada = item;
    }

    // ════════════════════════════════════════
    // DIÁLOGOS - Crear / Editar
    // ════════════════════════════════════════
    dialogoVisible = false;
    dialogoTitulo = 'Nueva Sucursal';

    abrirNuevo(): void {
        this.sucursalSeleccionada = null;
        this.formularioSucursal.reset({ estado: 1 });
        this.dialogoTitulo = 'Nueva Sucursal';
        this.esEdicion = false;
        this.dialogoVisible = true;
    }

    abrirEditar(): void {
        if (!this.sucursalSeleccionada) return;
        this.dialogoTitulo = 'Editar Sucursal';
        this.formularioSucursal.patchValue({
            nombre: this.sucursalSeleccionada['nombre'] as string,
            correo: this.sucursalSeleccionada['correo'] as string,
            telefono: this.sucursalSeleccionada['telefono'] as string,
            direccion: this.sucursalSeleccionada['direccion'] as string,
            estado: this.sucursalSeleccionada['estado'] as number
        });
        this.esEdicion = true;
        this.dialogoVisible = true;
    }

    cerrarDialogo(): void {
        this.dialogoVisible = false;
        this.formularioSucursal.reset({ estado: 1 });
    }

    // ════════════════════════════════════════
    // GUARDAR
    // ════════════════════════════════════════
    async guardar(): Promise<void> {
        if (this.formularioSucursal.invalid) {
            this.formularioSucursal.markAllAsTouched();
            this.notificacion.advertencia('Formulario incompleto', 'Revisa los campos obligatorios');
            return;
        }

        const datos = this.formularioSucursal.getRawValue();
        const dto: SucursalRequestDTO = {
            nombre: datos.nombre ?? '',
            telefono: datos.telefono ?? '',
            correo: datos.correo ?? '',
            direccion: datos.direccion ?? '',
            estado: Number(datos.estado)
        };

        try {
            this.cargando = true;
            const idExistente = this.sucursalSeleccionada
                ? this.sucursalSeleccionada['codigo'] as number
                : undefined;

            await this.sucursalServicio.guardar(dto, idExistente);

            this.notificacion.exito(
                this.esEdicion ? 'Sucursal modificada' : 'Sucursal creada',
                this.esEdicion
                    ? `La sucursal "${dto.nombre}" fue actualizada correctamente`
                    : `La sucursal "${dto.nombre}" fue creada correctamente`
            );

            this.cerrarDialogo();
            this.formularioBusqueda.reset();
            await this.cargarTodas();
        } catch (err) {
            this.notificacion.error('Error al guardar sucursal', extraerMensajeError(err));
        } finally {
            this.cargando = false;
        }
    }

    // ════════════════════════════════════════
    // DIÁLOGO - Replicar Colas
    // ════════════════════════════════════════
    dialogoReplicarVisible = false;
    replicarIdOrigen: number | null = null;
    replicarIdDestino: number | null = null;
    replicarCargando = false;
    replicarResultado: ReplicarResponseDTO | null = null;

    get opcionesSucursales() {
        return this.sucursales.map(s => ({
            label: s['nombre'] as string,
            value: s['codigo'] as number
        }));
    }

    abrirReplicar(): void {
        this.replicarIdOrigen = this.sucursalSeleccionada
            ? this.sucursalSeleccionada['codigo'] as number
            : null;
        this.replicarIdDestino = null;
        this.replicarResultado = null;
        this.dialogoReplicarVisible = true;
    }

    cerrarReplicar(): void {
        this.dialogoReplicarVisible = false;
        this.replicarResultado = null;
        this.replicarIdOrigen = null;
        this.replicarIdDestino = null;
    }

    async ejecutarReplicar(): Promise<void> {
        if (!this.replicarIdOrigen || !this.replicarIdDestino) {
            this.notificacion.advertencia('Campos requeridos', 'Selecciona la sucursal origen y destino');
            return;
        }
        if (this.replicarIdOrigen === this.replicarIdDestino) {
            this.notificacion.advertencia('Selección inválida', 'La sucursal origen y destino no pueden ser la misma');
            return;
        }

        this.replicarCargando = true;
        try {
            this.replicarResultado = await this.colaApi.replicar(
                this.replicarIdOrigen,
                this.replicarIdDestino
            );
            this.notificacion.exito(
                'Replicación completada',
                `Se copiaron ${this.replicarResultado.totalCopiadas} cola(s) correctamente`
            );
        } catch (err) {
            this.notificacion.error('Error al replicar', extraerMensajeError(err));
        } finally {
            this.replicarCargando = false;
        }
    }

    get nombreOrigen(): string {
        return this.sucursales.find(s => s['codigo'] === this.replicarIdOrigen)?.['nombre'] as string ?? '';
    }

    get nombreDestino(): string {
        return this.sucursales.find(s => s['codigo'] === this.replicarIdDestino)?.['nombre'] as string ?? '';
    }
}
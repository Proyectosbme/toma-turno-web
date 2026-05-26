import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { InputTextModule } from 'primeng/inputtext';
import { BrandingService } from '@core/layout/service/branding.service';
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
import { AuthService } from '@auth/services/auth.service';

@Component({
    selector: 'app-configuracion',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        ButtonModule,
        TooltipModule,
        DialogModule,
        ToastModule,
        InputTextModule,
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

    readonly branding = inject(BrandingService);

    get esAdminGlobal(): boolean {
        return this.authService.getPerfil() === 'ADMIN';
    }

    /* ── Apariencia ── */
    nombreInput = '';
    guardandoNombre  = false;
    guardandoLogo    = false;
    guardandoBanner  = false;

    ngOnInit(): void {
        this.cargarSucursales();
        this.nombreInput = this.branding.nombreEmpresa();
    }

    async guardarNombre(): Promise<void> {
        if (!this.nombreInput.trim()) return;
        try {
            this.guardandoNombre = true;
            await this.branding.setNombre(this.nombreInput);
            this.notificacion.exito('Nombre actualizado', `Empresa: "${this.branding.nombreEmpresa()}"`);
        } catch {
            this.notificacion.error('Error', 'No se pudo actualizar el nombre');
        } finally {
            this.guardandoNombre = false;
        }
    }

    async onLogoSeleccionado(event: Event): Promise<void> {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;
        try {
            this.guardandoLogo = true;
            await this.branding.setLogo(file);
            this.notificacion.exito('Logo actualizado', 'El nuevo logo se guardó correctamente');
        } catch {
            this.notificacion.error('Error', 'No se pudo actualizar el logo');
        } finally {
            this.guardandoLogo = false;
            input.value = '';
        }
    }

    async onBannerSeleccionado(event: Event): Promise<void> {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;
        try {
            this.guardandoBanner = true;
            await this.branding.setBanner(file);
            this.notificacion.exito('Banner actualizado', 'El nuevo banner se guardó correctamente');
        } catch {
            this.notificacion.error('Error', 'No se pudo actualizar el banner');
        } finally {
            this.guardandoBanner = false;
            input.value = '';
        }
    }

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
    advertenciaBusqueda = '';

    constructor(
        private readonly configServicio: ConfiguracionServicio,
        private readonly sucursalServicio: SucursalServicio,
        private readonly notificacion: NotificacionServicio,
        private readonly authService: AuthService
    ) { }

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

            const campoForm = this.camposFormulario.find(f => f.name === 'idSucursal');
            if (campoForm) campoForm.options = opciones;

            const campoBusqueda = this.camposBusqueda.find(f => f.name === 'idSucursal');
            if (campoBusqueda) campoBusqueda.options = opciones;

            if (this.authService.idSucursalFija() !== null) this.buscar();
        } catch {
            this.notificacion.error('Error', 'No se pudieron cargar las sucursales');
        }
    }

    /* ══════════════════════════════════════════
       Dialog
    ══════════════════════════════════════════ */
    abrirEditar(): void {
        if (!this.configSeleccionada) return;
        this.formularioConfig = crearFormularioConfiguracion(true);
        this.camposFormulario = CAMPOS_FORMULARIO.map(c => ({ ...c }));
        this.cargarSucursales();

        this.formularioConfig.patchValue({
            idSucursal: this.configSeleccionada['idSucursal'] as number,
            nombre: this.configSeleccionada['nombre'] as string,
            parametro: this.configSeleccionada['parametro'] as number,
            descripcion: this.configSeleccionada['descripcion'] as string,
            estado: this.configSeleccionada['estado'] as number
        });

        this.formularioConfig.get('idSucursal')?.disable();
        this.formularioConfig.get('nombre')?.disable();
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
            descripcion: datos.descripcion ?? '',
            estado: Number(datos.estado),
            usuario: this.authService.getUsuario()?.codigoUsuario ?? ''
        };

        try {
            this.cargando = true;
            const idExistente = this.configSeleccionada
                ? this.configSeleccionada['idConfiguracion'] as number
                : undefined;

            await this.configServicio.guardar(dto, idExistente);

            this.notificacion.exito(
                'Configuración modificada',
                `La configuración "${dto.nombre}" fue actualizada correctamente`
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
        if (this.authService.idSucursalFija() !== null) {
            const idFija = this.authService.idSucursalFija()!;
            this.formularioBusqueda.get('idSucursal')?.setValue(idFija);
            this.formularioBusqueda.get('idSucursal')?.disable();
        }
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

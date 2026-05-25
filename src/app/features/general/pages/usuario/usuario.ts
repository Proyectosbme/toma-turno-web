import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, Validators } from '@angular/forms';
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
import { UsuarioRequestDTO } from '@general/dto/usuario.dto';
import { UsuarioServicio } from '@general/services/usuario.servicio';
import { SucursalServicio } from '@general/services/sucursal.servicio';
import { PuestoServicio } from '@general/services/puesto.servicio';
import {
    CAMPOS_FORMULARIO_CREAR, CAMPOS_FORMULARIO_EDITAR,
    CAMPOS_BUSQUEDA, COLUMNAS_TABLA,
    crearFormularioUsuario, crearFormularioBusqueda
} from './usuario.config';
import { NotificacionServicio } from '@shared/services/notificacion.servicio';
import { extraerMensajeError } from '@shared/utils/error.util';
import { FormFieldConfig } from '@shared/components/form-panel/form-panel';
import { AuthService } from '@auth/services/auth.service';

@Component({
    selector: 'app-usuario',
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
    templateUrl: './usuario.html',
    styleUrl: './usuario.scss'
})
export class UsuarioPage implements OnInit {

    /* ── Formulario crear / editar ── */
    formularioUsuario = crearFormularioUsuario();
    camposFormulario: FormFieldConfig[] = CAMPOS_FORMULARIO_CREAR.map(c => ({ ...c }));
    esEdicion = false;

    /* ── Búsqueda ── */
    formularioBusqueda = crearFormularioBusqueda();
    camposBusqueda = CAMPOS_BUSQUEDA;

    /* ── Tabla ── */
    usuarios: TableItem[] = [];
    usuarioSeleccionado: TableItem | null = null;
    cargando = false;
    columnas = COLUMNAS_TABLA;

    /* ── Dialog ── */
    dialogoVisible = false;
    dialogoTitulo = 'Nuevo Usuario';
    advertenciaBusqueda = '';

    constructor(
        private readonly usuarioServicio: UsuarioServicio,
        private readonly sucursalServicio: SucursalServicio,
        private readonly puestoServicio: PuestoServicio,
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

            const campoFormSucursal = this.camposFormulario.find(f => f.name === 'idSucursal');
            if (campoFormSucursal) campoFormSucursal.options = opciones;

            const campoBusquedaSucursal = this.camposBusqueda.find(f => f.name === 'idSucursal');
            if (campoBusquedaSucursal) campoBusquedaSucursal.options = opciones;

            if (this.authService.esSubAdmin()) this.buscar();
        } catch {
            this.notificacion.error('Error', 'No se pudieron cargar las sucursales');
        }
    }

    private async cargarPuestos(idSucursal: number): Promise<void> {
        try {
            const opciones = await this.puestoServicio.obtenerOpciones(idSucursal);
            const campoFormPuesto = this.camposFormulario.find(f => f.name === 'idPuesto');
            if (campoFormPuesto) campoFormPuesto.options = opciones;
        } catch {
            this.notificacion.error('Error', 'No se pudieron cargar los puestos');
        }
    }

    private configurarValidacionPerfil(): void {
        const aplicar = (perfil: string | null) => {
            const ctrl = this.formularioUsuario.get('correlativo');
            if (!ctrl) return;
            if (perfil === 'OPERADOR') {
                ctrl.setValidators([Validators.required]);
            } else {
                ctrl.clearValidators();
            }
            ctrl.updateValueAndValidity({ emitEvent: false });
        };
        aplicar(this.formularioUsuario.get('perfil')?.value);
        this.formularioUsuario.get('perfil')?.valueChanges.subscribe(aplicar);
    }

    /* ══════════════════════════════════════════
       Dialog
    ══════════════════════════════════════════ */
    abrirNuevo(): void {
        this.esEdicion = false;
        this.usuarioSeleccionado = null;
        this.formularioUsuario = crearFormularioUsuario(false);
        this.camposFormulario = CAMPOS_FORMULARIO_CREAR.map(c => ({ ...c }));
        this.cargarSucursales();
        if (this.authService.esSubAdmin()) {
            this.formularioUsuario.get('idSucursal')?.setValue(this.authService.idSucursalFija());
            this.formularioUsuario.get('idSucursal')?.disable();
            this.cargarPuestos(this.authService.idSucursalFija()!);
        } else {
            this.formularioUsuario.get('idSucursal')?.enable();
        }

        // Escuchar cambios de sucursal para cargar puestos
        this.formularioUsuario.get('idSucursal')?.valueChanges.subscribe(idSucursal => {
            this.formularioUsuario.get('idPuesto')?.setValue(null);
            const campoFormPuesto = this.camposFormulario.find(f => f.name === 'idPuesto');
            if (campoFormPuesto) campoFormPuesto.options = [];
            if (idSucursal) this.cargarPuestos(Number(idSucursal));
        });

        this.configurarValidacionPerfil();
        this.dialogoTitulo = 'Nuevo Usuario';
        this.dialogoVisible = true;
    }

    async abrirEditar(): Promise<void> {
        if (!this.usuarioSeleccionado) return;

        // Guardar referencia local antes de cualquier llamada async, ya que
        // cargarSucursales() llama a buscar() que resetea usuarioSeleccionado a null
        const usuario = this.usuarioSeleccionado;

        this.esEdicion = true;
        this.formularioUsuario = crearFormularioUsuario(true);
        this.camposFormulario = CAMPOS_FORMULARIO_EDITAR.map(c => ({ ...c }));
        await this.cargarSucursales();

        const idSucursal = usuario['idSucursal'] as number;
        await this.cargarPuestos(idSucursal);

        this.formularioUsuario.patchValue({
            idSucursal,
            idPuesto: usuario['idPuesto'] as number,
            correlativo: usuario['correlativo'] as number,
            codigoUsuario: usuario['codigoUsuario'] as string,
            nombres: usuario['nombres'] as string,
            apellidos: usuario['apellidos'] as string,
            dui: usuario['dui'] as string,
            telefono: usuario['telefono'] as string,
            ip: usuario['ip'] as string,
            estado: usuario['estado'] as number,
            perfil: usuario['perfil'] as string ?? '',
            atenderCasosEspeciales: usuario['atenderCasosEspeciales'] as number ?? 0
        });

        // Restaurar la referencia para que guardar() pueda obtener el id
        this.usuarioSeleccionado = usuario;

        // Escuchar cambios de sucursal también en edición (si se habilitara)
        this.formularioUsuario.get('idSucursal')?.valueChanges.subscribe(id => {
            this.formularioUsuario.get('idPuesto')?.setValue(null);
            const campoFormPuesto = this.camposFormulario.find(f => f.name === 'idPuesto');
            if (campoFormPuesto) campoFormPuesto.options = [];
            if (id) this.cargarPuestos(Number(id));
        });

        this.configurarValidacionPerfil();
        this.formularioUsuario.get('idSucursal')?.disable({ emitEvent: false });
        this.formularioUsuario.get('codigoUsuario')?.disable({ emitEvent: false });
        this.dialogoTitulo = 'Editar Usuario';
        this.dialogoVisible = true;
    }

    cerrarDialogo(): void {
        this.dialogoVisible = false;
        this.formularioUsuario.reset({ estado: 1 });
    }

    /* ══════════════════════════════════════════
       Guardar
    ══════════════════════════════════════════ */
    async guardar(): Promise<void> {
        if (this.formularioUsuario.invalid) {
            this.formularioUsuario.markAllAsTouched();
            this.notificacion.advertencia('Formulario incompleto', 'Revisa los campos obligatorios');
            return;
        }

        const datos = this.formularioUsuario.getRawValue();
        const dto: UsuarioRequestDTO = {
            idSucursal: Number(datos.idSucursal),
            idPuesto: datos.idPuesto != null ? Number(datos.idPuesto) : null,
            correlativo: datos.correlativo != null && datos.correlativo !== '' ? Number(datos.correlativo) : null,
            nombres: datos.nombres ?? '',
            apellidos: datos.apellidos ?? '',
            dui: datos.dui ?? '',
            estado: Number(datos.estado),
            telefono: datos.telefono ?? '',
            ip: datos.ip ?? '',
            perfil: datos.perfil ?? '',
            atenderCasosEspeciales: datos.atenderCasosEspeciales != null ? Number(datos.atenderCasosEspeciales) : null,
            perfilCreador: this.authService.getPerfil() ?? '',
            correo: datos.correo || undefined
        };

        try {
            this.cargando = true;
            const idExistente = this.esEdicion && this.usuarioSeleccionado
                ? this.usuarioSeleccionado['id'] as number
                : undefined;
            const idSucursalExistente = this.esEdicion && this.usuarioSeleccionado
                ? this.usuarioSeleccionado['idSucursal'] as number
                : undefined;

            await this.usuarioServicio.guardar(dto, idExistente, idSucursalExistente);

            this.notificacion.exito(
                this.esEdicion ? 'Usuario modificado' : 'Usuario creado'
            );

            this.cerrarDialogo();
            await this.buscar();
        } catch (err) {
            this.notificacion.error('Error al guardar usuario', extraerMensajeError(err));
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
        const tieneCodigo = !!filtro.codigoUsuario?.trim();
        const tieneSucursal = filtro.idSucursal != null && filtro.idSucursal !== '';

        if (!tieneNombre && !tieneCodigo && !tieneSucursal) {
            this.advertenciaBusqueda = 'Debe ingresar al menos un criterio de búsqueda';
            return;
        }

        this.advertenciaBusqueda = '';
        this.usuarioSeleccionado = null;

        try {
            this.cargando = true;
            const resultado = await this.usuarioServicio.buscar({
                nombre: tieneNombre ? filtro.nombre!.trim() : undefined,
                codigoUsuario: tieneCodigo ? filtro.codigoUsuario!.trim() : undefined,
                idSucursal: tieneSucursal ? Number(filtro.idSucursal) : undefined
            });

            this.usuarios = resultado.map(u => ({
                _uid: `${u.id}_${u.idSucursal}`,
                id: u.id,
                idSucursal: u.idSucursal,
                idPuesto: u.idPuesto,
                correlativo: u.nombrePuesto ? u.correlativo : null,
                codigoUsuario: u.codigoUsuario,
                nombres: u.nombres,
                apellidos: u.apellidos,
                dui: u.dui,
                estado: u.estado,
                telefono: u.telefono,
                ip: u.ip,
                perfil: u.perfil,
                nombreSucursal: u.nombreSucursal,
                nombrePuesto: u.nombrePuesto
            }));

            if (this.usuarios.length === 0) {
                this.notificacion.advertencia('Sin resultados', 'No se encontraron usuarios con los filtros ingresados');
            }
        } catch (err) {
            this.notificacion.error('Error al buscar', extraerMensajeError(err));
            this.usuarios = [];
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
        this.usuarios = [];
        this.usuarioSeleccionado = null;
    }

    /* ══════════════════════════════════════════
       Selección
    ══════════════════════════════════════════ */
    seleccionarUsuario(item: TableItem): void {
        this.usuarioSeleccionado = item;
    }
}

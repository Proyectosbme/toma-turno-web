import { Component, OnInit, ViewChild, ElementRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AuthService } from '@auth/services/auth.service';
import { UsuarioApiClient } from '@general/api/usuario-api.client';

@Component({
    selector: 'app-user-menu',
    standalone: true,
    imports: [CommonModule, RouterModule, ButtonModule, MenuModule, AvatarModule, ToastModule],
    templateUrl: './user.menu.component.html',
    styleUrl: './user.menu.component.scss',
    providers: [MessageService]
})
export class UserMenuComponent implements OnInit {
    @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

    items: MenuItem[] = [];
    iniciales = '';
    nombreCompleto = '';
    nombreSucursal = '';
    fotoUrl: string | null = null;
    /** Se pobla al recibir el perfil del backend tras el login de Keycloak */
    idUsuario: number = 0;
    idSucursal: number = 0;
    cargandoFoto = false;

    constructor(
        private readonly authService: AuthService,
        private readonly router: Router,
        private readonly usuarioApi: UsuarioApiClient,
        private readonly messageService: MessageService
    ) {
        effect(() => {
            if (this.authService.perfilListo()) {
                this.aplicarPerfil();
            }
        });
    }

    ngOnInit() {}

    private aplicarPerfil(): void {
        const nombres   = this.authService.getNombres();
        const apellidos = this.authService.getApellidos();
        this.nombreCompleto  = this.authService.getNombreCompleto();
        this.nombreSucursal  = this.authService.getPerfilBackend()?.nombreSucursal ?? '';
        this.idUsuario  = this.authService.getPerfilBackend()?.id ?? 0;
        this.idSucursal = this.authService.getPerfilBackend()?.idSucursal ?? 0;
        this.iniciales = [nombres, apellidos]
            .filter(Boolean)
            .map(s => s.charAt(0).toUpperCase())
            .join('');

        this.items = [
            {
                label: this.nombreCompleto,
                items: [
                    {
                        label: 'Cerrar Sesión',
                        icon: 'pi pi-sign-out',
                        command: () => this.authService.logout()
                    }
                ]
            }
        ];

        this.cargarFoto();
    }

    private async cargarFoto(): Promise<void> {
        if (!this.idUsuario || !this.idSucursal) return;

        try {
            const blob = await this.usuarioApi.obtenerFoto(this.idUsuario, this.idSucursal);
            if (!blob || blob.size === 0) return;

            // Si el servidor no envía Content-Type, detectar por magic bytes
            let typed = blob;
            if (!blob.type || blob.type === 'application/octet-stream') {
                const bytes = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
                let mime = 'image/jpeg';
                if      (bytes[0] === 0x89 && bytes[1] === 0x50) mime = 'image/png';
                else if (bytes[0] === 0x47 && bytes[1] === 0x49) mime = 'image/gif';
                else if (bytes[0] === 0x52 && bytes[1] === 0x49) mime = 'image/webp';
                else if (bytes[0] === 0x3C)                      mime = 'image/svg+xml'; // <svg o <?xml
                typed = new Blob([blob], { type: mime });
            }

            if (this.fotoUrl) URL.revokeObjectURL(this.fotoUrl);
            this.fotoUrl = URL.createObjectURL(typed);
        } catch {
            // Sin foto → avatar con iniciales
        }
    }

    seleccionarFoto(): void {
        this.fileInput.nativeElement.click();
    }

    async actualizarFoto(event: Event): Promise<void> {
        const input = event.target as HTMLInputElement;
        const archivo = input.files?.[0];

        if (!archivo) return;

        if (!archivo.type.startsWith('image/')) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Por favor selecciona una imagen válida'
            });
            return;
        }

        try {
            this.cargandoFoto = true;
            await this.usuarioApi.asignarFoto(this.idUsuario, this.idSucursal, archivo);

            if (this.fotoUrl) {
                URL.revokeObjectURL(this.fotoUrl);
                this.fotoUrl = null;
            }
            await this.cargarFoto();

            this.messageService.add({
                severity: 'success',
                summary: 'Éxito',
                detail: 'Foto actualizada correctamente'
            });
        } catch (error) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Error al actualizar la foto'
            });
        } finally {
            this.cargandoFoto = false;
            input.value = '';
        }
    }
}

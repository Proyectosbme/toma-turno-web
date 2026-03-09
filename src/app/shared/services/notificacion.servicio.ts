// src/app/shared/services/notificacion.servicio.ts
import { Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';

@Injectable({ providedIn: 'root' })
export class NotificacionServicio {

    constructor(private readonly messageService: MessageService) { }

    exito(mensaje: string, detalle?: string): void {
        this.messageService.add({
            severity: 'success',
            summary: mensaje,
            detail: detalle,
            life: 3000
        });
    }

    error(mensaje: string, detalle?: string): void {
        this.messageService.add({
            severity: 'error',
            summary: mensaje,
            detail: detalle,
            life: 5000
        });
    }

    advertencia(mensaje: string, detalle?: string): void {
        this.messageService.add({
            severity: 'warn',
            summary: mensaje,
            detail: detalle,
            life: 4000
        });
    }
}
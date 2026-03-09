import { HttpErrorResponse } from '@angular/common/http';

export class AppErrors {
  static fromHttp(error: unknown, fallback: string): Error {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return new Error('No se puede conectar al servicio. Verifica tu conexión.');
      }
      if (error.status === 404) {
        return new Error('No encontrado.');
      }
      if (error.status === 400) {
        return new Error('Solicitud inválida.');
      }
      if (error.status === 401) {
        return new Error('No autorizado.');
      }
      if (error.status === 403) {
        return new Error('Acceso denegado.');
      }
      if (error.status >= 500) {
        return new Error('Error interno del servidor.');
      }
    }
    return new Error(fallback);
  }
}

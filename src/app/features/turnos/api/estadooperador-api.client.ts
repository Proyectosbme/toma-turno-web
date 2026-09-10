import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { EstadoOperadorResponseDTO } from '@turnos/dto/estadooperador.dto';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class EstadoOperadorApiClient {

    private readonly BASE_URL = `${environment.apiUrl}/estado-operador`;

    constructor(private readonly http: HttpClient) {}

    private params(idUsuario: number, idSucursal: number, idPuesto?: number): HttpParams {
        let params = new HttpParams()
            .set('idUsuario', idUsuario)
            .set('idSucursal', idSucursal);
        if (idPuesto != null) params = params.set('idPuesto', idPuesto);
        return params;
    }

    buscarVigente(idUsuario: number, idSucursal: number): Promise<EstadoOperadorResponseDTO | null> {
        return firstValueFrom(
            this.http.get<EstadoOperadorResponseDTO | null>(this.BASE_URL, { params: this.params(idUsuario, idSucursal) })
        );
    }

    abrir(idUsuario: number, idSucursal: number, idPuesto: number): Promise<EstadoOperadorResponseDTO> {
        return firstValueFrom(
            this.http.put<EstadoOperadorResponseDTO>(`${this.BASE_URL}/abrir`, null,
                { params: this.params(idUsuario, idSucursal, idPuesto) })
        );
    }

    cerrar(idUsuario: number, idSucursal: number, idPuesto: number): Promise<EstadoOperadorResponseDTO> {
        return firstValueFrom(
            this.http.put<EstadoOperadorResponseDTO>(`${this.BASE_URL}/cerrar`, null,
                { params: this.params(idUsuario, idSucursal, idPuesto) })
        );
    }

    iniciarDescanso(idUsuario: number, idSucursal: number, idPuesto: number,
                     idTipoDescanso: number, comentario?: string): Promise<EstadoOperadorResponseDTO> {
        return firstValueFrom(
            this.http.put<EstadoOperadorResponseDTO>(`${this.BASE_URL}/descanso`, { idTipoDescanso, comentario },
                { params: this.params(idUsuario, idSucursal, idPuesto) })
        );
    }

    quitarDescanso(idUsuario: number, idSucursal: number, idPuesto: number): Promise<EstadoOperadorResponseDTO> {
        return firstValueFrom(
            this.http.put<EstadoOperadorResponseDTO>(`${this.BASE_URL}/descanso/quitar`, null,
                { params: this.params(idUsuario, idSucursal, idPuesto) })
        );
    }

    /** Reintenta el llamado automático sin cambiar el estado — usado al entrar a la
     *  pantalla del operador cuando ya está ACTIVA y hay turnos en espera. */
    verificarAutomatico(idUsuario: number, idSucursal: number, idPuesto: number): Promise<void> {
        return firstValueFrom(
            this.http.put<void>(`${this.BASE_URL}/verificar-automatico`, null,
                { params: this.params(idUsuario, idSucursal, idPuesto) })
        );
    }
}

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { TiempoMuertoResponseDTO } from '@turnos/dto/tiempomuerto.dto';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TiempoMuertoApiClient {

    private readonly BASE_URL = `${environment.apiUrl}/tiempos-muertos`;

    constructor(private readonly http: HttpClient) {}

    /** Historial de estado del operador de hoy. Sin idUsuario devuelve el de toda la sucursal. */
    buscar(idSucursal: number, idUsuario?: number): Promise<TiempoMuertoResponseDTO[]> {
        let params = new HttpParams().set('idSucursal', idSucursal);
        if (idUsuario != null) params = params.set('idUsuario', idUsuario);
        return firstValueFrom(
            this.http.get<TiempoMuertoResponseDTO[]>(this.BASE_URL, { params })
        );
    }
}

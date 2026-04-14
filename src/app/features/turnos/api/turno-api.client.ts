import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { CrearTurnoRequestDTO, TurnoResponseDTO } from '@turnos/dto/turno.dto';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TurnoApiClient {

    private readonly BASE_URL = `${environment.apiUrl}/turnos`;

    constructor(private readonly http: HttpClient) {}

    crear(dto: CrearTurnoRequestDTO): Promise<TurnoResponseDTO> {
        return firstValueFrom(
            this.http.post<TurnoResponseDTO>(`${this.BASE_URL}/crear`, dto)
        );
    }

    llamar(idSucursal: number, codigoTurno: string, fechaCreacion: string,
           dto: { idPuesto: number; idSucursalPuesto: number; idUsuario?: number }): Promise<TurnoResponseDTO> {
        const params = new HttpParams().set('fechaCreacion', fechaCreacion);
        return firstValueFrom(
            this.http.put<TurnoResponseDTO>(
                `${this.BASE_URL}/${idSucursal}/${codigoTurno}/llamar`, dto, { params }
            )
        );
    }

    finalizar(idSucursal: number, codigoTurno: string, fechaCreacion: string): Promise<TurnoResponseDTO> {
        const params = new HttpParams().set('fechaCreacion', fechaCreacion);
        return firstValueFrom(
            this.http.put<TurnoResponseDTO>(
                `${this.BASE_URL}/${idSucursal}/${codigoTurno}/finalizar`, null, { params }
            )
        );
    }

    sinAtender(idSucursal: number, codigoTurno: string, fechaCreacion: string): Promise<TurnoResponseDTO> {
        const params = new HttpParams().set('fechaCreacion', fechaCreacion);
        return firstValueFrom(
            this.http.put<TurnoResponseDTO>(
                `${this.BASE_URL}/${idSucursal}/${codigoTurno}/sin-atender`, null, { params }
            )
        );
    }

    reasignar(idSucursal: number, codigoTurno: string, fechaCreacion: string,
              dto: { idSucursalDestino: number; idColaDestino: number; idDetalleDestino?: number }): Promise<TurnoResponseDTO> {
        const params = new HttpParams().set('fechaCreacion', fechaCreacion);
        return firstValueFrom(
            this.http.post<TurnoResponseDTO>(
                `${this.BASE_URL}/${idSucursal}/${codigoTurno}/reasignar`, dto, { params }
            )
        );
    }

    rellamar(idSucursal: number, codigoTurno: string, fechaCreacion: string,
             dto: { idPuesto: number; idSucursalPuesto: number; idUsuario?: number }): Promise<TurnoResponseDTO> {
        const params = new HttpParams().set('fechaCreacion', fechaCreacion);
        return firstValueFrom(
            this.http.put<TurnoResponseDTO>(
                `${this.BASE_URL}/${idSucursal}/${codigoTurno}/re-llamar`, dto, { params }
            )
        );
    }

    buscar(filtro: { idSucursal?: number; idCola?: number; idDetalle?: number;
                     estado?: number; fecha?: string;
                     idPuesto?: number; idSucursalPuesto?: number }): Promise<TurnoResponseDTO[]> {
        let params = new HttpParams();
        if (filtro.idSucursal       != null) params = params.set('idSucursal',       filtro.idSucursal);
        if (filtro.idCola           != null) params = params.set('idCola',           filtro.idCola);
        if (filtro.idDetalle        != null) params = params.set('idDetalle',        filtro.idDetalle);
        if (filtro.estado           != null) params = params.set('estado',           filtro.estado);
        if (filtro.fecha)                    params = params.set('fecha',            filtro.fecha);
        if (filtro.idPuesto         != null) params = params.set('idPuesto',         filtro.idPuesto);
        if (filtro.idSucursalPuesto != null) params = params.set('idSucursalPuesto', filtro.idSucursalPuesto);
        return firstValueFrom(
            this.http.get<TurnoResponseDTO[]>(`${this.BASE_URL}/buscar`, { params })
        );
    }
}

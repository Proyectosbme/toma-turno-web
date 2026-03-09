import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ColaRequestDTO, ColaResponseDTO } from '@general/dto/cola.dto';
import { DetalleRequestDTO } from '@general/dto/detalle.dto';
import { ReplicarResponseDTO } from '@general/dto/sucursal.dto';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ColaApiClient {

    private readonly BASE_URL = `${environment.apiUrl}/colas`;

    constructor(private readonly http: HttpClient) { }

    buscar(filtro: { id?: number; idSucursal?: number; nombre?: string }): Promise<ColaResponseDTO[]> {
        let params = new HttpParams();
        if (filtro.id != null) params = params.set('id', filtro.id);
        if (filtro.idSucursal != null) params = params.set('idSucursal', filtro.idSucursal);
        if (filtro.nombre) params = params.set('nombre', filtro.nombre);

        return firstValueFrom(
            this.http.get<ColaResponseDTO[]>(`${this.BASE_URL}/buscar`, { params })
        );
    }

    buscarConDetalles(idCola: number, idSucursal: number): Promise<ColaResponseDTO> {
        return firstValueFrom(
            this.http.get<ColaResponseDTO>(`${this.BASE_URL}/${idCola}/sucursal/${idSucursal}`)
        );
    }

    crear(dto: ColaRequestDTO): Promise<ColaResponseDTO> {
        return firstValueFrom(
            this.http.post<ColaResponseDTO>(`${this.BASE_URL}/crear`, dto)
        );
    }

    modificar(idCola: number, idSucursal: number, dto: ColaRequestDTO): Promise<ColaResponseDTO> {
        return firstValueFrom(
            this.http.put<ColaResponseDTO>(`${this.BASE_URL}/${idCola}/sucursal/${idSucursal}`, dto)
        );
    }

    crearDetalle(idCola: number, idSucursal: number, dto: DetalleRequestDTO): Promise<ColaResponseDTO> {
        return firstValueFrom(
            this.http.post<ColaResponseDTO>(
                `${this.BASE_URL}/${idCola}/sucursal/${idSucursal}/detalles`,
                dto
            )
        );
    }

    replicar(idOrigen: number, idDestino: number): Promise<ReplicarResponseDTO> {
        const params = new HttpParams()
            .set('idOrigen', idOrigen)
            .set('idDestino', idDestino);
        return firstValueFrom(
            this.http.post<ReplicarResponseDTO>(`${this.BASE_URL}/replicar`, null, { params })
        );
    }
}
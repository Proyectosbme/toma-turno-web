import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { DetalleColaxPuestoRequestDTO, DetalleColaxPuestoResponseDTO } from '@general/dto/detallecolaxpuesto.dto';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DetalleColaxPuestoApiClient {

    private readonly BASE_URL = `${environment.apiUrl}/detallecolaxpuesto`;

    constructor(private readonly http: HttpClient) {}

    listarPorPuesto(idPuesto: number, idSucursalPuesto: number): Promise<DetalleColaxPuestoResponseDTO[]> {
        const params = new HttpParams()
            .set('idPuesto', idPuesto)
            .set('idSucursalPuesto', idSucursalPuesto);
        return firstValueFrom(
            this.http.get<DetalleColaxPuestoResponseDTO[]>(this.BASE_URL, { params })
        );
    }

    asignar(dto: DetalleColaxPuestoRequestDTO): Promise<DetalleColaxPuestoResponseDTO> {
        return firstValueFrom(
            this.http.post<DetalleColaxPuestoResponseDTO>(`${this.BASE_URL}/asignar`, dto)
        );
    }

    desasignar(idPuesto: number, idSucursalPuesto: number,
               idCola: number, idDetalle: number, idSucursalCola: number): Promise<void> {
        return firstValueFrom(
            this.http.delete<void>(
                `${this.BASE_URL}/${idPuesto}/${idSucursalPuesto}/${idCola}/${idDetalle}/${idSucursalCola}`
            )
        );
    }
}

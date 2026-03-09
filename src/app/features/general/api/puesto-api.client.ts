import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { PuestoRequestDTO, PuestoResponseDTO } from '@general/dto/puesto.dto';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PuestoApiClient {

    private readonly BASE_URL = `${environment.apiUrl}/puestos`;

    constructor(private readonly http: HttpClient) {}

    buscarPorFiltros(idSucursal?: number, nombre?: string): Promise<PuestoResponseDTO[]> {
        let params = new HttpParams();
        if (idSucursal != null) params = params.set('idSucursal', idSucursal);
        if (nombre) params = params.set('nombre', nombre);

        return firstValueFrom(
            this.http.get<PuestoResponseDTO[]>(`${this.BASE_URL}/buscar`, { params })
        );
    }

    buscarPorId(idPuesto: number, idSucursal: number): Promise<PuestoResponseDTO> {
        return firstValueFrom(
            this.http.get<PuestoResponseDTO>(`${this.BASE_URL}/${idPuesto}/sucursal/${idSucursal}`)
        );
    }

    crear(dto: PuestoRequestDTO): Promise<PuestoResponseDTO> {
        return firstValueFrom(
            this.http.post<PuestoResponseDTO>(`${this.BASE_URL}/crear`, dto)
        );
    }

    modificar(idPuesto: number, idSucursal: number, dto: PuestoRequestDTO): Promise<PuestoResponseDTO> {
        return firstValueFrom(
            this.http.put<PuestoResponseDTO>(`${this.BASE_URL}/${idPuesto}/sucursal/${idSucursal}`, dto)
        );
    }
}

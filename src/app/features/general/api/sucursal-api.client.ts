import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { SucursalRequestDTO, SucursalResponseDTO } from '@general/dto/sucursal.dto';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SucursalApiClient {

    private readonly BASE_URL = `${environment.apiUrl}/sucursal`;

    constructor(private readonly http: HttpClient) {}

    listarTodas(): Promise<SucursalResponseDTO[]> {
        return firstValueFrom(
            this.http.get<SucursalResponseDTO[]>(this.BASE_URL)
        );
    }

    buscarPorId(id: number): Promise<SucursalResponseDTO> {
        return firstValueFrom(
            this.http.get<SucursalResponseDTO>(`${this.BASE_URL}/${id}`)
        );
    }

    buscarPorNombre(nombre?: string): Promise<SucursalResponseDTO[]> {
        let params = new HttpParams();
        if (nombre) params = params.set('nombre', nombre);

        return firstValueFrom(
            this.http.get<SucursalResponseDTO[]>(`${this.BASE_URL}/sucursales`, { params })
        );
    }

    crear(dto: SucursalRequestDTO): Promise<SucursalResponseDTO> {
        return firstValueFrom(
            this.http.post<SucursalResponseDTO>(`${this.BASE_URL}/crear`, dto)
        );
    }

    modificar(id: number, dto: SucursalRequestDTO): Promise<SucursalResponseDTO> {
        const params = new HttpParams().set('id', id);
        return firstValueFrom(
            this.http.put<SucursalResponseDTO>(`${this.BASE_URL}/modificar`, dto, { params })
        );
    }
}

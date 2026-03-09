import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ConfiguracionRequestDTO, ConfiguracionResponseDTO } from '@general/dto/configuracion.dto';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ConfiguracionApiClient {

    private readonly BASE_URL = `${environment.apiUrl}/configuraciones`;

    constructor(private readonly http: HttpClient) {}

    buscarPorSucursal(idSucursal: number): Promise<ConfiguracionResponseDTO[]> {
        const params = new HttpParams().set('idSucursal', idSucursal);
        return firstValueFrom(
            this.http.get<ConfiguracionResponseDTO[]>(this.BASE_URL, { params })
        );
    }

    buscarPorId(idConfiguracion: number, idSucursal: number): Promise<ConfiguracionResponseDTO> {
        return firstValueFrom(
            this.http.get<ConfiguracionResponseDTO>(
                `${this.BASE_URL}/${idConfiguracion}/sucursal/${idSucursal}`
            )
        );
    }

    crear(dto: ConfiguracionRequestDTO): Promise<ConfiguracionResponseDTO> {
        return firstValueFrom(
            this.http.post<ConfiguracionResponseDTO>(`${this.BASE_URL}/crear`, dto)
        );
    }

    modificar(idConfiguracion: number, idSucursal: number, dto: ConfiguracionRequestDTO): Promise<ConfiguracionResponseDTO> {
        return firstValueFrom(
            this.http.put<ConfiguracionResponseDTO>(
                `${this.BASE_URL}/${idConfiguracion}/sucursal/${idSucursal}`, dto
            )
        );
    }
}

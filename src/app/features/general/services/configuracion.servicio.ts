import { Injectable } from '@angular/core';
import { ConfiguracionApiClient } from '@general/api/configuracion-api.client';
import { ConfiguracionRequestDTO, ConfiguracionResponseDTO } from '@general/dto/configuracion.dto';

@Injectable({ providedIn: 'root' })
export class ConfiguracionServicio {

    constructor(private readonly api: ConfiguracionApiClient) {}

    buscarPorSucursal(idSucursal: number): Promise<ConfiguracionResponseDTO[]> {
        return this.api.buscarPorSucursal(idSucursal);
    }

    guardar(dto: ConfiguracionRequestDTO, idExistente?: number): Promise<ConfiguracionResponseDTO> {
        if (idExistente != null) {
            return this.api.modificar(idExistente, dto.idSucursal, dto);
        }
        return this.api.crear(dto);
    }
}

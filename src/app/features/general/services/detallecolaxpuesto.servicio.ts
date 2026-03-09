import { Injectable } from '@angular/core';
import { DetalleColaxPuestoApiClient } from '@general/api/detallecolaxpuesto-api.client';
import { DetalleColaxPuestoRequestDTO, DetalleColaxPuestoResponseDTO } from '@general/dto/detallecolaxpuesto.dto';

@Injectable({ providedIn: 'root' })
export class DetalleColaxPuestoServicio {

    constructor(private readonly api: DetalleColaxPuestoApiClient) {}

    listarPorPuesto(idPuesto: number, idSucursalPuesto: number): Promise<DetalleColaxPuestoResponseDTO[]> {
        return this.api.listarPorPuesto(idPuesto, idSucursalPuesto);
    }

    asignar(dto: DetalleColaxPuestoRequestDTO): Promise<DetalleColaxPuestoResponseDTO> {
        return this.api.asignar(dto);
    }

    desasignar(idPuesto: number, idSucursalPuesto: number,
               idCola: number, idDetalle: number, idSucursalCola: number): Promise<void> {
        return this.api.desasignar(idPuesto, idSucursalPuesto, idCola, idDetalle, idSucursalCola);
    }
}

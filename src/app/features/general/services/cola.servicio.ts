import { Injectable } from '@angular/core';
import { ColaApiClient } from '@general/api/cola-api.client';
import { ColaRequestDTO, ColaResponseDTO } from '@general/dto/cola.dto';
import { DetalleRequestDTO } from '@general/dto/detalle.dto';

export interface ColaFiltro {
    nombre?: string;
    idSucursal?: number;
}

@Injectable({ providedIn: 'root' })
export class ColaServicio {

    constructor(private readonly colaApi: ColaApiClient) { }

    async buscar(filtro: ColaFiltro): Promise<ColaResponseDTO[]> {
        return this.colaApi.buscar({
            nombre: filtro.nombre?.trim() || undefined,
            idSucursal: filtro.idSucursal ?? undefined
        });
    }

    async obtenerConDetalles(idCola: number, idSucursal: number): Promise<ColaResponseDTO> {
        return this.colaApi.buscarConDetalles(idCola, idSucursal);
    }

    async guardar(dto: ColaRequestDTO, idExistente?: number): Promise<ColaResponseDTO> {
        if (idExistente != null) {
            return this.colaApi.modificar(idExistente, dto.idSucursal, dto);
        }
        return this.colaApi.crear(dto);
    }

    async guardarDetalle(idCola: number, idSucursal: number, dto: DetalleRequestDTO): Promise<ColaResponseDTO> {
        return this.colaApi.crearDetalle(idCola, idSucursal, dto);
    }

    async editarDetalle(idCola: number, idSucursal: number, idDetalle: number, dto: DetalleRequestDTO): Promise<ColaResponseDTO> {
        return this.colaApi.modificarDetalle(idCola, idSucursal, idDetalle, dto);
    }
}

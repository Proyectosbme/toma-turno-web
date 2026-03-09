import { Injectable } from '@angular/core';
import { SucursalApiClient } from '@general/api/sucursal-api.client';

import { SucursalRequestDTO, SucursalResponseDTO } from '@general/dto/sucursal.dto';
import { OpcionSelect } from '@shared/dto/opcion-select.dto';

/** Filtro de búsqueda para sucursales */
export interface SucursalFiltro {
    nombre?: string;
}

@Injectable({ providedIn: 'root' })
export class SucursalServicio {

    constructor(
        private readonly sucursalApi: SucursalApiClient
    ) {}

    /* ── Listar todas ── */
    async listarTodas(): Promise<SucursalResponseDTO[]> {
        return this.sucursalApi.listarTodas();
    }

    /* ── Opciones para selects ── */
    async obtenerOpciones(): Promise<OpcionSelect[]> {
        const sucursales = await this.sucursalApi.buscarPorNombre();
        return sucursales.map(s => ({ label: s.nombre, value: s.codigo }));
    }

    /* ── Búsqueda ── */
    async buscar(filtro?: SucursalFiltro): Promise<SucursalResponseDTO[]> {
        return this.sucursalApi.buscarPorNombre(filtro?.nombre?.trim() || undefined);
    }

    /* ── Guardar (crear o modificar) ── */
    async guardar(dto: SucursalRequestDTO, idExistente?: number): Promise<SucursalResponseDTO> {
        if (idExistente != null) {
            return this.sucursalApi.modificar(idExistente, dto);
        }
        return this.sucursalApi.crear(dto);
    }
}

import { Injectable } from '@angular/core';
import { PuestoApiClient } from '@general/api/puesto-api.client';
import { PuestoRequestDTO, PuestoResponseDTO } from '@general/dto/puesto.dto';
import { OpcionSelect } from '@shared/dto/opcion-select.dto';

/** Filtro de búsqueda para puestos */
export interface PuestoFiltro {
    idSucursal?: number;
    nombre?: string;
}

@Injectable({ providedIn: 'root' })
export class PuestoServicio {

    constructor(
        private readonly puestoApi: PuestoApiClient
    ) {}

    /* ── Buscar por filtros ── */
    async buscar(filtro?: PuestoFiltro): Promise<PuestoResponseDTO[]> {
        return this.puestoApi.buscarPorFiltros(
            filtro?.idSucursal ?? undefined,
            filtro?.nombre?.trim() || undefined
        );
    }

    /* ── Opciones para selects ── */
    async obtenerOpciones(idSucursal?: number): Promise<OpcionSelect[]> {
        const puestos = await this.puestoApi.buscarPorFiltros(idSucursal);
        return puestos.map(p => ({ label: p.nombre, value: p.id }));
    }

    /* ── Guardar (crear o modificar) ── */
    async guardar(dto: PuestoRequestDTO, idPuestoExistente?: number): Promise<PuestoResponseDTO> {
        if (idPuestoExistente != null) {
            return this.puestoApi.modificar(idPuestoExistente, dto.idSucursal, dto);
        }
        return this.puestoApi.crear(dto);
    }
}

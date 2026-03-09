import { Injectable } from '@angular/core';
import { UsuarioApiClient } from '@general/api/usuario-api.client';
import { UsuarioRequestDTO, UsuarioResponseDTO } from '@general/dto/usuario.dto';
import { OpcionSelect } from '@shared/dto/opcion-select.dto';

export interface UsuarioFiltro {
    idSucursal?: number;
    codigoUsuario?: string;
    nombre?: string;
}

@Injectable({ providedIn: 'root' })
export class UsuarioServicio {

    constructor(private readonly api: UsuarioApiClient) {}

    buscar(filtro?: UsuarioFiltro): Promise<UsuarioResponseDTO[]> {
        return this.api.buscar({
            idSucursal: filtro?.idSucursal,
            codigoUsuario: filtro?.codigoUsuario?.trim() || undefined,
            nombre: filtro?.nombre?.trim() || undefined
        });
    }

    obtenerOpciones(idSucursal?: number): Promise<OpcionSelect[]> {
        return this.api.buscar({ idSucursal }).then(usuarios =>
            usuarios.map(u => ({ label: `${u.nombres} ${u.apellidos}`, value: u.id }))
        );
    }

    guardar(dto: UsuarioRequestDTO, idExistente?: number, idSucursalExistente?: number): Promise<UsuarioResponseDTO> {
        if (idExistente != null && idSucursalExistente != null) {
            return this.api.modificar(idExistente, idSucursalExistente, dto);
        }
        return this.api.crear(dto);
    }
}

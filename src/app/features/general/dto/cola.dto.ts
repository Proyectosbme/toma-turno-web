import { DetalleResponseDTO } from '@general/dto/detalle.dto';

/** Datos que se ENVÍAN al backend para crear o modificar una cola */
export interface ColaRequestDTO {
    idSucursal: number;
    nombre: string;
    codigo: string;
    prioridad: number;
    estado: number;
    usuario: string;
}

/** Datos que RESPONDE el backend al consultar colas (listado, sin detalles) */
export interface ColaResponseDTO {
    id: number;
    idSucursal: number;
    nombre: string;
    codigo: string;
    prioridad: number;
    usuarioCreacion: string;
    fechaCreacion: string;
    usuarioModificacion: string;
    fechaModificacion: string;
    estado: number;
    nombreSucursal: string;
    detalles?: DetalleResponseDTO[]; // solo viene al buscar por id+sucursal
}

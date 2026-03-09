/** Datos que se ENVÍAN al backend para crear o modificar un puesto */
export interface PuestoRequestDTO {
    idSucursal: number;
    nombre: string;
    nombreLlamada: string;
    estado: number | null;
}

/** Datos que RESPONDE el backend al consultar puestos */
export interface PuestoResponseDTO {
    id: number;
    idSucursal: number;
    nombreSucursal: string;
    nombre: string;
    nombreLlamada: string;
    estado: number;
    usuarioCreacion: string;
    fechaCreacion: string;
    usuarioModificacion: string;
    fechaModificacion: string;
}

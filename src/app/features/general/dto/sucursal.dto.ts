/** Datos que se ENVÍAN al backend para crear o modificar una sucursal */
export interface SucursalRequestDTO {
    nombre: string;
    telefono: string;
    correo: string;
    direccion: string;
    estado: number | null;
    usuario: string;
}

/** Datos que RESPONDE el backend al consultar sucursales */
export interface SucursalResponseDTO {
    codigo: number;
    nombre: string;
    telefono: string;
    correo: string;
    direccion: string;
    usuarioCreacion: string;
    fechaCreacion: string;
    usuarioModificacion: string;
    fechaModificacion: string;
    estado: number;
}

/** Respuesta del endpoint de replicación de colas */
export interface ReplicarResponseDTO {
    totalCopiadas: number;
    totalSaltadas: number;
    colasCopidas: string[];
    colasSaltadas: string[];
    detallesCopiados: string[];
}
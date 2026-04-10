export interface DetalleRequestDTO {
    nombre: string;
    codigo: string;
    estado: number;
    usuario: string;
}

export interface DetalleResponseDTO {
    idDetalle: number;
    idCola: number;
    idSucursal: number;
    nombre: string;
    codigo: string;
    estado: number;
    usuarioCreacion: string;
    fechaCreacion: string;
    usuarioModificacion: string;
    fechaModificacion: string;
}
/** Datos que se ENVÍAN al backend para asignar un detalle de cola a un puesto */
export interface DetalleColaxPuestoRequestDTO {
    idPuesto: number;
    idSucursalPuesto: number;
    idCola: number;
    idDetalle: number;
    idSucursalCola: number;
    prioridad: number;
    usuario: string;
}

/** Datos que RESPONDE el backend */
export interface DetalleColaxPuestoResponseDTO {
    idPuesto: number;
    idSucursalPuesto: number;
    idCola: number;
    idDetalle: number;
    idSucursalCola: number;
    prioridad: number;
    nombreCola: string;
    nombreDetalle: string;
    userCreacion: string;
    fechaCreacion: string;
}

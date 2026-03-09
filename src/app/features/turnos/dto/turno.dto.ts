export interface CrearTurnoRequestDTO {
    idSucursal: number;
    idCola: number;
    idDetalle?: number | null;
    idPersona?: number | null;
    tipoCasoEspecial?: number | null;
}

export interface TurnoResponseDTO {
    id: number;
    idSucursal: number;
    fechaCreacion: string;
    codigoTurno: string;
    fechaLlamada?: string;
    fechaFinalizacion?: string;
    idCola: number;
    idDetalle?: number;
    estado: number;
    descripcionEstado: string;
    idTurnoRelacionado?: number;
    idPuesto?: number;
    idSucursalPuesto?: number;
    idUsuario?: number;
    idPersona?: number;
    tipoCasoEspecial?: number;
    nombreLlamada?: string;
}

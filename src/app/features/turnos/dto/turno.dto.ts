export enum EstadoTurno {
    CREADO   = 1,
    LLAMADO  = 2,
    TRASLADO = 3,
    FINALIZADO  = 4,
    SIN_ATENDER = 5,
    EN_ESPERA = 6,
}

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

export interface WsTurnoEvent {
    event: 'TURNO_LLAMADO' | 'TURNO_FINALIZADO' | 'TURNO_SIN_ATENDER' | 'TURNO_EN_ESPERA' | 'TURNO_CREADO' | 'TURNO_TRASLADO';
    idSucursal: number;
    turno?: TurnoResponseDTO;
}

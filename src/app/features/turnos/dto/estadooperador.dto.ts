export enum EstadoOperador {
    ACTIVA = 1,
    DESCANSO = 2,
    CERRADA = 3
}

export enum TipoDescanso {
    BANIO = 1,
    COMIDA = 2,
    OTRO = 3,
    TRAMITES_CONTABLES = 4
}

export const OPCIONES_TIPO_DESCANSO: { label: string; value: TipoDescanso }[] = [
    { label: 'Baño', value: TipoDescanso.BANIO },
    { label: 'Comida', value: TipoDescanso.COMIDA },
    { label: 'Trámites contables', value: TipoDescanso.TRAMITES_CONTABLES },
    { label: 'Otro', value: TipoDescanso.OTRO }
];

/** Datos que RESPONDE el backend al consultar el estado vigente de un operador */
export interface EstadoOperadorResponseDTO {
    id: number;
    idUsuario: number;
    idSucursal: number;
    idPuesto: number;
    idEstadoOperador: number;
    idTipoDescanso: number | null;
    comentario: string | null;
    fechaInicio: string;
    fechaFin: string | null;
    userCreacion: string;
    fechaCreacion: string;
    userModificacion: string;
    fechaModificacion: string;
}

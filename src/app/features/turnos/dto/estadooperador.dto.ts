export enum EstadoOperador {
    ACTIVA = 1,
    DESCANSO = 2,
    CERRADA = 3
}

export enum TipoDescanso {
    BANIO = 1,
    COMIDA = 2,
    OTRO = 3,
    TRAMITES_CONTABLES = 4,
    /** Automático (backend): caja ACTIVA sin sesión de WebSocket por 30s o más. No se
     *  agrega a OPCIONES_TIPO_DESCANSO a propósito: el operador no lo puede elegir. */
    SESION_CERRADA = 5
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

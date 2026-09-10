/** Fila de la vista "vwusuarioestadooperador" del backend: un período de estado del operador de hoy. */
export interface TiempoMuertoResponseDTO {
    id: number;
    idUsuario: number;
    idSucursal: number;
    idPuesto: number | null;
    codigoUsuario: string | null;
    nombreCompleto: string | null;
    puesto: string | null;
    idEstadoOperador: number;
    estadoOperador: string;
    idTipoDescanso: number | null;
    tipoDescanso: string | null;
    fechaInicio: string;
    fechaFin: string | null;
}

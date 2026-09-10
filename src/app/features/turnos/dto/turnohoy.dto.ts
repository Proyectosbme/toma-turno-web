/** Fila de la vista "turnos hoy" del backend: un turno de hoy ya resuelto con nombres. */
export interface TurnoHoyResponseDTO {
    id: number;
    codigoTurno: string;
    idSucursalTicket: number;
    sucursalTicket: string;
    idUsuario: number | null;
    nombreCompleto: string | null;
    codigoUsuario: string | null;
    idPuesto: number | null;
    idPuestoSucursal: number | null;
    puesto: string | null;
    idCola: number;
    cola: string;
    idDetalle: number | null;
    detalle: string | null;
    tipoCasoEspecial: number | null;
    casoEspecial: string | null;
    fechaCreacion: string;
    fechaLlamada: string | null;
    fechaFinalizacion: string | null;
    idCatalogoEstado: number;
    idCatalogoEstadoDetalle: number;
    estadoTurno: string;
    idTurnoRelacionado: number | null;
}

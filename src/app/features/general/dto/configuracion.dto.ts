/** Datos que se ENVÍAN al backend para crear o modificar una configuración */
export interface ConfiguracionRequestDTO {
    idSucursal: number;
    nombre: string;
    /** Valor numérico: 0/1 para flags booleanos, número para correlativos */
    parametro: number | null;
    /** Valor de texto: prefijos, formatos (ej: "C-", "P-") */
    valorTexto: string;
    descripcion: string;
    estado: number;
    usuario: string;
}

/** Datos que RESPONDE el backend al consultar configuraciones */
export interface ConfiguracionResponseDTO {
    idConfiguracion: number;
    idSucursal: number;
    nombreSucursal: string;
    nombre: string;
    parametro: number | null;
    valorTexto: string;
    descripcion: string;
    estado: number;
    userCreacion: string;
    fechaCreacion: string;
    userModificacion: string;
    fechaModificacion: string;
}

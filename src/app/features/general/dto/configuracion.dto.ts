/** Datos que se ENVÍAN al backend para crear o modificar una configuración */
export interface ConfiguracionRequestDTO {
    idSucursal: number;
    parametro: number | null;
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
    descripcion: string;
    estado: number;
    userCreacion: string;
    fechaCreacion: string;
    userModificacion: string;
    fechaModificacion: string;
}

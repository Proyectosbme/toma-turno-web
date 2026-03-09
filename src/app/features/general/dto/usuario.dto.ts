/** Datos que se ENVÍAN al backend para crear o modificar un usuario */
export interface UsuarioRequestDTO {
    idSucursal: number;
    idPuesto: number | null;
    correlativo: number | null;
    atenderCasosEspeciales?: number | null;
    codigoUsuario: string;
    contrasena: string;
    nombres: string;
    apellidos: string;
    dui: string;
    estado: number | null;
    telefono: string;
    ip: string;
    perfil: string;
}

/** Datos que RESPONDE el backend al consultar usuarios */
export interface UsuarioResponseDTO {
    id: number;
    idSucursal: number;
    correlativo: number | null;
    atenderCasosEspeciales?: number | null;
    nombreSucursal: string;
    idPuesto: number | null;
    nombrePuesto: string;
    codigoUsuario: string;
    nombres: string;
    apellidos: string;
    dui: string;
    estado: number;
    telefono: string;
    ip: string;
    perfil: string;
    usuarioCreacion: string;
    fechaCreacion: string;
    usuarioModificacion: string;
    fechaModificacion: string;
}



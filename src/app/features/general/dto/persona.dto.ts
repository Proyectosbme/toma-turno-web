export interface PersonaRequestDTO {
    dui: string;
    nombres?: string;
    apellidos?: string;
    fechaNacimiento?: string; // DD/MM/YYYY
    sexo?: string;
}

export interface PersonaResponseDTO {
    id: number;
    dui: string;
    nombres?: string;
    apellidos?: string;
    fechaNacimiento?: string;
    sexo?: string;
}

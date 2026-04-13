export interface EmpresaResponseDTO {
    id: number;
    nombre: string;
    banner: number[] | null; // Java byte[] → array de enteros con signo
    logo: number[] | null;   // Java byte[] → array de enteros con signo
}

export interface EmpresaNombreRequestDTO {
    nombre: string;
}

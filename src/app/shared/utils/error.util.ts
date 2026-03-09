// src/app/shared/utils/error.util.ts
export interface ApiError {
    status: number;
    error: string;
    message: string;
    details?: string[];
}

export function extraerMensajeError(err: any): string {
    const apiError = err?.error as ApiError;
    if (!apiError) return 'Ocurrió un error inesperado';

    if (apiError.details && apiError.details.length > 0) {
        return apiError.details.join(' | ');
    }

    return apiError.message ?? 'Ocurrió un error inesperado';
}
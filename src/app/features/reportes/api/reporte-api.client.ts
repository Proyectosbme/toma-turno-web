import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ReporteApiClient {

    private readonly BASE_URL = `${environment.apiUrl}/reportes`;

    constructor(private readonly http: HttpClient) {}

    generarReporteActual(idSucursal: number): Promise<Blob> {
        return firstValueFrom(
            this.http.get(`${this.BASE_URL}/actual/${idSucursal}`, { responseType: 'blob' })
        ) as Promise<Blob>;
    }
}

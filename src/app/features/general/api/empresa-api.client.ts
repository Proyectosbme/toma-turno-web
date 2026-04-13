import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { EmpresaResponseDTO } from '@general/dto/empresa.dto';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class EmpresaApiClient {

    private readonly BASE_URL = `${environment.apiUrl}/empresa`;

    constructor(private readonly http: HttpClient) {}

    obtener(): Promise<EmpresaResponseDTO> {
        return firstValueFrom(
            this.http.get<EmpresaResponseDTO>(this.BASE_URL)
        );
    }

    actualizarNombre(nombre: string): Promise<EmpresaResponseDTO> {
        return firstValueFrom(
            this.http.patch<EmpresaResponseDTO>(`${this.BASE_URL}/nombre`, { nombre })
        );
    }

    actualizarLogo(logo: File): Promise<EmpresaResponseDTO> {
        const formData = new FormData();
        formData.append('logo', logo);
        return firstValueFrom(
            this.http.patch<EmpresaResponseDTO>(`${this.BASE_URL}/logo`, formData)
        );
    }

    actualizarBanner(banner: File): Promise<EmpresaResponseDTO> {
        const formData = new FormData();
        formData.append('banner', banner);
        return firstValueFrom(
            this.http.patch<EmpresaResponseDTO>(`${this.BASE_URL}/banner`, formData)
        );
    }
}

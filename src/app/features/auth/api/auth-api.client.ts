import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { UsuarioResponseDTO } from '@general/dto/usuario.dto';
import { environment } from '../../../../environments/environment';

export interface LoginRequestDTO {
    codigoUsuario: string;
    contrasena: string;
    idSucursal?: number;
}

@Injectable({ providedIn: 'root' })
export class AuthApiClient {

    private readonly BASE_URL = `${environment.apiUrl}/auth`;

    constructor(private readonly http: HttpClient) {}

    login(codigoUsuario: string, contrasena: string, idSucursal?: number): Promise<UsuarioResponseDTO> {
        const body: LoginRequestDTO = { codigoUsuario, contrasena, idSucursal };
        return firstValueFrom(
            this.http.post<UsuarioResponseDTO>(`${this.BASE_URL}/login`, body)
        );
    }
}

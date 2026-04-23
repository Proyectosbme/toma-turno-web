import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { UsuarioRegistroRequestDTO, UsuarioResponseDTO } from '@general/dto/usuario.dto';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthApiClient {

    private readonly BASE_URL = `${environment.apiUrl}/auth`;

    constructor(private readonly http: HttpClient) { }

    getPerfil(): Promise<UsuarioResponseDTO> {
        return firstValueFrom(
            this.http.get<UsuarioResponseDTO>(`${this.BASE_URL}/perfil`)
        );
    }

    getPerfilPorCodigo(codigoUsuario: string): Promise<UsuarioResponseDTO> {
        return firstValueFrom(
            this.http.get<UsuarioResponseDTO>(`${this.BASE_URL}/perfil2`, { params: { codigoUsuario } })
        );
    }

    registrar(dto: UsuarioRegistroRequestDTO): Promise<UsuarioResponseDTO> {
        return firstValueFrom(
            this.http.post<UsuarioResponseDTO>(`${this.BASE_URL}/crear`, dto)
        );
    }

}

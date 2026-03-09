import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { UsuarioRequestDTO, UsuarioResponseDTO } from '@general/dto/usuario.dto';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class UsuarioApiClient {

    private readonly BASE_URL = `${environment.apiUrl}/usuarios`;

    constructor(private readonly http: HttpClient) {}

    buscar(filtro: { idSucursal?: number; codigoUsuario?: string; nombre?: string }): Promise<UsuarioResponseDTO[]> {
        let params = new HttpParams();
        if (filtro.idSucursal != null) params = params.set('idSucursal', filtro.idSucursal);
        if (filtro.codigoUsuario) params = params.set('codigoUsuario', filtro.codigoUsuario);
        if (filtro.nombre) params = params.set('nombre', filtro.nombre);
        return firstValueFrom(
            this.http.get<UsuarioResponseDTO[]>(`${this.BASE_URL}/buscar`, { params })
        );
    }

    buscarPorId(idUsuario: number, idSucursal: number): Promise<UsuarioResponseDTO> {
        return firstValueFrom(
            this.http.get<UsuarioResponseDTO>(`${this.BASE_URL}/${idUsuario}/sucursal/${idSucursal}`)
        );
    }

    crear(dto: UsuarioRequestDTO): Promise<UsuarioResponseDTO> {
        return firstValueFrom(
            this.http.post<UsuarioResponseDTO>(`${this.BASE_URL}/crear`, dto)
        );
    }

    modificar(idUsuario: number, idSucursal: number, dto: UsuarioRequestDTO): Promise<UsuarioResponseDTO> {
        return firstValueFrom(
            this.http.put<UsuarioResponseDTO>(`${this.BASE_URL}/${idUsuario}/sucursal/${idSucursal}`, dto)
        );
    }
}

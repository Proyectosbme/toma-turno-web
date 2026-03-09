import { Injectable } from '@angular/core';
import { UsuarioResponseDTO } from '@general/dto/usuario.dto';

@Injectable({ providedIn: 'root' })
export class AuthService {

    private readonly SESSION_KEY = 'usuario_sesion';

    getUsuario(): UsuarioResponseDTO | null {
        const stored = localStorage.getItem(this.SESSION_KEY);
        return stored ? (JSON.parse(stored) as UsuarioResponseDTO) : null;
    }

    setUsuario(usuario: UsuarioResponseDTO): void {
        localStorage.setItem(this.SESSION_KEY, JSON.stringify(usuario));
    }

    getPerfil(): string | null {
        return this.getUsuario()?.perfil ?? null;
    }

    isLoggedIn(): boolean {
        return this.getUsuario() !== null;
    }

    logout(): void {
        localStorage.removeItem(this.SESSION_KEY);
    }
}

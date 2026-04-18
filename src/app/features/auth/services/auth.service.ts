import { Injectable, inject } from '@angular/core';
import Keycloak from 'keycloak-js';

// ── Claims del JWT emitido por Keycloak ─────────────────────────────────────

interface TokenClaims {
    given_name?:         string;
    family_name?:        string;
    preferred_username?: string;
    realm_access?:       { roles: string[] };
}

// ── Datos que siguen viniendo del backend (no están en el JWT) ──────────────

export interface PerfilBackend {
    id:                     number;
    idSucursal:             number;
    idPuesto:               number | null;
    correlativo:            number | null;
    nombreSucursal:         string;
    nombrePuesto:           string;
    codigoUsuario:          string;
    perfil:                 string;
    atenderCasosEspeciales?: number | null;
    estado:                 number;
    dui:                    string;
    ip:                     string;
    usuarioCreacion:        string;
    fechaCreacion:          string;
    usuarioModificacion:    string;
    fechaModificacion:      string;
}

/** Forma que devuelve getUsuario(), mezclando JWT + perfil backend */
export type UsuarioSesion = PerfilBackend & {
    nombres:   string;
    apellidos: string;
    telefono:  string;   // ya no viene del backend — si lo necesitas, léelo del JWT
};

// ────────────────────────────────────────────────────────────────────────────

const ROLES_NEGOCIO = ['ADMIN', 'OPERADOR', 'MONITOR', 'PUBLICO'] as const;
const PERFIL_BACKEND_KEY = 'perfil_backend';

@Injectable({ providedIn: 'root' })
export class AuthService {

    private readonly kc = inject(Keycloak);

    // ── Claims del JWT ──────────────────────────────────────────────────────

    private get claims(): TokenClaims {
        return (this.kc.tokenParsed ?? {}) as TokenClaims;
    }

    getNombres(): string    { return this.claims.given_name  ?? ''; }
    getApellidos(): string  { return this.claims.family_name ?? ''; }
    getCodigoUsuario(): string { return this.claims.preferred_username ?? ''; }

    getNombreCompleto(): string {
        return `${this.getNombres()} ${this.getApellidos()}`.trim()
            || this.getCodigoUsuario()
            || 'Usuario';
    }

    // ── Roles (realm_access.roles) ──────────────────────────────────────────

    getRoles(): string[] {
        return (this.claims.realm_access?.roles ?? []).map(r => r.toUpperCase());
    }

    getPerfil(): string | null {
        const roles = this.getRoles();
        return roles.find(r => (ROLES_NEGOCIO as readonly string[]).includes(r)) ?? null;
    }

    tieneRol(rol: string): boolean { return this.getRoles().includes(rol.toUpperCase()); }

    // ── Perfil backend (id, idSucursal, idPuesto…) ──────────────────────────

    /**
     * Guarda en localStorage los campos que vienen del backend tras el login.
     * Llámalo una vez al inicializar la app, después de que Keycloak confirme
     * la sesión, consultando p. ej. GET /usuarios/perfil.
     */
    setPerfilBackend(perfil: PerfilBackend): void {
        localStorage.setItem(PERFIL_BACKEND_KEY, JSON.stringify(perfil));
    }

    getPerfilBackend(): PerfilBackend | null {
        const raw = localStorage.getItem(PERFIL_BACKEND_KEY);
        return raw ? (JSON.parse(raw) as PerfilBackend) : null;
    }

    /**
     * Compatibilidad con el código existente que usaba getUsuario().
     * Devuelve los campos del backend combinados con nombres/apellidos del JWT.
     */
    getUsuario(): UsuarioSesion | null {
        const backend = this.getPerfilBackend();
        if (!backend) return null;
        return {
            ...backend,
            nombres:   this.getNombres(),
            apellidos: this.getApellidos(),
            telefono:  ''   // ya no viaja en la respuesta del backend
        };
    }

    // ── Estado de sesión ────────────────────────────────────────────────────

    isLoggedIn(): boolean { return !!this.kc.authenticated; }

    login(): Promise<void>  { return this.kc.login({ redirectUri: window.location.origin }); }

    logout(): Promise<void> {
        localStorage.removeItem(PERFIL_BACKEND_KEY);
        return this.kc.logout({ redirectUri: window.location.origin });
    }

    // ── Helpers de negocio ──────────────────────────────────────────────────

    esSubAdmin(): boolean {
        return this.tieneRol('SUBADMIN');
    }

    idSucursalFija(): number | null {
        if (!this.esSubAdmin()) return null;
        return this.getPerfilBackend()?.idSucursal ?? null;
    }
}

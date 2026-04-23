import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthService } from '@auth/services/auth.service';
import { AuthApiClient } from '@auth/api/auth-api.client';

export const authGuard: CanActivateFn = async () => {
    const auth    = inject(AuthService);
    const authApi = inject(AuthApiClient);

    if (!auth.isLoggedIn()) {
        await auth.login();
        return false;
    }

    if (!auth.getPerfilBackend()) {
        try {
            const codigoUsuario = auth.getCodigoUsuario();
            if (codigoUsuario) {
                const perfil = await authApi.getPerfilPorCodigo(codigoUsuario);
                auth.setPerfilBackend(perfil);
            }
        } catch {
            // Usuario no tiene perfil en BD
        }
    }

    return true;
};

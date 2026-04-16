import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@auth/services/auth.service';

export const perfilGuard: CanActivateFn = async (route) => {
    const auth    = inject(AuthService);
    const router  = inject(Router);

    if (!auth.isLoggedIn()) {
        await auth.login();
        return false;
    }

    const perfilesPermitidos: string[] = route.data?.['perfiles'] ?? [];
    const perfil = auth.getPerfil();

    if (!perfil) {
        return router.navigate(['/auth/access']);
    }

    if (perfilesPermitidos.length === 0 || perfilesPermitidos.includes(perfil)) {
        return true;
    }

    return router.navigate(['/auth/access']);
};

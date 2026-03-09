import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@auth/services/auth.service';

export const perfilGuard: CanActivateFn = (route) => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const perfil = authService.getPerfil();

    if (!perfil) {
        router.navigate(['/auth/login']);
        return false;
    }

    const perfilesPermitidos: string[] = route.data?.['perfiles'] ?? [];
    if (perfilesPermitidos.length === 0 || perfilesPermitidos.includes(perfil)) {
        return true;
    }

    router.navigate(['/auth/access']);
    return false;
};

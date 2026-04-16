import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthService } from '@auth/services/auth.service';

export const authGuard: CanActivateFn = async () => {
    const auth = inject(AuthService);

    if (auth.isLoggedIn()) {
        return true;
    }

    await auth.login();
    return false;
};

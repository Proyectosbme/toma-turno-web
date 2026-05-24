import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import Keycloak from 'keycloak-js';

export const authGuard: CanActivateFn = () => {
    const kc = inject(Keycloak);
    if (kc.authenticated) return true;
    kc.login();
    return false;
};

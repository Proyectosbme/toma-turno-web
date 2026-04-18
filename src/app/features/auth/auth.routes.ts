import { Routes } from '@angular/router';
import { Access } from './pages/access/access';
import { Error } from './pages/error/error';
import { Registro } from './pages/registro/registro';
import { noAuthGuard } from '@core/guards/no-auth.guard';

export const AUTH_ROUTES: Routes = [
    { path: 'registro', component: Registro, canActivate: [noAuthGuard] },
    { path: 'access', component: Access },
    { path: 'error', component: Error }
];

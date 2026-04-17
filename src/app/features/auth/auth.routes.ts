import { Routes } from '@angular/router';
import { Access } from './pages/access/access';
import { Error } from './pages/error/error';
import { Registro } from './pages/registro/registro';

export const AUTH_ROUTES: Routes = [
    { path: 'registro', component: Registro },
    { path: 'access', component: Access },
    { path: 'error', component: Error }
];

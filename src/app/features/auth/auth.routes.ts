import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Access } from './pages/access/access';
import { Error } from './pages/error/error';

export const AUTH_ROUTES: Routes = [
    { path: 'login', component: Login },
    { path: 'access', component: Access },
    { path: 'error', component: Error }
];

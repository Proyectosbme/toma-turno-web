import { Routes } from '@angular/router';
import { AppLayout } from './app/core/layout/component/app.layout';
import { Notfound } from './app/core/pages/notfound/notfound';
import { authGuard } from './app/core/guards/auth.guard';

export const appRoutes: Routes = [
    {
        path: '',
        component: AppLayout,
        canActivate: [authGuard],
        children: [
            {
                path: '',
                loadChildren: () => import('./app/features/home/home.routes').then(m => m.HOME_ROUTES)
            },
            {
                path: 'general',
                loadChildren: () => import('./app/features/general/general.routes').then(m => m.GENERAL_ROUTES)
            },
            {
                path: 'turnos',
                loadChildren: () => import('./app/features/turnos/turnos.routes').then(m => m.TURNOS_ROUTES)
            }
        ]
    },
    {
        path: 'auth',
        loadChildren: () => import('./app/features/auth/auth.routes').then(m => m.AUTH_ROUTES)
    },
    { path: 'notfound', component: Notfound },
    { path: '**', redirectTo: '/notfound' }
];

import { Routes } from '@angular/router';
import { TomaTurnoPage } from './pages/toma-turno/toma-turno';
import { SeleccionTurnoPage } from './pages/seleccion-turno/seleccion-turno';
import { OperadorPage } from './pages/operador/operador';
import { TurnosPasadosPage } from './pages/turnos-pasados/turnos-pasados';
import { perfilGuard } from '@core/guards/perfil.guard';

export const TURNOS_ROUTES: Routes = [
    { path: 'toma-turno',      component: TomaTurnoPage,      canActivate: [perfilGuard], data: { perfiles: ['ADMIN', 'MONITOR'] } },
    { path: 'seleccion-turno', component: SeleccionTurnoPage, canActivate: [perfilGuard], data: { perfiles: ['ADMIN', 'PUBLICO'] } },
    { path: 'operador',        component: OperadorPage,        canActivate: [perfilGuard], data: { perfiles: ['ADMIN', 'OPERADOR'] } },
    { path: 'turnos-pasados',  component: TurnosPasadosPage,  canActivate: [perfilGuard], data: { perfiles: ['ADMIN', 'OPERADOR'] } }
];

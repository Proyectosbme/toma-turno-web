import { Routes } from '@angular/router';
import { ReportesActualesPage } from './pages/reportes-actuales/reportes-actuales';
import { perfilGuard } from '@core/guards/perfil.guard';

export const REPORTES_ROUTES: Routes = [
    { path: 'reportes-actuales', component: ReportesActualesPage, canActivate: [perfilGuard], data: { perfiles: ['ADMIN', 'MONITOR'] } }
];

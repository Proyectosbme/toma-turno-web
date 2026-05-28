import { Routes } from '@angular/router';
import { ReportesActualesPage } from './pages/reportes-actuales/reportes-actuales';
import { ReportesHistoricosPage } from './pages/reportes-historicos/reportes-historicos';
import { perfilGuard } from '@core/guards/perfil.guard';

export const REPORTES_ROUTES: Routes = [
    { path: 'reportes-actuales', component: ReportesActualesPage, canActivate: [perfilGuard], data: { perfiles: ['ADMIN', 'SUBADMIN'] } },
    { path: 'reportes-historicos', component: ReportesHistoricosPage, canActivate: [perfilGuard], data: { perfiles: ['ADMIN', 'SUBADMIN'] } }
];

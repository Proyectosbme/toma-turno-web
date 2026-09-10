import { Routes } from '@angular/router';
import { MonitoreoSinAtenderPage } from './pages/sin-atender/sin-atender';
import { MonitoreoAtendidosPage } from './pages/atendidos/atendidos';
import { MonitoreoEstadisticasPage } from './pages/estadisticas/estadisticas';
import { MonitoreoTiemposMuertosPage } from './pages/tiempos-muertos/tiempos-muertos';
import { perfilGuard } from '@core/guards/perfil.guard';

export const MONITOREO_ROUTES: Routes = [
    { path: 'sin-atender',     component: MonitoreoSinAtenderPage,     canActivate: [perfilGuard], data: { perfiles: ['ADMIN', 'SUBADMIN'] } },
    { path: 'atendidos',       component: MonitoreoAtendidosPage,      canActivate: [perfilGuard], data: { perfiles: ['ADMIN', 'SUBADMIN'] } },
    { path: 'estadisticas',    component: MonitoreoEstadisticasPage,   canActivate: [perfilGuard], data: { perfiles: ['ADMIN', 'SUBADMIN'] } },
    { path: 'tiempos-muertos', component: MonitoreoTiemposMuertosPage, canActivate: [perfilGuard], data: { perfiles: ['ADMIN', 'SUBADMIN'] } }
];

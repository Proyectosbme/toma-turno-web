import { Routes } from '@angular/router';
import { ColaPage } from './pages/cola/cola';
import { Sucursal} from './pages/sucursal/sucursal';
import { PuestoPage } from './pages/puesto/puesto';
import { DetalleColaxPuestoPage } from './pages/detallecolaxpuesto/detallecolaxpuesto';
import { UsuarioPage } from './pages/usuario/usuario';
import { ConfiguracionPage } from './pages/configuracion/configuracion';
import { perfilGuard } from '@core/guards/perfil.guard';

const SOLO_ADMIN = { perfiles: ['ADMIN'] };

export const GENERAL_ROUTES: Routes = [
    { path: 'cola',               component: ColaPage,               canActivate: [perfilGuard], data: SOLO_ADMIN },
    { path: 'sucursal',           component: Sucursal,               canActivate: [perfilGuard], data: SOLO_ADMIN },
    { path: 'puesto',             component: PuestoPage,             canActivate: [perfilGuard], data: SOLO_ADMIN },
    { path: 'detallecolaxpuesto', component: DetalleColaxPuestoPage, canActivate: [perfilGuard], data: SOLO_ADMIN },
    { path: 'usuario',            component: UsuarioPage,            canActivate: [perfilGuard], data: SOLO_ADMIN },
    { path: 'configuracion',      component: ConfiguracionPage,      canActivate: [perfilGuard], data: SOLO_ADMIN }
];

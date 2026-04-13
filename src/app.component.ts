import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { BrandingService } from '@core/layout/service/branding.service';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterModule],
    template: `<router-outlet></router-outlet>`
})
export class AppComponent {
    // Inyectar aquí garantiza que BrandingService se inicialice al arrancar
    // la app y cargue logo, banner y nombre desde el backend antes de cualquier página
    private readonly branding = inject(BrandingService);
}

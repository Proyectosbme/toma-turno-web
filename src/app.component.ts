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
    private readonly branding = inject(BrandingService);

    constructor() {
        this.branding.cargar();
    }
}

import { Component, inject } from '@angular/core';
import { BrandingService } from '../../service/branding.service';

@Component({
    standalone: true,
    selector: 'app-footer',
    templateUrl: './app.footer.component.html'
})
export class AppFooter {
    readonly currentYear = new Date().getFullYear();
    readonly branding = inject(BrandingService);
}

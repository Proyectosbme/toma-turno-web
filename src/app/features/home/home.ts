import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '@auth/services/auth.service';
import { BrandingService } from '@core/layout/service/branding.service';

@Component({
    standalone: true,
    imports: [CommonModule],
    templateUrl: './home.component.html',
    styleUrl: './home.component.scss'
})
export class Home {
    constructor(
        public auth: AuthService,
        public branding: BrandingService
    ) {}
}

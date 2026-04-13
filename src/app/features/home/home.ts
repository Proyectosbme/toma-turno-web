import { Component, OnInit, ViewEncapsulation, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BrandingService } from '@core/layout/service/branding.service';
import { AuthService } from '@auth/services/auth.service';
import { UsuarioResponseDTO } from '@general/dto/usuario.dto';

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class Home implements OnInit {

    readonly branding = inject(BrandingService);
    private readonly auth = inject(AuthService);

    usuario: UsuarioResponseDTO | null = null;

    ngOnInit() {
        this.usuario = this.auth.getUsuario();
    }
}

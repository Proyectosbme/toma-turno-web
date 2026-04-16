import { Component, OnInit } from '@angular/core';
import { AuthService } from '@auth/services/auth.service';

@Component({
    selector: 'app-login',
    standalone: true,
    template: ''
})
export class Login implements OnInit {
    constructor(private readonly authService: AuthService) {}

    ngOnInit(): void {
        if (!this.authService.isLoggedIn()) {
            this.authService.login();
        }
    }
}

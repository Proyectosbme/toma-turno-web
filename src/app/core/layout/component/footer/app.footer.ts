import { Component } from '@angular/core';

@Component({
    standalone: true,
    selector: 'app-footer',
    templateUrl: './app.footer.component.html'
})
export class AppFooter {
    readonly currentYear = new Date().getFullYear();

}

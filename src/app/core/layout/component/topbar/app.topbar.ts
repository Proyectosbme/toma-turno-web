import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StyleClassModule } from 'primeng/styleclass';
import { TooltipModule } from 'primeng/tooltip';
import { LayoutService } from '../../service/layout.service';
import { UserMenuComponent } from '../user.menu.component';
import { AppBreadcrumb } from '../breadcrumb/app.breadcrumb';

@Component({
    selector: 'app-topbar',
    standalone: true,
    imports: [RouterModule, CommonModule, StyleClassModule, TooltipModule, UserMenuComponent, AppBreadcrumb],
    templateUrl: './app.topbar.component.html',
    styleUrls: ['./app.topbar.component.scss']
})
export class AppTopbar {

    constructor(public layoutService: LayoutService) {}

    toggleDarkMode() {
        this.layoutService.layoutConfig.update((state) => ({ ...state, darkTheme: !state.darkTheme }));
    }
}

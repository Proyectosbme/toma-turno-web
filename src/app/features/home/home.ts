import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common'; // Import CommonModule for ngFor
import { RouterModule } from '@angular/router'; // Import RouterModule for routerLink

interface Access {
    id: number;
    title: string;
    date: string;
    description: string;
    icon: string;
    routerLink: string[]; // Added routerLink property
}

interface SessionInfo {
    lastSessionDate: string;
    sessionDuration: string;
    terminationReason: 'logout' | 'inactivity';
}

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [CommonModule, RouterModule], // Added RouterModule
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class Home implements OnInit {

    accesses: Access[] = [];
    sessionInfo!: SessionInfo;

    ngOnInit() {
        this.sessionInfo = {
            lastSessionDate: '2025-11-24 18:00',
            sessionDuration: '45 minutos',
            terminationReason: 'logout'
        };

        this.accesses = [
            { id: 1, title: 'Dashboard', date: '2025-11-24 10:00', description: 'Acceso principal al panel de control.', icon: 'pi pi-home', routerLink: ['/'] },
        ];
    }
}

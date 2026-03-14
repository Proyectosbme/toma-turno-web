import { Injectable, signal } from '@angular/core';

const NOMBRE_KEY = 'brand_nombre';
const LOGO_KEY   = 'brand_logo';

@Injectable({ providedIn: 'root' })
export class BrandingService {

    nombreEmpresa = signal<string>(
        localStorage.getItem(NOMBRE_KEY) ?? 'Mi empresa'
    );

    logoUrl = signal<string | null>(
        localStorage.getItem(LOGO_KEY)
    );

    setNombre(nombre: string): void {
        const valor = nombre.trim() || 'Mi empresa';
        localStorage.setItem(NOMBRE_KEY, valor);
        this.nombreEmpresa.set(valor);
    }

    setLogo(dataUrl: string): void {
        localStorage.setItem(LOGO_KEY, dataUrl);
        this.logoUrl.set(dataUrl);
    }

    clearLogo(): void {
        localStorage.removeItem(LOGO_KEY);
        this.logoUrl.set(null);
    }
}

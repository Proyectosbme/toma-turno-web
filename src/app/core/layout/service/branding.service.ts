import { Injectable, signal, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';

const NOMBRE_KEY = 'brand_nombre';
const LOGO_KEY   = 'brand_logo';

@Injectable({ providedIn: 'root' })
export class BrandingService {

    private readonly titleService = inject(Title);

    nombreEmpresa = signal<string>(
        localStorage.getItem(NOMBRE_KEY) ?? 'Mi empresa'
    );

    logoUrl = signal<string | null>(
        localStorage.getItem(LOGO_KEY)
    );

    constructor() {
        // Aplicar título al cargar
        this.titleService.setTitle(this.nombreEmpresa());
    }

    setNombre(nombre: string): void {
        const valor = nombre.trim() || 'Mi empresa';
        localStorage.setItem(NOMBRE_KEY, valor);
        this.nombreEmpresa.set(valor);
        this.titleService.setTitle(valor);
    }

    setLogo(dataUrl: string): void {
        // Siempre sobreescribe la clave brand_logo — no acumula archivos
        localStorage.setItem(LOGO_KEY, dataUrl);
        this.logoUrl.set(dataUrl);
    }

    clearLogo(): void {
        localStorage.removeItem(LOGO_KEY);
        this.logoUrl.set(null);
    }
}

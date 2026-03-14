import { Injectable, signal, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';

const NOMBRE_KEY = 'brand_nombre';
const LOGO_KEY   = 'brand_logo';
const BANNER_KEY = 'brand_banner';

@Injectable({ providedIn: 'root' })
export class BrandingService {

    private readonly titleService = inject(Title);

    nombreEmpresa = signal<string>(localStorage.getItem(NOMBRE_KEY) ?? 'Mi empresa');
    logoUrl       = signal<string | null>(localStorage.getItem(LOGO_KEY));
    bannerUrl     = signal<string | null>(localStorage.getItem(BANNER_KEY));

    constructor() {
        this.titleService.setTitle(this.nombreEmpresa());
    }

    setNombre(nombre: string): void {
        const valor = nombre.trim() || 'Mi empresa';
        localStorage.setItem(NOMBRE_KEY, valor);
        this.nombreEmpresa.set(valor);
        this.titleService.setTitle(valor);
    }

    setLogo(dataUrl: string): void {
        localStorage.setItem(LOGO_KEY, dataUrl);
        this.logoUrl.set(dataUrl);
    }

    clearLogo(): void {
        localStorage.removeItem(LOGO_KEY);
        this.logoUrl.set(null);
    }

    setBanner(dataUrl: string): void {
        localStorage.setItem(BANNER_KEY, dataUrl);
        this.bannerUrl.set(dataUrl);
    }

    clearBanner(): void {
        localStorage.removeItem(BANNER_KEY);
        this.bannerUrl.set(null);
    }
}

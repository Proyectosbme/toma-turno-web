import { Injectable, signal, inject, effect } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { EmpresaApiClient } from '@general/api/empresa-api.client';
import { EmpresaResponseDTO } from '@general/dto/empresa.dto';

@Injectable({ providedIn: 'root' })
export class BrandingService {

    private readonly titleService = inject(Title);
    private readonly empresaApi   = inject(EmpresaApiClient);

    nombreEmpresa = signal<string>('Mi empresa');
    logoUrl       = signal<string | null>(null);
    bannerUrl     = signal<string | null>(null);
    cargando      = signal<boolean>(false);

    constructor() {
        effect(() => this.titleService.setTitle(this.nombreEmpresa()));
        this.cargar();
    }

    async cargar(): Promise<void> {
        try {
            const empresa = await this.empresaApi.obtener();
            this.aplicarDesdeDTO(empresa);
        } catch { /* usa defaults */ }
    }

    async setNombre(nombre: string): Promise<void> {
        await this.empresaApi.actualizarNombre(nombre.trim() || 'Mi empresa');
        this.nombreEmpresa.set(nombre.trim() || 'Mi empresa');
    }

    async setLogo(file: File): Promise<void> {
        await this.empresaApi.actualizarLogo(file);
        const prevUrl = this.logoUrl();
        if (prevUrl?.startsWith('blob:')) URL.revokeObjectURL(prevUrl);
        this.logoUrl.set(URL.createObjectURL(file));
    }

    async setBanner(file: File): Promise<void> {
        await this.empresaApi.actualizarBanner(file);
        const prevUrl = this.bannerUrl();
        if (prevUrl?.startsWith('blob:')) URL.revokeObjectURL(prevUrl);
        this.bannerUrl.set(URL.createObjectURL(file));
    }

    private aplicarDesdeDTO(dto: EmpresaResponseDTO): void {
        if (dto.nombre) this.nombreEmpresa.set(dto.nombre);

        const prevLogo   = this.logoUrl();
        const prevBanner = this.bannerUrl();

        this.logoUrl.set(dto.logo?.length     ? this.byteArrayToBlobUrl(dto.logo)   : null);
        this.bannerUrl.set(dto.banner?.length ? this.byteArrayToBlobUrl(dto.banner) : null);

        if (prevLogo?.startsWith('blob:'))   URL.revokeObjectURL(prevLogo);
        if (prevBanner?.startsWith('blob:')) URL.revokeObjectURL(prevBanner);
    }

    /**
     * Java serializa byte[] como array de enteros con signo (-128..127).
     * Convertimos a Uint8Array sumando 256 a los negativos y creamos un blob URL.
     */
    private byteArrayToBlobUrl(signedBytes: number[]): string | null {
        try {
            const bytes = new Uint8Array(signedBytes.map(b => b < 0 ? b + 256 : b));

            let mime = 'image/jpeg';
            if (bytes[0] === 0x89 && bytes[1] === 0x50) mime = 'image/png';
            else if (bytes[0] === 0x47 && bytes[1] === 0x49) mime = 'image/gif';
            else if (bytes[0] === 0x52 && bytes[1] === 0x49) mime = 'image/webp';

            return URL.createObjectURL(new Blob([bytes], { type: mime }));
        } catch (e) {
            console.error('[BrandingService] byteArrayToBlobUrl falló:', e);
            return null;
        }
    }
}

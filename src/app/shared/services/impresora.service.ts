import { Injectable } from '@angular/core';

const STORAGE_KEY = 'impresora_configurada';

@Injectable({ providedIn: 'root' })
export class ImpresoraService {

    estaConfigurada(): boolean {
        return localStorage.getItem(STORAGE_KEY) === 'true';
    }

    marcarComoConfigurada(): void {
        localStorage.setItem(STORAGE_KEY, 'true');
    }

    limpiarConfiguracion(): void {
        localStorage.removeItem(STORAGE_KEY);
    }

    imprimir(html: string): void {
        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;';
        iframe.srcdoc = html;
        document.body.appendChild(iframe);
        iframe.onload = () => {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            setTimeout(() => document.body.removeChild(iframe), 1000);
        };
    }
}

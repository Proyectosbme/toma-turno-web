import { Injectable } from '@angular/core';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import qz from 'qz-tray';
import { QZ_CERTIFICATE, QZ_PRIVATE_KEY } from './qz-credentials';

const STORAGE_KEY = 'impresora_preferida';

@Injectable({ providedIn: 'root' })
export class ImpresoraService {

    getImpresoraPreferida(): string | null {
        return localStorage.getItem(STORAGE_KEY);
    }

    setImpresoraPreferida(nombre: string): void {
        localStorage.setItem(STORAGE_KEY, nombre);
    }

    limpiarImpresora(): void {
        localStorage.removeItem(STORAGE_KEY);
    }

    /**
     * Devuelve la lista de impresoras disponibles vía QZ Tray.
     * Si QZ Tray no está corriendo lanza un error.
     */
    async obtenerImpresoras(): Promise<string[]> {
        await this.conectar();
        const impresoras: string[] = await qz.printers.find();
        return impresoras;
    }

    /**
     * Imprime el HTML dado.
     * - Si hay impresora guardada y QZ Tray está disponible → imprime silenciosamente.
     * - En cualquier otro caso → abre el diálogo del navegador (window.print).
     */
    async imprimir(html: string): Promise<void> {
        const impresoraGuardada = this.getImpresoraPreferida();

        if (impresoraGuardada) {
            try {
                await this.conectar();
                const config = qz.configs.create(impresoraGuardada);
                const data = [{ type: 'pixel', format: 'html', flavor: 'plain', data: html }];
                await qz.print(config, data);
                return;
            } catch {
                // QZ Tray no disponible o impresora desconectada → fallback
            }
        }

        this.imprimirConDialogo(html);
    }

    private imprimirConDialogo(html: string): void {
        const win = window.open('', '_blank', 'width=340,height=520,toolbar=0,menubar=0,scrollbars=0');
        if (!win) return;
        win.document.write(html);
        win.document.close();
        setTimeout(() => { win.focus(); win.print(); win.close(); }, 300);
    }

    private async conectar(): Promise<void> {
        if (qz.websocket.isActive()) return;

        qz.security.setCertificatePromise((resolve: (cert: string) => void) => {
            resolve(QZ_CERTIFICATE);
        });

        // Debe declararse antes de setSignaturePromise
        qz.security.setSignatureAlgorithm('SHA512');

        qz.security.setSignaturePromise((toSign: string) => {
            return async (resolve: (sig: string) => void, reject: (err: unknown) => void) => {
                try {
                    const sig = await this.firmar(toSign);
                    resolve(sig);
                } catch (e) {
                    reject(e);
                }
            };
        });

        await qz.websocket.connect({ retries: 2, delay: 1 });
    }

    private async firmar(mensaje: string): Promise<string> {
        // Extrae solo el contenido base64 de la llave PEM
        const pem = QZ_PRIVATE_KEY
            .replace('-----BEGIN PRIVATE KEY-----', '')
            .replace('-----END PRIVATE KEY-----', '')
            .replace(/\s/g, '');

        const keyBuffer = Uint8Array.from(atob(pem), c => c.charCodeAt(0));

        const cryptoKey = await crypto.subtle.importKey(
            'pkcs8',
            keyBuffer,
            { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-512' },
            false,
            ['sign']
        );

        const datos = new TextEncoder().encode(mensaje);
        const firma = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, datos);

        return btoa(String.fromCharCode(...new Uint8Array(firma)));
    }
}

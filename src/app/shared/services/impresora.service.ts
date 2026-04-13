import { Injectable } from '@angular/core';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import qz from 'qz-tray';

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
        const win = window.open('', '_blank', 'width=210,height=500,toolbar=0,menubar=0,scrollbars=0');
        if (!win) return;
        win.document.write(html);
        win.document.close();
        setTimeout(() => { win.focus(); win.print(); win.close(); }, 300);
    }

    private async conectar(): Promise<void> {
        if (!qz.websocket.isActive()) {
            await qz.websocket.connect({ retries: 1, delay: 0.5 });
        }
    }
}

import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { TurnoApiClient } from '@turnos/api/turno-api.client';
import { TurnoWebSocketApi } from '@turnos/api/turno-websocket.api';
import { TurnoResponseDTO } from '@turnos/dto/turno.dto';
import { AuthService } from '@auth/services/auth.service';
import { PageLayoutComponent } from '@shared/components/page-layout/page-layout.component';
import { PageTitleComponent } from '@shared/components/page-title/page-title';
import { LayoutService } from '@core/layout/service/layout.service';

interface FilaTurno {
    codigoTurno: string;
    estado: number;
    hora: string;
    nombreLlamada?: string;
}

@Component({
    selector: 'app-toma-turno',
    standalone: true,
    imports: [CommonModule, PageLayoutComponent, PageTitleComponent],
    templateUrl: './toma-turno.html',
    styleUrl: './toma-turno.scss',
})
export class TomaTurnoPage implements OnInit, OnDestroy {

    private readonly authService = inject(AuthService);
    readonly layoutService = inject(LayoutService);

    get idSucursalActual(): number {
        return this.authService.getUsuario()?.idSucursal ?? 0;
    }

    turnoDestacado: TurnoResponseDTO | null = null;
    filas: FilaTurno[] = [];

    // ── Estado audio ──
    audioActivado = false;
    readonly audioSoportado = typeof window !== 'undefined' && 'speechSynthesis' in window;

    private intervalo?: ReturnType<typeof setInterval>;
    private keepAliveIntervalo?: ReturnType<typeof setInterval>;
    private wsSubscription?: Subscription;

    // Cola de anuncios: cada ítem lleva el texto Y el turno a mostrar en pantalla
    private clavesAnunciadas = new Set<string>();
    private anuncioQueue: { text: string; turno: TurnoResponseDTO }[] = [];
    private isSpeaking = false;

    // Bloquea actualización del display 4 s después del último anuncio
    private postAnuncioTimer?: ReturnType<typeof setTimeout>;

    constructor(
        private readonly turnoApi: TurnoApiClient,
        private readonly turnoWebSocket: TurnoWebSocketApi,
    ) {}

    ngOnInit(): void {
        this.refrescar();
        this.intervalo = setInterval(() => this.refrescar(), 30000);
        this.turnoWebSocket.connect();
        this.wsSubscription = this.turnoWebSocket.mensajes.subscribe(() => this.refrescar());
    }

    /* ══════════════════════════════════════════
       Activar audio — REQUIERE gesto del usuario
    ══════════════════════════════════════════ */
    activarAudio(): void {
        if (!this.audioSoportado) return;
        const desbloqueo = new SpeechSynthesisUtterance(' ');
        desbloqueo.volume = 0;
        desbloqueo.onend = () => {
            this.audioActivado = true;
            this.iniciarKeepAlive();
            this.procesarCola();
        };
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(desbloqueo);
    }

    /* ══════════════════════════════════════════
       Keep-alive iOS Safari
    ══════════════════════════════════════════ */
    private iniciarKeepAlive(): void {
        this.keepAliveIntervalo = setInterval(() => {
            if (window.speechSynthesis.paused) window.speechSynthesis.resume();
        }, 10000);
    }

    /* ══════════════════════════════════════════
       Refrescar turnos
    ══════════════════════════════════════════ */
    private async refrescar(): Promise<void> {
        const hoy = new Date().toLocaleDateString('en-CA');

        const [llamados, finalizados] = await Promise.all([
            this.turnoApi.buscar({ idSucursal: this.idSucursalActual, estado: 2, fecha: hoy }),
            this.turnoApi.buscar({ idSucursal: this.idSucursalActual, estado: 4, fecha: hoy })
        ]).catch(() => [[], []] as [TurnoResponseDTO[], TurnoResponseDTO[]]);

        // Ordenar de más antiguo a más reciente → anunciar en ese orden
        const ordenados = [...llamados].sort((a, b) =>
            (a.fechaLlamada ?? a.fechaCreacion).localeCompare(b.fechaLlamada ?? b.fechaCreacion)
        );

        for (const turno of ordenados) {
            const clave = `${turno.codigoTurno}|${turno.fechaLlamada ?? turno.fechaCreacion}`;
            if (this.clavesAnunciadas.has(clave)) continue;
            this.clavesAnunciadas.add(clave);

            const [prefijo, numero] = turno.codigoTurno.split('-');
            const codigoHablado = numero
                ? `${prefijo} ${numero.split('').join(' ')}`
                : turno.codigoTurno.split('').join(' ');
            const destino = turno.nombreLlamada ? ` pasa a ${turno.nombreLlamada}` : '';
            this.encolarAnuncio(`Turno ${codigoHablado}${destino}`, turno);
        }

        // Solo actualizar display si no hay anuncio activo ni cooldown post-anuncio
        if (!this.isSpeaking && this.anuncioQueue.length === 0 && !this.postAnuncioTimer) {
            this.turnoDestacado = ordenados[ordenados.length - 1] ?? null;
        }

        const filaLlamados: FilaTurno[] = llamados
            .sort((a, b) => (b.fechaLlamada ?? b.fechaCreacion).localeCompare(a.fechaLlamada ?? a.fechaCreacion))
            .map(t => ({
                codigoTurno: t.codigoTurno,
                estado: t.estado,
                hora: this.hora(t.fechaLlamada ?? t.fechaCreacion),
                nombreLlamada: t.nombreLlamada
            }));

        const filaFinalizados: FilaTurno[] = finalizados
            .sort((a, b) => (b.fechaFinalizacion ?? b.fechaCreacion).localeCompare(a.fechaFinalizacion ?? a.fechaCreacion))
            .slice(0, 20)
            .map(t => ({
                codigoTurno: t.codigoTurno,
                estado: t.estado,
                hora: this.hora(t.fechaFinalizacion ?? t.fechaCreacion),
                nombreLlamada: t.nombreLlamada
            }));

        this.filas = [...filaLlamados, ...filaFinalizados];
    }

    hora(iso: string): string {
        return new Date(iso).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });
    }

    /* ══════════════════════════════════════════
       Cola de anuncios — voz + pantalla en orden
    ══════════════════════════════════════════ */
    private encolarAnuncio(text: string, turno: TurnoResponseDTO): void {
        // Hay nuevo contenido: cancelar cooldown si estaba corriendo
        if (this.postAnuncioTimer) {
            clearTimeout(this.postAnuncioTimer);
            this.postAnuncioTimer = undefined;
        }
        this.anuncioQueue.push({ text, turno });
        this.procesarCola();
    }

    private procesarCola(): void {
        // Seguridad: resetear isSpeaking si el browser terminó sin disparar onend
        if (this.isSpeaking && this.audioSoportado && !window.speechSynthesis.speaking) {
            this.isSpeaking = false;
        }

        if (this.isSpeaking || this.anuncioQueue.length === 0) return;

        const item = this.anuncioQueue.shift()!;

        // Actualizar display al inicio del anuncio (sincronizado con la voz)
        this.turnoDestacado = item.turno;

        if (!this.audioSoportado || !this.audioActivado) {
            // Sin audio: mostrar el turno 4 s y avanzar al siguiente
            this.isSpeaking = true;
            this.postAnuncioTimer = setTimeout(() => {
                this.isSpeaking = false;
                this.postAnuncioTimer = undefined;
                this.procesarCola();
            }, 4000);
            return;
        }

        const utterance = new SpeechSynthesisUtterance(item.text);
        utterance.lang = 'es-ES';
        utterance.rate = 0.9;
        utterance.volume = 1;

        const hablar = () => {
            const voices = window.speechSynthesis.getVoices();
            const voz = voices.find(v => v.lang.startsWith('es')) ?? voices[0];
            if (voz) utterance.voice = voz;

            this.isSpeaking = true;

            const siguiente = () => {
                this.isSpeaking = false;
                if (this.anuncioQueue.length === 0) {
                    // Último anuncio: cooldown 4 s — display queda fijo en este turno
                    this.postAnuncioTimer = setTimeout(() => {
                        this.postAnuncioTimer = undefined;
                    }, 4000);
                }
                this.procesarCola();
            };

            utterance.onend = siguiente;
            utterance.onerror = siguiente;
            window.speechSynthesis.speak(utterance);
        };

        if (window.speechSynthesis.getVoices().length > 0) {
            hablar();
        } else {
            window.speechSynthesis.addEventListener('voiceschanged', hablar, { once: true });
        }
    }

    ngOnDestroy(): void {
        clearInterval(this.intervalo);
        clearInterval(this.keepAliveIntervalo);
        clearTimeout(this.postAnuncioTimer);
        this.wsSubscription?.unsubscribe();
        this.turnoWebSocket.close();
        if (this.audioSoportado) window.speechSynthesis.cancel();
    }
}

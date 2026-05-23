import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { TurnoApiClient } from '@turnos/api/turno-api.client';
import { TurnoWebSocketApi } from '@turnos/api/turno-websocket.api';
import { TurnoResponseDTO, WsTurnoEvent } from '@turnos/dto/turno.dto';
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

    // ── Modo layout ──
    // true  → publicidad grande (idle)
    // false → turno grande, publicidad pequeña (llamando)
    modoLlamando = false;

    private intervalo?: ReturnType<typeof setInterval>;
    private keepAliveIntervalo?: ReturnType<typeof setInterval>;
    private wsSubscription?: Subscription;
    private fadeInterval?: ReturnType<typeof setInterval>;

    private clavesAnunciadas = new Set<string>();
    private anuncioQueue: { text: string; turno: TurnoResponseDTO }[] = [];
    private isSpeaking = false;
    private postAnuncioTimer?: ReturnType<typeof setTimeout>;

    // ── Publicidad ──
    archivosPublicidad: { url: string; tipo: 'imagen' | 'video' }[] = [];
    indicePublicidad = 0;
    private slideshowTimer?: ReturnType<typeof setTimeout>;
    private readonly DURACION_IMAGEN_MS = 6000;

    constructor(
        private readonly turnoApi: TurnoApiClient,
        private readonly turnoWebSocket: TurnoWebSocketApi,
    ) {}

    ngOnInit(): void {
        this.refrescar();
        this.intervalo = setInterval(() => this.refrescar(), 30000);
        this.turnoWebSocket.connect();
        this.wsSubscription = this.turnoWebSocket.mensajes.subscribe(e => this.aplicarEvento(e));
    }

    private aplicarEvento(evento: WsTurnoEvent): void {
        console.log('[WS] Evento recibido:', evento);
        if (evento.idSucursal !== this.idSucursalActual) return;
        switch (evento.event) {
            case 'TURNO_LLAMADO':
                if (evento.turno) this.aplicarTurnoLlamado(evento.turno);
                break;
            case 'TURNO_FINALIZADO':
                if (evento.turno) this.aplicarTurnoFinalizado(evento.turno);
                break;
            case 'TURNO_SIN_ATENDER':
                if (evento.turno) this.aplicarTurnoSinAtender(evento.turno);
                break;
        }
    }

    private aplicarTurnoLlamado(turno: TurnoResponseDTO): void {
        const clave = `${turno.codigoTurno}|${turno.fechaLlamada ?? turno.fechaCreacion}`;
        const nuevaFila = {
            codigoTurno: turno.codigoTurno,
            estado: turno.estado,
            hora: this.hora(turno.fechaLlamada ?? turno.fechaCreacion),
            nombreLlamada: turno.nombreLlamada,
        };
        const sinEste = this.filas.filter(f => f.codigoTurno !== turno.codigoTurno);
        this.filas = [nuevaFila, ...sinEste.filter(f => f.estado === 2), ...sinEste.filter(f => f.estado === 4)];

        if (!this.clavesAnunciadas.has(clave)) {
            this.clavesAnunciadas.add(clave);
            const [prefijo, numero] = turno.codigoTurno.split('-');
            const codigoHablado = numero
                ? `${prefijo} ${numero.split('').join(' ')}`
                : turno.codigoTurno.split('').join(' ');
            const destino = turno.nombreLlamada ? `, pasa a ${turno.nombreLlamada}` : '';
            this.encolarAnuncio(`Turno ${codigoHablado}${destino}`, turno);
        }

        if (!this.isSpeaking && this.anuncioQueue.length === 0 && !this.postAnuncioTimer) {
            this.turnoDestacado = turno;
        }
    }

    private aplicarTurnoFinalizado(turno: TurnoResponseDTO): void {
        const filaFinalizado = {
            codigoTurno: turno.codigoTurno,
            estado: turno.estado,
            hora: this.hora(turno.fechaFinalizacion ?? turno.fechaCreacion),
            nombreLlamada: turno.nombreLlamada,
        };
        const sinEste = this.filas.filter(f => f.codigoTurno !== turno.codigoTurno);
        const finalizados = [filaFinalizado, ...sinEste.filter(f => f.estado === 4)].slice(0, 20);
        this.filas = [...sinEste.filter(f => f.estado === 2), ...finalizados];
    }

    private aplicarTurnoSinAtender(turno: TurnoResponseDTO): void {
        this.filas = this.filas.filter(f => f.codigoTurno !== turno.codigoTurno);
        if (this.turnoDestacado?.codigoTurno === turno.codigoTurno) {
            this.turnoDestacado = null;
        }
    }

    /* ══════════════════════════════════════════
       Activar audio
    ══════════════════════════════════════════ */
    activarAudio(): void {
        if (!this.audioSoportado) return;
        const desbloqueo = new SpeechSynthesisUtterance(' ');
        desbloqueo.volume = 0;
        desbloqueo.onend = () => {
            this.audioActivado = true;
            this.iniciarKeepAlive();
            // Activar audio del video si hay uno reproduciéndose
            this.setVolumenVideo(this.modoLlamando ? 0 : 1, 500);
            this.procesarCola();
        };
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(desbloqueo);
    }

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

        // Fetch llamados primero — ruta crítica para display y anuncio
        const llamados = await this.turnoApi
            .buscar({ idSucursal: this.idSucursalActual, estado: 2, fecha: hoy })
            .catch(() => [] as TurnoResponseDTO[]);
        console.log('[HTTP] Turnos llamados (estado 2):', llamados);

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
            console.log('[TTS]', `Turno ${codigoHablado}${destino}`, '| nombreLlamada:', turno.nombreLlamada);
            this.encolarAnuncio(`Turno ${codigoHablado}${destino}`, turno);
        }

        if (!this.isSpeaking && this.anuncioQueue.length === 0 && !this.postAnuncioTimer) {
            this.turnoDestacado = ordenados[ordenados.length - 1] ?? null;
        }

        const filaLlamados: FilaTurno[] = [...llamados]
            .sort((a, b) => (b.fechaLlamada ?? b.fechaCreacion).localeCompare(a.fechaLlamada ?? a.fechaCreacion))
            .map(t => ({
                codigoTurno: t.codigoTurno,
                estado: t.estado,
                hora: this.hora(t.fechaLlamada ?? t.fechaCreacion),
                nombreLlamada: t.nombreLlamada
            }));

        // Actualizar filas con llamados ya disponibles; conservar finalizados actuales
        this.filas = [...filaLlamados, ...this.filas.filter(f => f.estado === 4)];

        // Fetch finalizados en segundo plano — no bloquea el display ni el anuncio
        this.turnoApi.buscar({ idSucursal: this.idSucursalActual, estado: 4, fecha: hoy })
            .then(finalizados => {
                console.log('[HTTP] Turnos finalizados (estado 4):', finalizados);
                const filaFinalizados: FilaTurno[] = finalizados
                    .sort((a, b) => (b.fechaFinalizacion ?? b.fechaCreacion).localeCompare(a.fechaFinalizacion ?? a.fechaCreacion))
                    .slice(0, 20)
                    .map(t => ({
                        codigoTurno: t.codigoTurno,
                        estado: t.estado,
                        hora: this.hora(t.fechaFinalizacion ?? t.fechaCreacion),
                        nombreLlamada: t.nombreLlamada
                    }));
                this.filas = [...this.filas.filter(f => f.estado !== 4), ...filaFinalizados];
            })
            .catch(() => {});
    }

    hora(iso: string): string {
        return new Date(iso).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });
    }

    /* ══════════════════════════════════════════
       Cola de anuncios
    ══════════════════════════════════════════ */
    private encolarAnuncio(text: string, turno: TurnoResponseDTO): void {
        if (this.postAnuncioTimer) {
            clearTimeout(this.postAnuncioTimer);
            this.postAnuncioTimer = undefined;
        }
        this.anuncioQueue.push({ text, turno });
        this.procesarCola();
    }

    private procesarCola(): void {
        if (this.isSpeaking && this.audioSoportado && !window.speechSynthesis.speaking) {
            this.isSpeaking = false;
        }
        if (this.isSpeaking || this.anuncioQueue.length === 0) return;

        const item = this.anuncioQueue.shift()!;
        this.turnoDestacado = item.turno;

        // Activar modo llamando: publicidad se achica, volumen baja
        if (!this.modoLlamando) {
            this.modoLlamando = true;
            if (this.audioActivado) this.setVolumenVideo(0, 700);
        }

        if (!this.audioSoportado || !this.audioActivado) {
            this.isSpeaking = true;
            this.postAnuncioTimer = setTimeout(() => {
                this.isSpeaking = false;
                this.postAnuncioTimer = undefined;
                this.volverAIdle();
                this.procesarCola();
            }, 0);
            return;
        }

        // Silencio al final para que el anticorte no corte la última sílaba real
        const utterance = new SpeechSynthesisUtterance(item.text + ' .');
        utterance.lang = 'es-MX';
        utterance.rate = 0.9;
        utterance.volume = 1;

        const hablar = () => {
            const voices = window.speechSynthesis.getVoices();
            const esFemenina = (v: SpeechSynthesisVoice) =>
                /female|mujer|paulina|sabina|monica|esperanza|angelica/i.test(v.name);
            const voz =
                voices.find(v => v.lang === 'es-MX' && esFemenina(v)) ??
                voices.find(v => v.lang.startsWith('es') && esFemenina(v)) ??
                voices.find(v => v.lang === 'es-MX') ??
                voices.find(v => v.lang.startsWith('es')) ??
                voices[0];
            if (voz) utterance.voice = voz;

            this.isSpeaking = true;

            // Chrome en HTTPS corta el TTS después de ~15s; pausar/resumir cada 10s lo previene
            // Intervalo largo para no cortar sílabas en anuncios cortos
            const anticorte = setInterval(() => {
                if (!window.speechSynthesis.speaking) { clearInterval(anticorte); return; }
                window.speechSynthesis.pause();
                window.speechSynthesis.resume();
            }, 10000);

            const siguiente = () => {
                clearInterval(anticorte);
                this.isSpeaking = false;
                if (this.anuncioQueue.length === 0) {
                    this.postAnuncioTimer = setTimeout(() => {
                        this.postAnuncioTimer = undefined;
                        this.volverAIdle();
                    }, 0);
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

    private volverAIdle(): void {
        this.modoLlamando = false;
        if (this.audioActivado) this.setVolumenVideo(1, 1000);
    }

    /* ══════════════════════════════════════════
       Control de volumen del video
    ══════════════════════════════════════════ */
    private setVolumenVideo(objetivo: number, duracionMs: number): void {
        const video = document.querySelector<HTMLVideoElement>('.panel-publicidad video');
        if (!video) return;

        // Asegurarse de que el video no está muted para poder controlar el volumen
        video.muted = false;

        if (this.fadeInterval) clearInterval(this.fadeInterval);

        const inicio = video.volume;
        const pasos = 20;
        const delta = (objetivo - inicio) / pasos;
        let paso = 0;

        this.fadeInterval = setInterval(() => {
            const v = document.querySelector<HTMLVideoElement>('.panel-publicidad video');
            if (!v) { clearInterval(this.fadeInterval); return; }
            paso++;
            v.volume = Math.max(0, Math.min(1, v.volume + delta));
            if (paso >= pasos) clearInterval(this.fadeInterval);
        }, duracionMs / pasos);
    }

    /* ══════════════════════════════════════════
       Publicidad
    ══════════════════════════════════════════ */
    get archivoActual(): { url: string; tipo: 'imagen' | 'video' } | null {
        return this.archivosPublicidad[this.indicePublicidad] ?? null;
    }

    seleccionarCarpeta(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (!input.files?.length) return;

        this.archivosPublicidad.forEach(a => URL.revokeObjectURL(a.url));
        this.archivosPublicidad = [];
        clearTimeout(this.slideshowTimer);

        const extImagen = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
        const extVideo  = ['mp4', 'webm'];

        const filtrados = Array.from(input.files)
            .filter(f => {
                const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
                return extImagen.includes(ext) || extVideo.includes(ext);
            })
            .sort((a, b) => a.name.localeCompare(b.name));

        this.archivosPublicidad = filtrados.map(f => {
            const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
            return { url: URL.createObjectURL(f), tipo: extVideo.includes(ext) ? 'video' : 'imagen' };
        });

        this.indicePublicidad = 0;
        this.iniciarSlide();
        input.value = '';
    }

    private iniciarSlide(): void {
        clearTimeout(this.slideshowTimer);
        if (this.archivoActual?.tipo === 'imagen') {
            this.slideshowTimer = setTimeout(() => this.siguienteSlide(), this.DURACION_IMAGEN_MS);
        }
    }

    siguienteSlide(): void {
        if (!this.archivosPublicidad.length) return;
        this.indicePublicidad = (this.indicePublicidad + 1) % this.archivosPublicidad.length;
        this.iniciarSlide();
        // Restaurar volumen en el nuevo video si está en modo idle
        if (this.audioActivado && !this.modoLlamando) {
            setTimeout(() => this.setVolumenVideo(1, 300), 100);
        }
    }

    ngOnDestroy(): void {
        clearInterval(this.intervalo);
        clearInterval(this.keepAliveIntervalo);
        clearInterval(this.fadeInterval);
        clearTimeout(this.postAnuncioTimer);
        clearTimeout(this.slideshowTimer);
        this.archivosPublicidad.forEach(a => URL.revokeObjectURL(a.url));
        this.wsSubscription?.unsubscribe();
        this.turnoWebSocket.close();
        if (this.audioSoportado) window.speechSynthesis.cancel();
    }
}

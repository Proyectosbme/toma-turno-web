import { Component, OnInit, inject, OnDestroy, NgZone, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { TurnoApiClient } from '@turnos/api/turno-api.client';
import { TurnoWebSocketApi } from '@turnos/api/turno-websocket.api';
import { TurnoResponseDTO, WsTurnoEvent } from '@turnos/dto/turno.dto';
import { AuthService } from '@auth/services/auth.service';
import { PageLayoutComponent } from '@shared/components/page-layout/page-layout.component';
import { PageTitleComponent } from '@shared/components/page-title/page-title';
import { LayoutService } from '@core/layout/service/layout.service';
import { BrandingService } from '@core/layout/service/branding.service';

interface FilaTurno {
    codigoTurno: string;
    estado: number;
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
    private readonly ngZone      = inject(NgZone);
    readonly layoutService = inject(LayoutService);
    readonly branding      = inject(BrandingService);

    get idSucursalActual(): number {
        return this.authService.getUsuario()?.idSucursal ?? 0;
    }

    @ViewChild('videoPublicidad') videoPublicidadRef?: ElementRef<HTMLVideoElement>;

    turnoDestacado: TurnoResponseDTO | null = null;
    filas: FilaTurno[] = [];

    // ── Estado audio ──
    audioActivado = false;
    readonly audioSoportado = typeof window !== 'undefined' && 'speechSynthesis' in window;

    // Distinto de audioActivado (que es solo para la voz TTS de los llamados): se activa también
    // con el primer gesto sobre el control de volumen de publicidad, para no exigir "Activar
    // sonido" (pensado para la voz) como requisito de un control que en realidad es independiente.
    private volumenDesbloqueado = false;

    // ── Modo layout ──
    // true  → publicidad grande (idle)
    // false → turno grande, publicidad pequeña (llamando)
    modoLlamando = false;

    private keepAliveIntervalo?: ReturnType<typeof setInterval>;
    private keepAliveSesionIntervalo?: ReturnType<typeof setInterval>;
    private wsSubscription?: Subscription;
    private conectadoSubscription?: Subscription;
    private fadeInterval?: ReturnType<typeof setInterval>;

    // Último fechaLlamada (epoch ms) anunciado por turno.id. Se usa el id en vez de codigoTurno
    // porque el código se reutiliza entre turnos distintos; el id de fila es estable siempre.
    // Se compara con tolerancia porque el mismo instante puede llegar con formato/precisión
    // distinta según la fuente (push por WebSocket vs. resync HTTP al reconectar) — comparar el
    // string crudo (o incluso el segundo exacto) hacía que un turno ya anunciado se detectara
    // como "nuevo" y se repitiera solo, sin que el operador volviera a llamarlo.
    private ultimoLlamadoPorId = new Map<number, number>();
    private readonly TOLERANCIA_MS = 1500;
    private anuncioQueue: { text: string; turno: TurnoResponseDTO }[] = [];
    private isSpeaking = false;
    private esperandoVoces = false;
    private postAnuncioTimer?: ReturnType<typeof setTimeout>;

    // ── Publicidad ──
    archivosPublicidad: { url: string; tipo: 'imagen' | 'video' }[] = [];
    indicePublicidad = 0;
    private slideshowTimer?: ReturnType<typeof setTimeout>;
    private readonly DURACION_IMAGEN_MS = 6000;

    // Esta pantalla (TV) recuerda su propia carpeta de publicidad — a propósito NO se guarda
    // en el backend por sucursal: dos TVs en pasillos distintos pueden compartir usuario/sucursal
    // pero mostrar publicidad diferente, y guardarlo del lado del servidor haría que una
    // sobrescribiera la carpeta de la otra. Por eso vive en IndexedDB de este navegador/equipo.
    readonly soportaCarpetaPersistente = typeof window !== 'undefined' && 'showDirectoryPicker' in window;
    mostrarPreguntaGuardarCarpeta = false;
    private handlePendienteCarpeta?: FileSystemDirectoryHandle;

    // Chrome no recuerda el permiso de lectura entre reinicios del navegador (por seguridad),
    // así que al volver a cargar puede pedir confirmarlo de nuevo. En vez de mandar a buscar
    // la carpeta otra vez en el explorador, se deja un botón de un clic que solo re-autoriza
    // el mismo handle ya guardado (requestPermission), sin volver a navegar carpetas.
    handlePendientePermiso?: FileSystemDirectoryHandle;
    private readonly DB_PUBLICIDAD = 'tomaturno_publicidad';
    private readonly STORE_PUBLICIDAD = 'handles';

    // ── Volumen de la publicidad (independiente del volumen de los llamados) ──
    private readonly VOLUMEN_PUBLICIDAD_KEY = 'tomaturno_volumenPublicidad';
    volumenPublicidad = this.cargarVolumenPublicidad();

    constructor(
        private readonly turnoApi: TurnoApiClient,
        private readonly turnoWebSocket: TurnoWebSocketApi,
    ) {}

    ngOnInit(): void {
        // Los turnos viajan por WebSocket de forma continua mientras la conexión esté viva.
        // refrescar() por HTTP ya no es un polling: se llama una vez ahora (para no depender del
        // handshake del socket si tarda o falla) y de nuevo cada vez que el socket se (re)conecta
        // (cubre reconexiones tras un corte de red). Nunca por temporizador ciego.
        this.refrescar();
        this.turnoWebSocket.connect();
        this.wsSubscription = this.turnoWebSocket.mensajes.subscribe(e => this.aplicarEvento(e));
        this.conectadoSubscription = this.turnoWebSocket.conectado.subscribe(() => this.refrescar());

        // Esta pantalla nadie la toca (TV/monitor sin interacción humana). Sin esto,
        // keycloak-angular la desloguea por "inactividad" (ver withAutoRefreshToken en app.config.ts),
        // aunque esté funcionando normalmente. Simulamos actividad periódica para evitarlo.
        this.keepAliveSesionIntervalo = setInterval(() => {
            window.dispatchEvent(new Event('mousemove'));
        }, 5 * 60 * 1000);

        this.restaurarCarpetaGuardada();
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
            case 'TURNO_EN_ESPERA':
                if (evento.turno) this.aplicarTurnoEnEspera(evento.turno);
                break;
            case 'TURNO_TRASLADO':
                if (evento.turno) this.aplicarTurnoTrasladado(evento.turno);
                break;
        }
    }

    private aplicarTurnoLlamado(turno: TurnoResponseDTO): void {
        const nuevaFila: FilaTurno = {
            codigoTurno: turno.codigoTurno,
            estado: turno.estado,
            nombreLlamada: turno.nombreLlamada,
        };
        const sinEste = this.filas.filter(f => f.codigoTurno !== turno.codigoTurno);
        this.filas = [nuevaFila, ...sinEste];

        if (this.esLlamadaNueva(turno)) {
            const codigoHablado = this.formatearCodigoHablado(turno.codigoTurno);
            const destino = turno.nombreLlamada ? `, pasa a ${turno.nombreLlamada}` : '';
            this.encolarAnuncio(`Turno ${codigoHablado}${destino}`, turno);
        }

        if (!this.isSpeaking && this.anuncioQueue.length === 0 && !this.postAnuncioTimer) {
            this.turnoDestacado = turno;
        }
    }

    private aplicarTurnoFinalizado(turno: TurnoResponseDTO): void {
        this.filas = this.filas.filter(f => f.codigoTurno !== turno.codigoTurno);
    }

    private aplicarTurnoSinAtender(turno: TurnoResponseDTO): void {
        this.filas = this.filas.filter(f => f.codigoTurno !== turno.codigoTurno);
        if (this.turnoDestacado?.codigoTurno === turno.codigoTurno) {
            this.turnoDestacado = null;
        }
    }

    private aplicarTurnoEnEspera(turno: TurnoResponseDTO): void {
        this.filas = this.filas.filter(f => f.codigoTurno !== turno.codigoTurno);
        if (this.turnoDestacado?.codigoTurno === turno.codigoTurno) {
            this.turnoDestacado = null;
        }
    }

    private aplicarTurnoTrasladado(turno: TurnoResponseDTO): void {
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
            this.volumenDesbloqueado = true;
            this.iniciarKeepAlive();
            // Activar audio del video si hay uno reproduciéndose
            this.setVolumenVideo(this.modoLlamando ? 0 : this.volumenPublicidad, 500);
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
            if (!this.esLlamadaNueva(turno)) continue;

            const codigoHablado = this.formatearCodigoHablado(turno.codigoTurno);
            const destino = turno.nombreLlamada ? ` pasa a ${turno.nombreLlamada}` : '';
            console.log('[TTS]', `Turno ${codigoHablado}${destino}`, '| nombreLlamada:', turno.nombreLlamada);
            this.encolarAnuncio(`Turno ${codigoHablado}${destino}`, turno);
        }

        if (!this.isSpeaking && this.anuncioQueue.length === 0 && !this.postAnuncioTimer) {
            this.turnoDestacado = ordenados[ordenados.length - 1] ?? null;
        }

        this.filas = [...llamados]
            .sort((a, b) => (b.fechaLlamada ?? b.fechaCreacion).localeCompare(a.fechaLlamada ?? a.fechaCreacion))
            .map(t => ({
                codigoTurno: t.codigoTurno,
                estado: t.estado,
                nombreLlamada: t.nombreLlamada
            }));
    }

    hora(iso: string): string {
        return new Date(iso).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });
    }

    // true si esta llamada es más nueva que la última anunciada para este turno.id (marca la
    // llamada como vista si lo es). El id identifica al turno de forma estable —a diferencia de
    // codigoTurno, que se reutiliza entre turnos distintos— y la tolerancia absorbe diferencias
    // de formato/precisión de fecha entre WebSocket y el resync HTTP de refrescar().
    private esLlamadaNueva(turno: TurnoResponseDTO): boolean {
        const fecha = turno.fechaLlamada ?? turno.fechaCreacion;
        const ms = new Date(fecha).getTime();
        const anterior = this.ultimoLlamadoPorId.get(turno.id);
        if (anterior != null && Math.abs(ms - anterior) < this.TOLERANCIA_MS) return false;
        this.ultimoLlamadoPorId.set(turno.id, ms);
        return true;
    }

    // Quita ceros a la izquierda y dice el número completo (ej. "028" → "28", no "cero dos ocho").
    // El prefijo se deletrea letra por letra (ej. "AT" → "A T") porque, pegado, el motor de voz
    // en es-MX lo lee como una sílaba y se mezcla con el número siguiente (suena a "atuno").
    private formatearCodigoHablado(codigoTurno: string): string {
        const [prefijo, numero] = codigoTurno.split('-');
        if (!numero) return codigoTurno.split('').join(' ');
        // La coma fuerza una pequeña pausa entre el prefijo y el número.
        return `${prefijo.split('').join(' ')}, ${parseInt(numero, 10)}`;
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
        if (this.isSpeaking && !this.esperandoVoces && this.audioSoportado && !window.speechSynthesis.speaking) {
            this.isSpeaking = false;
        }
        if (this.isSpeaking || this.anuncioQueue.length === 0) return;

        const item = this.anuncioQueue.shift()!;
        this.turnoDestacado = item.turno;
        // Se reserva aquí mismo, no dentro de hablar(): si las voces del navegador
        // tardan en cargar (voiceschanged async), evita que lleguen más llamados y
        // adelanten la cola —desincronizando imagen y voz— mientras se espera.
        this.isSpeaking = true;

        // Activar modo llamando: publicidad se achica, volumen baja
        if (!this.modoLlamando) {
            this.modoLlamando = true;
            if (this.volumenDesbloqueado) this.setVolumenVideo(0, 700);
        }

        if (!this.audioSoportado || !this.audioActivado) {
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
        utterance.rate = 0.65;
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

            // Chrome en HTTPS corta el TTS después de ~15s; pausar/resumir cada 10s lo previene
            // Intervalo largo para no cortar sílabas en anuncios cortos
            const anticorte = setInterval(() => {
                if (!window.speechSynthesis.speaking) { clearInterval(anticorte); return; }
                window.speechSynthesis.pause();
                window.speechSynthesis.resume();
            }, 10000);

            // onend/onerror de SpeechSynthesisUtterance corren fuera de la zona de Angular
            // (zone.js no los parchea como sí hace con WebSocket/setTimeout), así que sin
            // ngZone.run() el cambio de turnoDestacado no dispara un repintado inmediato.
            const siguiente = () => this.ngZone.run(() => {
                clearInterval(anticorte);
                this.isSpeaking = false;
                if (this.anuncioQueue.length === 0) {
                    this.postAnuncioTimer = setTimeout(() => {
                        this.postAnuncioTimer = undefined;
                        this.volverAIdle();
                    }, 0);
                }
                this.procesarCola();
            });

            utterance.onend = siguiente;
            utterance.onerror = siguiente;
            window.speechSynthesis.speak(utterance);
        };

        if (window.speechSynthesis.getVoices().length > 0) {
            hablar();
        } else {
            this.esperandoVoces = true;
            window.speechSynthesis.addEventListener('voiceschanged', () => this.ngZone.run(() => {
                this.esperandoVoces = false;
                hablar();
            }), { once: true });
        }
    }

    private volverAIdle(): void {
        this.modoLlamando = false;
        if (this.volumenDesbloqueado) this.setVolumenVideo(this.volumenPublicidad, 1000);
    }

    /* ══════════════════════════════════════════
       Control de volumen del video
    ══════════════════════════════════════════ */
    private cargarVolumenPublicidad(): number {
        if (typeof window === 'undefined') return 1;
        const guardado = parseFloat(localStorage.getItem(this.VOLUMEN_PUBLICIDAD_KEY) ?? '1');
        return Number.isFinite(guardado) ? Math.min(1, Math.max(0, guardado)) : 1;
    }

    // Cambia el volumen objetivo de la publicidad sin afectar la voz de los llamados.
    // No depende de audioActivado: mover el control es en sí mismo un gesto del usuario, así
    // que el navegador permite des-mutear/ajustar el volumen aquí aunque nadie haya presionado
    // "Activar sonido" (ese botón solo desbloquea la voz de los llamados por TTS).
    cambiarVolumenPublicidad(valor: number): void {
        this.volumenPublicidad = valor;
        this.volumenDesbloqueado = true;
        if (typeof window !== 'undefined') localStorage.setItem(this.VOLUMEN_PUBLICIDAD_KEY, String(valor));
        if (!this.modoLlamando) this.setVolumenVideo(valor, 200);
    }

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

    /** Fallback para navegadores sin File System Access API: selección de una sola vez, sin persistencia. */
    seleccionarCarpeta(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (!input.files?.length) return;

        const extImagen = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
        const extVideo  = ['mp4', 'webm'];

        const filtrados = Array.from(input.files)
            .filter(f => {
                const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
                return extImagen.includes(ext) || extVideo.includes(ext);
            })
            .sort((a, b) => a.name.localeCompare(b.name));

        const archivos: { url: string; tipo: 'imagen' | 'video' }[] = filtrados.map(f => {
            const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
            return { url: URL.createObjectURL(f), tipo: extVideo.includes(ext) ? 'video' : 'imagen' };
        });

        this.reemplazarPublicidad(archivos);
        input.value = '';
    }

    /** Abre el selector de carpeta persistente (Chromium). Al elegir una carpeta, pregunta si guardarla. */
    async elegirCarpetaPublicidad(): Promise<void> {
        let handle: FileSystemDirectoryHandle;
        try {
            handle = await window.showDirectoryPicker({ id: 'publicidad', mode: 'read' });
        } catch {
            return; // el usuario cerró el diálogo sin elegir nada
        }
        this.handlePendientePermiso = undefined;
        this.handlePendienteCarpeta = handle;
        this.mostrarPreguntaGuardarCarpeta = true;
    }

    /** Responde la pregunta "¿Guardar esta carpeta en esta pantalla, o usarla solo por ahora?" */
    async confirmarPreguntaCarpeta(guardar: boolean): Promise<void> {
        const handle = this.handlePendienteCarpeta;
        this.mostrarPreguntaGuardarCarpeta = false;
        this.handlePendienteCarpeta = undefined;
        if (!handle) return;

        if (guardar) {
            await this.guardarHandleCarpeta(handle).catch(() => {});
        } else {
            // Temporal: si había una carpeta guardada de antes, no se toca —solo se usa esta
            // carpeta para la sesión actual, sin reemplazar lo que ya está guardado en este equipo.
        }
        await this.cargarArchivosDesdeCarpeta(handle);
    }

    /** Al iniciar: intenta recargar en silencio la carpeta que esta pantalla tenía guardada. */
    private async restaurarCarpetaGuardada(): Promise<void> {
        if (!this.soportaCarpetaPersistente) return;
        try {
            const handle = await this.obtenerHandleGuardado();
            if (!handle) return;

            const permiso = await handle.queryPermission({ mode: 'read' });
            if (permiso === 'granted') {
                await this.cargarArchivosDesdeCarpeta(handle);
                return;
            }
            // Sin gesto del usuario (recién cargó la página) el navegador no deja pedir permiso
            // todavía. Se deja el handle listo para que un solo clic en "Permitir" lo reautorice
            // —sin volver a navegar carpetas— en vez de forzar a re-seleccionarla desde cero.
            this.handlePendientePermiso = handle;
        } catch {
            // Carpeta guardada que ya no existe en este equipo (ej. PC nueva/reinstalada):
            // se descarta en silencio, sin error, y la pantalla queda como si nunca se
            // hubiera guardado nada — solo pedirá seleccionar una carpeta de nuevo.
            await this.borrarHandleGuardado().catch(() => {});
        }
    }

    /** Un solo clic para re-autorizar la carpeta ya guardada (sin volver a buscarla en el explorador). */
    async permitirCarpetaGuardada(): Promise<void> {
        const handle = this.handlePendientePermiso;
        if (!handle) return;
        try {
            const permiso = await handle.requestPermission({ mode: 'read' });
            if (permiso !== 'granted') return; // el usuario lo negó; el botón queda para reintentar
            this.handlePendientePermiso = undefined;
            await this.cargarArchivosDesdeCarpeta(handle);
        } catch {
            // El handle ya no es válido en este equipo: se descarta y se vuelve al estado inicial.
            this.handlePendientePermiso = undefined;
            await this.borrarHandleGuardado().catch(() => {});
        }
    }

    private async cargarArchivosDesdeCarpeta(handle: FileSystemDirectoryHandle): Promise<void> {
        const extImagen = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
        const extVideo  = ['mp4', 'webm'];
        const encontrados: { nombre: string; file: File; tipo: 'imagen' | 'video' }[] = [];

        for await (const entrada of handle.values()) {
            if (entrada.kind !== 'file') continue;
            const ext = entrada.name.split('.').pop()?.toLowerCase() ?? '';
            if (!extImagen.includes(ext) && !extVideo.includes(ext)) continue;
            const file = await (entrada as FileSystemFileHandle).getFile();
            encontrados.push({ nombre: entrada.name, file, tipo: extVideo.includes(ext) ? 'video' : 'imagen' });
        }
        encontrados.sort((a, b) => a.nombre.localeCompare(b.nombre));

        this.reemplazarPublicidad(encontrados.map(e => ({ url: URL.createObjectURL(e.file), tipo: e.tipo })));
    }

    private reemplazarPublicidad(archivos: { url: string; tipo: 'imagen' | 'video' }[]): void {
        this.archivosPublicidad.forEach(a => URL.revokeObjectURL(a.url));
        clearTimeout(this.slideshowTimer);
        this.archivosPublicidad = archivos;
        this.indicePublicidad = 0;
        this.iniciarSlide();
    }

    /* ── Persistencia de la carpeta (IndexedDB, local a este equipo/navegador) ── */

    private get claveHandleCarpeta(): string {
        return `sucursal_${this.idSucursalActual}`;
    }

    private abrirDbPublicidad(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(this.DB_PUBLICIDAD, 1);
            req.onupgradeneeded = () => req.result.createObjectStore(this.STORE_PUBLICIDAD);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    private async guardarHandleCarpeta(handle: FileSystemDirectoryHandle): Promise<void> {
        const db = await this.abrirDbPublicidad();
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(this.STORE_PUBLICIDAD, 'readwrite');
            tx.objectStore(this.STORE_PUBLICIDAD).put(handle, this.claveHandleCarpeta);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    private async obtenerHandleGuardado(): Promise<FileSystemDirectoryHandle | null> {
        const db = await this.abrirDbPublicidad();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.STORE_PUBLICIDAD, 'readonly');
            const req = tx.objectStore(this.STORE_PUBLICIDAD).get(this.claveHandleCarpeta);
            req.onsuccess = () => resolve(req.result ?? null);
            req.onerror = () => reject(req.error);
        });
    }

    private async borrarHandleGuardado(): Promise<void> {
        const db = await this.abrirDbPublicidad();
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(this.STORE_PUBLICIDAD, 'readwrite');
            tx.objectStore(this.STORE_PUBLICIDAD).delete(this.claveHandleCarpeta);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    private iniciarSlide(): void {
        clearTimeout(this.slideshowTimer);
        if (this.archivoActual?.tipo === 'imagen') {
            this.slideshowTimer = setTimeout(() => this.siguienteSlide(), this.DURACION_IMAGEN_MS);
        } else if (this.archivoActual?.tipo === 'video') {
            // Si el índice vuelve a un archivo con la misma URL ya mostrada (única publicidad
            // en video, o se repite el ciclo), Angular no reasigna [src] al no detectar cambio,
            // y el navegador se queda en el último frame en vez de reiniciar solo.
            setTimeout(() => {
                const video = this.videoPublicidadRef?.nativeElement;
                if (!video) return;
                video.currentTime = 0;
                video.play().catch(() => {});
            });
        }
    }

    siguienteSlide(): void {
        if (!this.archivosPublicidad.length) return;
        this.indicePublicidad = (this.indicePublicidad + 1) % this.archivosPublicidad.length;
        this.iniciarSlide();
        // Restaurar volumen en el nuevo video si está en modo idle
        if (this.volumenDesbloqueado && !this.modoLlamando) {
            setTimeout(() => this.setVolumenVideo(this.volumenPublicidad, 300), 100);
        }
    }

    ngOnDestroy(): void {
        clearInterval(this.keepAliveIntervalo);
        clearInterval(this.keepAliveSesionIntervalo);
        clearInterval(this.fadeInterval);
        clearTimeout(this.postAnuncioTimer);
        clearTimeout(this.slideshowTimer);
        this.archivosPublicidad.forEach(a => URL.revokeObjectURL(a.url));
        this.wsSubscription?.unsubscribe();
        this.conectadoSubscription?.unsubscribe();
        this.turnoWebSocket.close();
        if (this.audioSoportado) window.speechSynthesis.cancel();
    }
}

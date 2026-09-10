import { Component, OnInit, OnDestroy, inject, effect } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { ChartModule } from 'primeng/chart';
import { MessageService } from 'primeng/api';
import { AuthService } from '@auth/services/auth.service';
import { TiempoMuertoApiClient } from '@turnos/api/tiempo-muerto-api.client';
import { TurnoWebSocketApi } from '@turnos/api/turno-websocket.api';
import { TiempoMuertoResponseDTO } from '@turnos/dto/tiempomuerto.dto';
import { extraerMensajeError } from '@shared/utils/error.util';
import { PageLayoutComponent } from '@shared/components/page-layout/page-layout.component';
import { PageTitleComponent } from '@shared/components/page-title/page-title';
import { LayoutService } from '@core/layout/service/layout.service';

interface FilaActivo {
    clave: number | string;
    nombre: string;
    minutosActivo: number;
}

interface FilaDescanso {
    clave: number | string;
    nombre: string;
    banioMin: number;
    comidaMin: number;
    tramitesContablesMin: number;
    otroMin: number;
    totalMin: number;
}

@Component({
    selector: 'app-monitoreo-tiempos-muertos',
    standalone: true,
    imports: [
        CommonModule,
        ButtonModule,
        ToastModule,
        ChartModule,
        PageLayoutComponent,
        PageTitleComponent
    ],
    providers: [MessageService],
    templateUrl: './tiempos-muertos.html',
    styleUrl: './tiempos-muertos.scss'
})
export class MonitoreoTiemposMuertosPage implements OnInit, OnDestroy {

    protected readonly Math = Math;

    private readonly authService = inject(AuthService);
    private readonly tiempoMuertoApi = inject(TiempoMuertoApiClient);
    private readonly turnoWebSocket = inject(TurnoWebSocketApi);
    private readonly messageService = inject(MessageService);
    private readonly layoutService = inject(LayoutService);

    private get idSucursalActual(): number {
        return this.authService.getUsuario()?.idSucursal ?? 0;
    }

    cargando = false;
    ahora = Date.now();

    private periodos: TiempoMuertoResponseDTO[] = [];

    filasActivo: FilaActivo[] = [];
    filasDescanso: FilaDescanso[] = [];

    chartData: any = null;
    chartOptions: any = null;

    chartDataDescanso: any = null;
    chartOptionsDescanso: any = null;

    /** Escribe los minutos al final de cada barra — así no hay que "leer" el eje. */
    chartPlugins = [{
        id: 'valorAlFinalDeLaBarra',
        afterDatasetsDraw: (chart: any) => {
            const meta = chart.getDatasetMeta(0);
            if (!meta) return;
            const ctx = chart.ctx;
            const esOscuro = this.layoutService.isDarkTheme();
            ctx.save();
            ctx.fillStyle = esOscuro ? '#f1f5f9' : '#1e293b';
            ctx.font = '600 13px sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            meta.data.forEach((barra: any, i: number) => {
                const valor = chart.data.datasets[0].data[i];
                ctx.fillText(`${valor} min`, barra.x + 8, barra.y);
            });
            ctx.restore();
        }
    }];

    private ultimoMaxValor = 1;
    private ultimoMaxValorDescanso = 1;
    private wsSubscription?: Subscription;
    private timerInterval?: ReturnType<typeof setInterval>;

    constructor() {
        // Recalcula los colores de las gráficas cuando cambia el tema claro/oscuro.
        effect(() => {
            this.layoutService.isDarkTheme();
            this.chartOptions = this.construirOpcionesGrafica(this.ultimoMaxValor, 'min activo');
            this.chartOptionsDescanso = this.construirOpcionesGrafica(this.ultimoMaxValorDescanso, 'min en descanso');
        });
    }

    async ngOnInit(): Promise<void> {
        await this.cargar();

        this.turnoWebSocket.connect();
        this.wsSubscription = this.turnoWebSocket.mensajes.subscribe(() => {
            this.cargar();
        });

        // Los períodos sin fechafin siguen en curso — el minutero avanza en vivo.
        this.timerInterval = setInterval(() => {
            this.ahora = Date.now();
            this.calcular();
        }, 30000);
    }

    ngOnDestroy(): void {
        this.wsSubscription?.unsubscribe();
        this.turnoWebSocket.close();
        clearInterval(this.timerInterval);
    }

    async cargar(): Promise<void> {
        this.cargando = true;
        try {
            this.periodos = await this.tiempoMuertoApi.buscar(this.idSucursalActual);
            this.ahora = Date.now();
            this.calcular();
        } catch (err) {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: extraerMensajeError(err) });
        } finally {
            this.cargando = false;
        }
    }

    private nombreUsuario(p: TiempoMuertoResponseDTO): string {
        return p.nombreCompleto || p.codigoUsuario || 'Sin usuario';
    }

    private claveUsuario(p: TiempoMuertoResponseDTO): number | string {
        return p.idUsuario ?? p.codigoUsuario ?? this.nombreUsuario(p);
    }

    /** Minutos de un período: hasta fechaFin, o hasta ahora si sigue en curso. */
    private minutosDelPeriodo(p: TiempoMuertoResponseDTO): number {
        const inicio = new Date(p.fechaInicio).getTime();
        const fin = p.fechaFin ? new Date(p.fechaFin).getTime() : this.ahora;
        return Math.max(0, Math.round((fin - inicio) / 60000));
    }

    private calcular(): void {
        const porUsuarioActivo = new Map<number | string, { nombre: string; minutos: number }>();
        const porUsuarioDescanso = new Map<number | string, { nombre: string; banio: number; comida: number; tramitesContables: number; otro: number }>();

        for (const p of this.periodos) {
            const clave = this.claveUsuario(p);
            const nombre = this.nombreUsuario(p);
            const minutos = this.minutosDelPeriodo(p);

            if (p.estadoOperador === 'ACTIVA') {
                const entrada = porUsuarioActivo.get(clave) ?? { nombre, minutos: 0 };
                entrada.minutos += minutos;
                porUsuarioActivo.set(clave, entrada);
            } else if (p.estadoOperador === 'DESCANSO') {
                const entrada = porUsuarioDescanso.get(clave) ?? { nombre, banio: 0, comida: 0, tramitesContables: 0, otro: 0 };
                if (p.tipoDescanso === 'BAÑO') entrada.banio += minutos;
                else if (p.tipoDescanso === 'COMIDA') entrada.comida += minutos;
                else if (p.tipoDescanso === 'TRAMITES CONTABLES') entrada.tramitesContables += minutos;
                else entrada.otro += minutos;
                porUsuarioDescanso.set(clave, entrada);
            }
        }

        // Ascendente: Chart.js horizontal dibuja de abajo hacia arriba, así que el
        // primero del arreglo queda arriba del todo — el que más tiempo activo tuvo.
        const activos = [...porUsuarioActivo.entries()]
            .map(([clave, v]) => ({ clave, nombre: v.nombre, minutosActivo: v.minutos }))
            .sort((a, b) => a.minutosActivo - b.minutosActivo || a.nombre.localeCompare(b.nombre));

        this.filasActivo = [...activos].reverse();

        this.chartData = activos.length > 0 ? {
            labels: activos.map(a => a.nombre),
            datasets: [{
                label: 'Minutos activo',
                data: activos.map(a => a.minutosActivo),
                backgroundColor: this.colorBarra(),
                borderRadius: 6,
                maxBarThickness: 34
            }]
        } : null;

        this.ultimoMaxValor = Math.max(...activos.map(a => a.minutosActivo), 1);
        this.chartOptions = this.construirOpcionesGrafica(this.ultimoMaxValor, 'min activo');

        this.filasDescanso = [...porUsuarioDescanso.entries()]
            .map(([clave, v]) => ({
                clave,
                nombre: v.nombre,
                banioMin: v.banio,
                comidaMin: v.comida,
                tramitesContablesMin: v.tramitesContables,
                otroMin: v.otro,
                totalMin: v.banio + v.comida + v.tramitesContables + v.otro
            }))
            .sort((a, b) => b.totalMin - a.totalMin || a.nombre.localeCompare(b.nombre));

        // Ascendente para la gráfica: el que más tiempo estuvo en descanso queda arriba del todo.
        const descansosAsc = [...this.filasDescanso].sort((a, b) =>
            a.totalMin - b.totalMin || b.nombre.localeCompare(a.nombre)
        );

        this.chartDataDescanso = descansosAsc.length > 0 ? {
            labels: descansosAsc.map(d => d.nombre),
            datasets: [{
                label: 'Minutos en descanso',
                data: descansosAsc.map(d => d.totalMin),
                backgroundColor: this.colorBarra(),
                borderRadius: 6,
                maxBarThickness: 34
            }]
        } : null;

        this.ultimoMaxValorDescanso = Math.max(...descansosAsc.map(d => d.totalMin), 1);
        this.chartOptionsDescanso = this.construirOpcionesGrafica(this.ultimoMaxValorDescanso, 'min en descanso');
    }

    private colorBarra(): string {
        return getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim() || '#3b82f6';
    }

    private construirOpcionesGrafica(maxValor: number, sufijoTooltip: string): any {
        const esOscuro = this.layoutService.isDarkTheme();
        const colorTexto = esOscuro ? '#cbd5e1' : '#475569';
        const colorGrid = esOscuro ? 'rgba(148, 163, 184, 0.15)' : 'rgba(100, 116, 139, 0.12)';

        return {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { right: 48 } },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx: any) => ` ${ctx.raw} ${sufijoTooltip}`
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    suggestedMax: maxValor + Math.max(1, Math.round(maxValor * 0.15)),
                    ticks: { color: colorTexto, precision: 0 },
                    grid: { color: colorGrid, drawBorder: false }
                },
                y: {
                    ticks: { color: colorTexto, font: { size: 13 } },
                    grid: { display: false }
                }
            }
        };
    }
}

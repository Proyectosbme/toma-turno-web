import { Component, OnInit, OnDestroy, inject, effect } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { ChartModule } from 'primeng/chart';
import { MessageService } from 'primeng/api';
import { AuthService } from '@auth/services/auth.service';
import { TurnoApiClient } from '@turnos/api/turno-api.client';
import { TurnoWebSocketApi } from '@turnos/api/turno-websocket.api';
import { TurnoHoyResponseDTO } from '@turnos/dto/turnohoy.dto';
import { extraerMensajeError } from '@shared/utils/error.util';
import { PageLayoutComponent } from '@shared/components/page-layout/page-layout.component';
import { PageTitleComponent } from '@shared/components/page-title/page-title';
import { LayoutService } from '@core/layout/service/layout.service';

interface FilaUsuario {
    idUsuario: number | string;
    nombre: string;
    total: number;
    promedioAtencionMin: number | null;
}

interface FilaCola {
    nombre: string;
    total: number;
    promedioMin: number | null;
}

type Opcion<T> = { label: string; value: T | null };

@Component({
    selector: 'app-monitoreo-estadisticas',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ButtonModule,
        SelectModule,
        ToastModule,
        ChartModule,
        PageLayoutComponent,
        PageTitleComponent
    ],
    providers: [MessageService],
    templateUrl: './estadisticas.html',
    styleUrl: './estadisticas.scss'
})
export class MonitoreoEstadisticasPage implements OnInit, OnDestroy {

    protected readonly Math = Math;

    private readonly authService = inject(AuthService);
    private readonly turnoApi = inject(TurnoApiClient);
    private readonly turnoWebSocket = inject(TurnoWebSocketApi);
    private readonly messageService = inject(MessageService);
    private readonly layoutService = inject(LayoutService);

    private get idSucursalActual(): number {
        return this.authService.getUsuario()?.idSucursal ?? 0;
    }

    cargando = false;
    todosFinalizados: TurnoHoyResponseDTO[] = [];
    finalizados: TurnoHoyResponseDTO[] = [];

    // ── Filtros (cola y detalle acotan el ranking general; usuario también, y
    //    además habilita la sección de abajo con su detalle por cola) ──
    colaSeleccionada: string | null = null;
    detalleSeleccionado: string | null = null;
    usuarioSeleccionado: number | string | null = null;

    opcionesColas: Opcion<string>[] = [{ label: 'Todas las colas', value: null }];
    opcionesDetalles: Opcion<string>[] = [{ label: 'Todos los detalles', value: null }];
    opcionesUsuarios: Opcion<number | string>[] = [{ label: 'Todos los usuarios', value: null }];

    totalAtendidos = 0;
    promedioTotalMin: number | null = null;

    tablaUsuarios: FilaUsuario[] = [];

    chartData: any = null;
    chartOptions: any = null;

    // ── Sección de abajo: detalle por cola de UN usuario elegido ──
    tablaColasUsuario: FilaCola[] = [];
    chartDataUsuario: any = null;
    chartOptionsUsuario: any = null;

    /** Escribe la cantidad al final de cada barra — así no hay que "leer" el eje. */
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
                ctx.fillText(String(valor), barra.x + 8, barra.y);
            });
            ctx.restore();
        }
    }];

    private ultimoMaxValor = 1;
    private ultimoMaxValorUsuario = 1;
    private wsSubscription?: Subscription;

    constructor() {
        // Recalcula los colores de ambas gráficas cuando cambia el tema claro/oscuro.
        effect(() => {
            this.layoutService.isDarkTheme();
            this.chartOptions = this.construirOpcionesGrafica(this.ultimoMaxValor);
            this.chartOptionsUsuario = this.construirOpcionesGrafica(this.ultimoMaxValorUsuario);
        });
    }

    async ngOnInit(): Promise<void> {
        await this.cargar();

        this.turnoWebSocket.connect();
        this.wsSubscription = this.turnoWebSocket.mensajes.subscribe(() => {
            this.cargar();
        });
    }

    ngOnDestroy(): void {
        this.wsSubscription?.unsubscribe();
        this.turnoWebSocket.close();
    }

    async cargar(): Promise<void> {
        this.cargando = true;
        try {
            const resultados = await this.turnoApi.buscarHoy(this.idSucursalActual);
            this.todosFinalizados = resultados.filter(t => t.estadoTurno === 'FINALIZADO');

            const colas = [...new Set(resultados.map(t => t.cola))].sort((a, b) => a.localeCompare(b));
            this.opcionesColas = [{ label: 'Todas las colas', value: null }, ...colas.map(c => ({ label: c, value: c }))];

            const usuarios = new Map<number | string, string>();
            for (const t of this.todosFinalizados) {
                usuarios.set(this.claveUsuario(t), this.nombreUsuario(t));
            }
            this.opcionesUsuarios = [
                { label: 'Todos los usuarios', value: null },
                ...[...usuarios.entries()]
                    .map(([value, label]) => ({ label, value }))
                    .sort((a, b) => a.label.localeCompare(b.label))
            ];
            if (this.usuarioSeleccionado != null && !usuarios.has(this.usuarioSeleccionado)) {
                this.usuarioSeleccionado = null;
            }

            this.onFiltrosCambiaron();
            this.calcularDetalleUsuario();
        } catch (err) {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: extraerMensajeError(err) });
        } finally {
            this.cargando = false;
        }
    }

    get nombreUsuarioSeleccionado(): string {
        return this.opcionesUsuarios.find(o => o.value === this.usuarioSeleccionado)?.label ?? '';
    }

    onFiltrosCambiaron(): void {
        // Las opciones de "detalle" dependen de la cola elegida.
        const baseDetalles = this.colaSeleccionada
            ? this.todosFinalizados.filter(t => t.cola === this.colaSeleccionada)
            : this.todosFinalizados;
        const detalles = [...new Set(baseDetalles.map(t => t.detalle).filter((d): d is string => !!d))]
            .sort((a, b) => a.localeCompare(b));
        this.opcionesDetalles = [{ label: 'Todos los detalles', value: null }, ...detalles.map(d => ({ label: d, value: d }))];
        if (this.detalleSeleccionado && !detalles.includes(this.detalleSeleccionado)) {
            this.detalleSeleccionado = null;
        }

        // El filtro de usuario NO afecta este ranking (compara a todos entre sí);
        // solo controla la sección de abajo — ver onUsuarioCambiado().
        this.finalizados = this.todosFinalizados.filter(t =>
            (!this.colaSeleccionada || t.cola === this.colaSeleccionada) &&
            (!this.detalleSeleccionado || t.detalle === this.detalleSeleccionado)
        );

        this.calcularEstadisticas();
    }

    onUsuarioCambiado(): void {
        this.calcularDetalleUsuario();
    }

    private nombreUsuario(turno: TurnoHoyResponseDTO): string {
        return turno.nombreCompleto || turno.codigoUsuario || 'Sin usuario';
    }

    private claveUsuario(turno: TurnoHoyResponseDTO): number | string {
        return turno.idUsuario ?? turno.codigoUsuario ?? this.nombreUsuario(turno);
    }

    private calcularEstadisticas(): void {
        this.totalAtendidos = this.finalizados.length;

        const conDuracionTotal = this.finalizados.filter(t => t.fechaCreacion && t.fechaFinalizacion);
        if (conDuracionTotal.length > 0) {
            const totalMs = conDuracionTotal.reduce((sum, t) =>
                sum + (new Date(t.fechaFinalizacion!).getTime() - new Date(t.fechaCreacion).getTime()), 0
            );
            this.promedioTotalMin = Math.round((totalMs / conDuracionTotal.length / 60000) * 10) / 10;
        } else {
            this.promedioTotalMin = null;
        }

        if (this.finalizados.length === 0) {
            this.tablaUsuarios = [];
            this.chartData = null;
            return;
        }

        // Un usuario = un número: cuántos turnos atendió en total (más simple de leer
        // que separarlo por cola en la misma gráfica — para eso están los filtros de arriba).
        const porUsuario = new Map<number | string, {
            nombre: string;
            total: number;
            sumaAtencionMs: number;
            cantidadAtencion: number;
        }>();

        for (const t of this.finalizados) {
            const clave = this.claveUsuario(t);

            let entrada = porUsuario.get(clave);
            if (!entrada) {
                entrada = { nombre: this.nombreUsuario(t), total: 0, sumaAtencionMs: 0, cantidadAtencion: 0 };
                porUsuario.set(clave, entrada);
            }
            entrada.total++;

            if (t.fechaLlamada && t.fechaFinalizacion) {
                entrada.sumaAtencionMs += new Date(t.fechaFinalizacion).getTime() - new Date(t.fechaLlamada).getTime();
                entrada.cantidadAtencion++;
            }
        }

        // Orden ascendente: Chart.js dibuja horizontal de abajo hacia arriba, así que
        // el primero del arreglo queda hasta arriba — el que más atendió, arriba del todo.
        const usuarios = [...porUsuario.entries()]
            .map(([clave, v]) => ({
                clave,
                nombre: v.nombre,
                total: v.total,
                promedioAtencionMin: v.cantidadAtencion > 0
                    ? Math.round((v.sumaAtencionMs / v.cantidadAtencion / 60000) * 10) / 10
                    : null
            }))
            .sort((a, b) => a.total - b.total || a.nombre.localeCompare(b.nombre));

        this.tablaUsuarios = [...usuarios].reverse().map(u => ({
            idUsuario: u.clave,
            nombre: u.nombre,
            total: u.total,
            promedioAtencionMin: u.promedioAtencionMin
        }));

        this.chartData = {
            labels: usuarios.map(u => u.nombre),
            datasets: [{
                label: 'Turnos atendidos',
                data: usuarios.map(u => u.total),
                backgroundColor: this.colorBarra(),
                borderRadius: 6,
                maxBarThickness: 34
            }]
        };

        this.ultimoMaxValor = Math.max(...usuarios.map(u => u.total), 1);
        this.chartOptions = this.construirOpcionesGrafica(this.ultimoMaxValor);
    }

    /** Detalle por cola de UN usuario — solo tiene sentido si hay uno elegido en el filtro. */
    private calcularDetalleUsuario(): void {
        if (this.usuarioSeleccionado == null) {
            this.chartDataUsuario = null;
            this.tablaColasUsuario = [];
            return;
        }

        const turnosUsuario = this.todosFinalizados.filter(t => this.claveUsuario(t) === this.usuarioSeleccionado);

        const porCola = new Map<string, { total: number; sumaAtencionMs: number; cantidadAtencion: number }>();
        for (const t of turnosUsuario) {
            const nombreCola = t.detalle ? `${t.cola} → ${t.detalle}` : t.cola;
            let entrada = porCola.get(nombreCola);
            if (!entrada) {
                entrada = { total: 0, sumaAtencionMs: 0, cantidadAtencion: 0 };
                porCola.set(nombreCola, entrada);
            }
            entrada.total++;
            if (t.fechaLlamada && t.fechaFinalizacion) {
                entrada.sumaAtencionMs += new Date(t.fechaFinalizacion).getTime() - new Date(t.fechaLlamada).getTime();
                entrada.cantidadAtencion++;
            }
        }

        const colas = [...porCola.entries()]
            .map(([nombre, v]) => ({
                nombre,
                total: v.total,
                promedioMin: v.cantidadAtencion > 0
                    ? Math.round((v.sumaAtencionMs / v.cantidadAtencion / 60000) * 10) / 10
                    : null
            }))
            .sort((a, b) => a.total - b.total || a.nombre.localeCompare(b.nombre));

        this.tablaColasUsuario = [...colas].reverse();

        if (colas.length === 0) {
            this.chartDataUsuario = null;
            return;
        }

        this.chartDataUsuario = {
            labels: colas.map(c => c.nombre),
            datasets: [{
                label: 'Turnos atendidos',
                data: colas.map(c => c.total),
                backgroundColor: this.colorBarra(),
                borderRadius: 6,
                maxBarThickness: 34
            }]
        };

        this.ultimoMaxValorUsuario = Math.max(...colas.map(c => c.total), 1);
        this.chartOptionsUsuario = this.construirOpcionesGrafica(this.ultimoMaxValorUsuario);
    }

    private colorBarra(): string {
        return getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim() || '#3b82f6';
    }

    private construirOpcionesGrafica(maxValor: number): any {
        const esOscuro = this.layoutService.isDarkTheme();
        const colorTexto = esOscuro ? '#cbd5e1' : '#475569';
        const colorGrid = esOscuro ? 'rgba(148, 163, 184, 0.15)' : 'rgba(100, 116, 139, 0.12)';

        return {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            // Deja aire a la derecha de la barra más larga para que el número no se corte.
            layout: { padding: { right: 32 } },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx: any) => ` ${ctx.raw} turno${ctx.raw === 1 ? '' : 's'} atendido${ctx.raw === 1 ? '' : 's'}`
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    suggestedMax: maxValor + 1,
                    ticks: { color: colorTexto, precision: 0, stepSize: 1 },
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

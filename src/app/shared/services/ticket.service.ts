import { Injectable } from '@angular/core';
import { TurnoResponseDTO } from '@turnos/dto/turno.dto';
import { ColaResponseDTO } from '@general/dto/cola.dto';
import { DetalleResponseDTO } from '@general/dto/detalle.dto';
import { DuiData } from '@turnos/pages/seleccion-turno/seleccion-turno';

export interface DatosTicket {
    turno:   TurnoResponseDTO;
    cola:    ColaResponseDTO | null;
    detalle: DetalleResponseDTO | null;
    dui:     DuiData | null;
}

@Injectable({ providedIn: 'root' })
export class TicketService {

    generarHtml(datos: DatosTicket): string {
        const { turno, cola, detalle, dui } = datos;

        const fecha    = new Date(turno.fechaCreacion);
        const fechaStr = fecha.toLocaleDateString('es-SV', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const horaStr  = fecha.toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' });

        return `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><title>Ticket</title>
${this.estilos()}
</head>
<body>
<div class="ticket">
  <div class="centro titulo">*** TICKET DE TURNO ***</div>
  <div class="sep">================================</div>
  <div class="codigo">${turno.codigoTurno}</div>
  <div class="sep">--------------------------------</div>
  <table>
    <tr><td class="lbl">Servicio</td><td>${cola?.nombre ?? ''}</td></tr>
    ${detalle ? `<tr><td class="lbl">Tipo</td><td>${detalle.nombre}</td></tr>` : ''}
    <tr><td class="lbl">Fecha</td><td>${fechaStr}</td></tr>
    <tr><td class="lbl">Hora</td><td>${horaStr}</td></tr>
  </table>
  ${this.seccionDui(dui)}
  <div class="sep">================================</div>
  <div class="pie">Por favor espere a ser llamado</div>
</div>
</body></html>`;
    }

    private seccionDui(dui: DuiData | null): string {
        if (!dui) return '';
        return `
  <div class="sep">----- DATOS DEL CIUDADANO -----</div>
  <table>
    <tr><td class="lbl">DUI</td><td>${dui.numero}</td></tr>
    ${dui.apellidos       ? `<tr><td class="lbl">Apellidos</td><td>${dui.apellidos}</td></tr>` : ''}
    ${dui.nombres         ? `<tr><td class="lbl">Nombres</td><td>${dui.nombres}</td></tr>` : ''}
    ${dui.fechaNacimiento ? `<tr><td class="lbl">Nacimiento</td><td>${dui.fechaNacimiento}</td></tr>` : ''}
  </table>`;
    }

    private estilos(): string {
        return `<style>
  @page{size:72mm auto;margin:0}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Courier New',monospace;font-size:10px;color:#000;background:#e8e8e8;display:flex;justify-content:center;align-items:flex-start;min-height:100vh;padding:16px}
  .ticket{background:#fff;width:72mm;padding:4mm;box-shadow:0 2px 10px rgba(0,0,0,.25)}
  .centro{text-align:center}
  .titulo{font-size:13px;font-weight:bold;text-transform:uppercase;padding:4px 0 2px}
  .sep{font-size:9px;color:#555;padding:4px 0;text-align:center}
  .codigo{font-size:48px;font-weight:900;letter-spacing:4px;line-height:1;text-align:center;padding:8px 0}
  table{width:100%;border-collapse:collapse;padding:2px 0}
  td{padding:2px 1px;vertical-align:top;font-size:10px}
  .lbl{font-weight:bold;white-space:nowrap;padding-right:6px;width:38%}
  .pie{font-size:9px;font-style:italic;text-align:center;padding:6px 0 2px}
  @media print{body{background:none;display:block;padding:0;min-height:unset}.ticket{box-shadow:none;width:100%;padding:3mm 4mm}}
</style>`;
    }
}

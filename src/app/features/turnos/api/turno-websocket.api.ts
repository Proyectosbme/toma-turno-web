import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { WsTurnoEvent } from '@turnos/dto/turno.dto';

@Injectable({ providedIn: 'root' })
export class TurnoWebSocketApi {
  private ws?: WebSocket;
  private mensajes$ = new Subject<WsTurnoEvent>();
  private wsUrl = '';
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private cerradoManualmente = false;

  get mensajes(): Observable<WsTurnoEvent> {
    return this.mensajes$.asObservable();
  }

  connect(url?: string): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const defaultUrl = environment.wsUrl || `${proto}//${location.host}/turnos`;
    this.wsUrl = url ?? defaultUrl;
    this.cerradoManualmente = false;
    this.abrir();
  }

  private abrir(): void {
    this.ws = new WebSocket(this.wsUrl);
    this.ws.onopen = () => console.log('WebSocket conectado');
    this.ws.onmessage = (event) => {
      try { this.mensajes$.next(JSON.parse(event.data)); } catch { /* ignorar mensajes malformados */ }
    };
    this.ws.onclose = () => {
      if (!this.cerradoManualmente) {
        this.reconnectTimer = setTimeout(() => this.abrir(), 5000);
      }
    };
    this.ws.onerror = () => { /* onclose se dispara justo después */ };
  }

  send(message: string): void {
    this.ws?.send(message);
  }

  close(): void {
    this.cerradoManualmente = true;
    clearTimeout(this.reconnectTimer);
    this.ws?.close();
  }
}

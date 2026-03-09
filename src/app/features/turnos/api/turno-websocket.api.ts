import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TurnoWebSocketApi {
  private ws?: WebSocket;
  private mensajes$ = new Subject<string>();
  private wsUrl = '';
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private cerradoManualmente = false;

  get mensajes(): Observable<string> {
    return this.mensajes$.asObservable();
  }

  connect(url?: string): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const defaultUrl = environment.wsUrl || `${proto}//${location.host}/ws-turnos`;
    this.wsUrl = url ?? defaultUrl;
    this.cerradoManualmente = false;
    this.abrir();
  }

  private abrir(): void {
    this.ws = new WebSocket(this.wsUrl);
    this.ws.onopen = () => console.log('WebSocket conectado');
    this.ws.onmessage = (event) => this.mensajes$.next(event.data);
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

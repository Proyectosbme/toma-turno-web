import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Notification {
    id: number;
    title: string;
    message: string;
    read: boolean;
    date: Date;
}

@Injectable({
    providedIn: 'root'
})
export class NotificationService {
    private _allNotifications = new BehaviorSubject<Notification[]>([]);
    private _displayedNotifications = new BehaviorSubject<Notification[]>([]);
    notifications$ = this._displayedNotifications.asObservable();

    private _unreadCount = new BehaviorSubject<number>(0);
    unreadCount$ = this._unreadCount.asObservable();

    private _hasMoreNotifications = new BehaviorSubject<boolean>(false);
    hasMoreNotifications$ = this._hasMoreNotifications.asObservable();

    private webSocket!: WebSocket;
    private mockId = 0;
    private readonly BATCH_SIZE = 3;
    private currentDisplayLimit = this.BATCH_SIZE;

    constructor() {
        this.connectWebSocket('testUser');
    }

    private connectWebSocket(userId: string) {
        const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${proto}//${location.host}/notifications/${userId}`;
        this.webSocket = new WebSocket(wsUrl);

        this.webSocket.onopen = (event) => {
            console.log('WebSocket connection opened:', event);
        };

        this.webSocket.onmessage = (event) => {
            console.log('WebSocket message received:', event.data);
            const messageContent = event.data;

            const newNotification: Notification = {
                id: this.mockId++,
                title: 'New Notification',
                message: messageContent,
                read: false,
                date: new Date()
            };

            const currentAllNotifications = this._allNotifications.getValue();
            this._allNotifications.next([newNotification, ...currentAllNotifications]);
            this.updateDisplayedNotifications();
            this.updateUnreadCount();
        };

        this.webSocket.onclose = (event) => {
            console.log('WebSocket connection closed:', event);
            setTimeout(() => this.connectWebSocket(userId), 3000);
        };

        this.webSocket.onerror = (event) => {
            console.error('WebSocket error:', event);
        };
    }

    private updateDisplayedNotifications() {
        const all = this._allNotifications.getValue();
        const displayed = all.slice(0, this.currentDisplayLimit);
        this._displayedNotifications.next(displayed);
        this._hasMoreNotifications.next(all.length > this.currentDisplayLimit);
    }

    private updateUnreadCount() {
        const unreadCount = this._allNotifications.getValue().filter((n) => !n.read).length;
        this._unreadCount.next(unreadCount);
    }

    loadMoreNotifications() {
        this.currentDisplayLimit += this.BATCH_SIZE;
        this.updateDisplayedNotifications();
    }

    markAsRead(id: number) {
        const currentAllNotifications = this._allNotifications.getValue();
        const notification = currentAllNotifications.find((n) => n.id === id);
        if (notification && !notification.read) {
            notification.read = true;
            this._allNotifications.next([...currentAllNotifications]);
            this.updateDisplayedNotifications();
            this.updateUnreadCount();
        }
    }

    markAllAsRead() {
        const currentAllNotifications = this._allNotifications.getValue();
        currentAllNotifications.forEach((n) => (n.read = true));
        this._allNotifications.next([...currentAllNotifications]);
        this.updateDisplayedNotifications();
        this.updateUnreadCount();
    }

    sendWebSocketMessage(message: string) {
        if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
            this.webSocket.send(message);
        } else {
            console.warn('WebSocket is not open. Message not sent:', message);
        }
    }

    ngOnDestroy() {
        if (this.webSocket) {
            this.webSocket.close();
        }
    }
}

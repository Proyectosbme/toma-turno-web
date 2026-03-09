import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DividerModule } from 'primeng/divider';
import { RippleModule } from 'primeng/ripple';
import { StyleClassModule } from 'primeng/styleclass';
import { Notification, NotificationService } from '../service/notification.service';
import { Observable } from 'rxjs';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, RouterModule, DividerModule, RippleModule, StyleClassModule, ButtonModule],
  templateUrl: './notifications.component.html',
})
export class NotificationsComponent implements OnInit {
  notifications$: Observable<Notification[]>;

  constructor(public notificationService: NotificationService) {
    this.notifications$ = this.notificationService.notifications$;
  }

  ngOnInit() {}

  markAsRead(notification: Notification) {
    this.notificationService.markAsRead(notification.id);
  }

  markAllAsRead() {
    this.notificationService.markAllAsRead();
  }

  loadMoreNotifications() {
    this.notificationService.loadMoreNotifications();
  }
}

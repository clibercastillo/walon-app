import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { NotificationService } from '../../core/services/notification.service';
import { AppNotification } from '../../core/models/notification.model';

@Component({
  selector: 'app-notification-list',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './notification-list.html',
  styleUrl: './notification-list.scss',
})
export class NotificationList {
  private notificationService = inject(NotificationService);

  notifications = signal<AppNotification[]>([]);
  loading = signal(true);

  ngOnInit(): void {
    this.notificationService.findMine().subscribe({
      next: (data) => {
        const sorted = data.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        this.notifications.set(sorted);
        this.notificationService.markAllAsRead().subscribe();
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
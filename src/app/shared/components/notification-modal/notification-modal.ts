import { Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { NotificationService } from '../../../core/services/notification.service';
import { AppNotification } from '../../../core/models/notification.model';

const PAGE_SIZE = 5;

@Component({
  selector: 'app-notification-modal',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './notification-modal.html',
  styleUrl: './notification-modal.scss',
})
export class NotificationModal {
  private notificationService = inject(NotificationService);
  private _open = false;

  // Al abrirse siempre carga la primera página
  @Input() set open(value: boolean) {
    if (value && !this._open) this.loadPage(0);
    this._open = value;
  }
  get open(): boolean {
    return this._open;
  }

  @Output() closed = new EventEmitter<void>();

  items = signal<AppNotification[]>([]);
  page = signal(0);
  totalPages = signal(0);
  loading = signal(false);
  markingAll = signal(false);

  unreadCount = this.notificationService.unreadCount;
  hasPrev = computed(() => this.page() > 0);
  hasNext = computed(() => this.page() + 1 < this.totalPages());

  loadPage(page: number): void {
    this.loading.set(true);
    this.notificationService.findPage(page, PAGE_SIZE).subscribe({
      next: (res) => {
        this.items.set(res.content);
        this.page.set(res.page);
        this.totalPages.set(res.totalPages);
        this.notificationService.setUnreadCount(res.unreadCount);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  prev(): void {
    if (this.hasPrev()) this.loadPage(this.page() - 1);
  }

  next(): void {
    if (this.hasNext()) this.loadPage(this.page() + 1);
  }

  markOne(n: AppNotification): void {
    if (n.read) return;
    this.notificationService.markAsRead(n.id).subscribe({
      next: () => {
        this.items.update((list) => list.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
        this.notificationService.setUnreadCount(Math.max(0, this.unreadCount() - 1));
      },
    });
  }

  markAll(): void {
    if (this.unreadCount() === 0 || this.markingAll()) return;
    this.markingAll.set(true);
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.items.update((list) => list.map((x) => ({ ...x, read: true })));
        this.markingAll.set(false);
      },
      error: () => this.markingAll.set(false),
    });
  }

  close(): void {
    this.closed.emit();
  }
}
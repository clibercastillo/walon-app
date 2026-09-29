import { Injectable, computed, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { EMPTY, Observable, catchError, interval, map, startWith, switchMap, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AppNotification, NotificationPage } from '../models/notification.model';

const POLL_INTERVAL_MS = 30000;

@Injectable({ providedIn: 'root' })
export class NotificationService {
  // El contador ahora viene del servidor (campo `read` en BD), ya no de localStorage
  private readonly unreadSignal = signal(0);
  readonly unreadCount = computed(() => this.unreadSignal());

  constructor(private http: HttpClient) {}

  findMine(): Observable<AppNotification[]> {
    return this.http.get<AppNotification[]>(`${environment.notificationsUrl}/mine`);
  }

  findPage(page: number, size: number): Observable<NotificationPage> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<NotificationPage>(`${environment.notificationsUrl}/page`, { params });
  }

  fetchUnreadCount(): Observable<number> {
    return this.http
      .get<{ count: number }>(`${environment.notificationsUrl}/unread-count`)
      .pipe(map((res) => res.count));
  }

  /** Polling liviano: solo pide el número de no leídas (llamar desde el navbar). */
  startPolling(): Observable<number> {
    return interval(POLL_INTERVAL_MS).pipe(
      startWith(0),
      // si falla una consulta se conserva el último valor en vez de poner 0
      switchMap(() => this.fetchUnreadCount().pipe(catchError(() => EMPTY))),
    );
  }

  setUnreadCount(count: number): void {
    this.unreadSignal.set(count);
  }

  markAsRead(id: number): Observable<void> {
    return this.http.patch<void>(`${environment.notificationsUrl}/${id}/read`, {});
  }

  markAllAsRead(): Observable<void> {
    return this.http
      .patch<void>(`${environment.notificationsUrl}/read-all`, {})
      .pipe(tap(() => this.unreadSignal.set(0)));
  }

  /** Limpia el estado al hacer logout. */
  reset(): void {
    this.unreadSignal.set(0);
  }
}
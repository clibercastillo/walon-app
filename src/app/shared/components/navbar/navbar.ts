import { Component, effect, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { NotificationModal } from '../notification-modal/notification-modal';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NotificationModal],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  auth = inject(AuthService);
  notifications = inject(NotificationService);
  private router = inject(Router);

  notifOpen = signal(false);

  constructor() {
    // Solo hace polling mientras haya sesión iniciada.
    effect((onCleanup) => {
      if (!this.auth.isAuthenticated()) return;
      const sub = this.notifications
        .startPolling()
        .subscribe((count) => this.notifications.setUnreadCount(count));
      onCleanup(() => sub.unsubscribe());
    });
  }

  logout(): void {
    this.notifOpen.set(false);
    this.notifications.reset();
    this.auth.logout();
    this.router.navigate(['/home']);
  }
}
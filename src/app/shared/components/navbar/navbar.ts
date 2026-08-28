import { Component, effect, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  auth = inject(AuthService);
  notifications = inject(NotificationService);
  private router = inject(Router);

  constructor() {
    // Solo hace polling mientras haya sesión iniciada.
    effect((onCleanup) => {
      if (!this.auth.isAuthenticated()) return;
      const sub = this.notifications
        .startPolling()
        .subscribe((data) => this.notifications.setNotifications(data));
      onCleanup(() => sub.unsubscribe());
    });
  }

  logout(): void {
    this.notifications.reset();
    this.auth.logout();
    this.router.navigate(['/home']);
  }
}
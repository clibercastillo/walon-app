import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },

  {
    path: 'home',
    loadComponent: () =>
      import('./features/home/home').then((m) => m.Home),
  },

  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register').then((m) => m.Register),
  },

  {
    path: 'stadiums/new',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./features/stadiums/stadium-form/stadium-form').then((m) => m.StadiumForm),
  },
  {
    path: 'stadiums',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./features/stadiums/stadium-list/stadium-list').then((m) => m.StadiumList),
  },
  {
    path: 'bookings',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/bookings/booking-list/booking-list').then((m) => m.BookingList),
  },
  {
    path: 'bookings/new',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/bookings/booking-form/booking-form').then((m) => m.BookingForm),
  },

  {
    path: 'notifications',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/notifications/notification-list').then((m) => m.NotificationList),
  },

  {
    path: 'stadiums/:id/edit',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./features/stadiums/stadium-form/stadium-form').then((m) => m.StadiumForm),
  },
  
  { path: '**', redirectTo: '/home' },
];
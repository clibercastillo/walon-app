import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { StadiumService } from '../../../core/services/stadium.service';
import { Stadium } from '../../../core/models/stadium.model';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-stadium-list',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './stadium-list.html',
  styleUrl: './stadium-list.scss',
})
export class StadiumList {
  private stadiumService = inject(StadiumService);
  private toast = inject(ToastService);
  private router = inject(Router);
  auth = inject(AuthService);

  stadiums = signal<Stadium[]>([]);
  loading = signal(true);
  cityFilter = signal('');
  deletingId = signal<number | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.stadiumService.findAll().subscribe({
      next: (data) => {
        this.stadiums.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  search(): void {
    const city = this.cityFilter().trim();
    this.loading.set(true);
    const request$ = city ? this.stadiumService.findByCity(city) : this.stadiumService.findAll();
    request$.subscribe({
      next: (data) => {
        this.stadiums.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  goToBooking(stadium: Stadium): void {
    this.router.navigate(['/bookings/new'], { queryParams: { stadiumId: stadium.id } });
  }

  editStadium(stadium: Stadium): void {
    this.router.navigate(['/stadiums', stadium.id, 'edit']);
  }

  deleteStadium(stadium: Stadium): void {
    const confirmed = confirm(`¿Eliminar la cancha "${stadium.name}"? Esta acción no se puede deshacer.`);
    if (!confirmed) return;

    this.deletingId.set(stadium.id);
    this.stadiumService.delete(stadium.id).subscribe({
      next: () => {
        this.toast.success('Cancha eliminada correctamente');
        this.stadiums.update((list) => list.filter((s) => s.id !== stadium.id));
        this.deletingId.set(null);
      },
      error: () => {
        this.toast.error('No se pudo eliminar la cancha');
        this.deletingId.set(null);
      },
    });
  }
}
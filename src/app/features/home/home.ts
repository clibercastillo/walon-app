import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { StadiumService } from '../../core/services/stadium.service';
import { AuthService } from '../../core/services/auth.service';
import { BookingService } from '../../core/services/booking.service';
import { Stadium } from '../../core/models/stadium.model';
import { Booking } from '../../core/models/booking.model';
import { ToastService } from '../../core/services/toast.service';

interface DayOption {
  iso: string;
  dayLabel: string;
  dayNum: string;
  month: string;
}

interface Slot {
  start: string;
  end: string;
  price: number;
  status: 'available' | 'occupied' | 'selected' | 'past';
}

const OPEN_HOUR = 7;
const CLOSE_HOUR = 23;
const SLOT_MINUTES = 30;
const MAX_SLOTS = 6;

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private stadiumService = inject(StadiumService);
  private authService = inject(AuthService);
  private bookingService = inject(BookingService);
  private router = inject(Router);
  private toast = inject(ToastService);

  loadingStadium = signal(true);
  loading = signal(false);
  stadium = signal<Stadium | null>(null);
  showLoginModal = signal(false);

  days = signal<DayOption[]>(this.buildDays());
  selectedDayIso = signal<string>(this.days()[0].iso);
  slots = signal<Slot[]>([]);
  selectedRange = signal<{ startIdx: number; endIdx: number } | null>(null);

  private demoWhatsapp = '51999999999';

  mockReviews = [
    {
      name: 'Cliber Castillo',
      initial: 'A',
      stars: 5,
      date: '30 de julio de 2026',
      comment: 'Cancha en buen estado, fácil de reservar y llegar.',
    },
  ];

  galleryPlaceholders = [1, 2, 3, 4];

  selectedCount = computed(() => {
    const r = this.selectedRange();
    return r ? r.endIdx - r.startIdx + 1 : 0;
  });

  estimatedTotal = computed(() => {
    const stadium = this.stadium();
    if (!stadium) return 0;
    return Math.round(this.selectedCount() * (stadium.pricePerHour / 2) * 100) / 100;
  });

  selectedRangeLabel = computed(() => {
    const r = this.selectedRange();
    const slots = this.slots();
    if (!r || !slots.length) return null;
    return `${slots[r.startIdx].start} - ${slots[r.endIdx].end}`;
  });

  whatsappLink = computed(() => {
    const s = this.stadium();
    const text = encodeURIComponent(
      `Hola, quiero consultar sobre la cancha ${s?.name ?? ''} para el ${this.selectedDayIso()}`
    );
    return `https://wa.me/${this.demoWhatsapp}?text=${text}`;
  });

  mapsUrl = computed(() => {
    const s = this.stadium();
    if (!s) return '';
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.address}, ${s.city}`)}`;
  });

  averageRating = computed(() => {
    if (!this.mockReviews.length) return 0;
    const sum = this.mockReviews.reduce((acc, r) => acc + r.stars, 0);
    return Math.round((sum / this.mockReviews.length) * 10) / 10;
  });

  stars(n: number): number[] {
    return Array(n).fill(0);
  }

  ngOnInit(): void {
    this.stadiumService.findById(1).subscribe({
      next: (data) => {
        this.stadium.set(data);
        this.loadingStadium.set(false);
        this.loadSlotsForDay();
      },
      error: () => this.loadingStadium.set(false),
    });
  }

  private buildDays(): DayOption[] {
    const labels = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const out: DayOption[] = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      out.push({
        iso: d.toISOString().slice(0, 10),
        dayLabel: i === 0 ? 'HOY' : i === 1 ? 'MAÑ' : labels[d.getDay()],
        dayNum: String(d.getDate()).padStart(2, '0'),
        month: months[d.getMonth()],
      });
    }
    return out;
  }

  selectDay(iso: string): void {
    this.selectedDayIso.set(iso);
    this.selectedRange.set(null);
    this.loadSlotsForDay();
  }

  private loadSlotsForDay(): void {
    const stadium = this.stadium();
    if (!stadium) return;

    const base: Slot[] = [];
    const pricePerSlot = Math.round((stadium.pricePerHour / 2) * 100) / 100;

    for (let h = OPEN_HOUR; h < CLOSE_HOUR; h++) {
      for (const m of [0, 30]) {
        const start = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const endMinutes = h * 60 + m + SLOT_MINUTES;
        const end = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;
        base.push({ start, end, price: pricePerSlot, status: 'available' });
      }
    }

    const isToday = this.selectedDayIso() === this.days()[0].iso;
    if (isToday) {
      const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
      for (const slot of base) {
        const [h, m] = slot.start.split(':').map(Number);
        if (h * 60 + m <= nowMinutes) slot.status = 'past';
      }
    }

    this.slots.set(base);

    this.bookingService
      .findByStadiumAndDate(stadium.id, this.selectedDayIso())
      .pipe(catchError(() => of([] as Booking[])))
      .subscribe((bookings) => this.markOccupied(bookings));
  }

  private markOccupied(bookings: Booking[]): void {
    const active = bookings.filter((b) => b.status !== 'CANCELLED');
    this.slots.update((slots) =>
      slots.map((slot) => {
        if (slot.status === 'past') return slot;
        const overlaps = active.some(
          (b) => slot.start < b.endTime.slice(0, 5) && slot.end > b.startTime.slice(0, 5)
        );
        return overlaps ? { ...slot, status: 'occupied' } : slot;
      })
    );
  }

  onSlotClick(idx: number): void {
    const slot = this.slots()[idx];
    if (slot.status === 'occupied' || slot.status === 'past') return;

    const current = this.selectedRange();

    if (!current) {
      this.selectedRange.set({ startIdx: idx, endIdx: idx });
      return;
    }

    if (idx === current.startIdx && current.startIdx === current.endIdx) {
      this.selectedRange.set(null);
      return;
    }

    if (idx === current.endIdx + 1) {
      const span = idx - current.startIdx + 1;
      if (span > MAX_SLOTS) {
        this.toast.error('Máximo 3 horas por reserva');
        return;
      }
      if (this.hasBlockedBetween(current.startIdx, idx)) {
        this.toast.error('Hay un horario ocupado en el medio');
        return;
      }
      this.selectedRange.set({ startIdx: current.startIdx, endIdx: idx });
      return;
    }

    this.selectedRange.set({ startIdx: idx, endIdx: idx });
  }

  private hasBlockedBetween(start: number, end: number): boolean {
    return this.slots()
      .slice(start, end + 1)
      .some((s) => s.status === 'occupied' || s.status === 'past');
  }

  isSelected(idx: number): boolean {
    const r = this.selectedRange();
    return !!r && idx >= r.startIdx && idx <= r.endIdx;
  }

  confirm(): void {
    if (!this.authService.isAuthenticated()) {
      this.showLoginModal.set(true);
      return;
    }

    const stadium = this.stadium();
    const range = this.selectedRange();
    if (!stadium || !range) {
      this.toast.error('Selecciona un horario');
      return;
    }

    const slots = this.slots();
    const payload = {
      stadiumId: stadium.id,
      bookingDate: this.selectedDayIso(),
      startTime: `${slots[range.startIdx].start}:00`,
      endTime: `${slots[range.endIdx].end}:00`,
    };

    this.loading.set(true);
    this.bookingService.create(payload).subscribe({
      next: () => {
        this.toast.success('Reserva creada correctamente');
        this.router.navigate(['/bookings']);
      },
      error: () => this.loading.set(false),
      complete: () => this.loading.set(false),
    });
  }

  closeModal(): void {
    this.showLoginModal.set(false);
  }

  goToLogin(): void {
    this.showLoginModal.set(false);
    this.router.navigate(['/login']);
  }
}

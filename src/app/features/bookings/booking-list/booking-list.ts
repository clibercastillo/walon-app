import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BookingService } from '../../../core/services/booking.service';
import { Booking, BookingStatus } from '../../../core/models/booking.model';
import { ToastService } from '../../../core/services/toast.service';
import { PaymentModal, PaymentResult } from '../../../shared/components/payment-modal/payment-modal';
import { ReviewModal, ReviewResult } from '../../../shared/components/review-modal/review-modal';
import { ConfirmModal } from '../../../shared/components/confirm-modal/confirm-modal';
import { ReviewService } from '../../../core/services/review.service';
import { AuthService } from '../../../core/services/auth.service';
import { AssistantService } from '../../../core/services/assistant.service';
import { StadiumService } from '../../../core/services/stadium.service';

type StatusFilter = 'ALL' | BookingStatus;

@Component({
  selector: 'app-booking-list',
  standalone: true,
  imports: [RouterLink, PaymentModal, ReviewModal, ConfirmModal],
  templateUrl: './booking-list.html',
  styleUrl: './booking-list.scss',
})
export class BookingList {
  private bookingService = inject(BookingService);
  private stadiumService = inject(StadiumService);
  private toast = inject(ToastService);
  private reviewService = inject(ReviewService);
  private authService = inject(AuthService);
  private assistant = inject(AssistantService);
  private destroyRef = inject(DestroyRef);

  bookings = signal<Booking[]>([]);
  loading = signal(true);
  actionLoadingId = signal<number | null>(null);

  // Nombres de canchas (id -> nombre) para no mostrar "Cancha #3"
  stadiumNames = signal<Record<number, string>>({});

  // Filtros por estado
  readonly filters: { key: StatusFilter; label: string }[] = [
    { key: 'ALL', label: 'Todas' },
    { key: 'PENDING', label: 'Pendientes' },
    { key: 'CONFIRMED', label: 'Confirmadas' },
    { key: 'COMPLETED', label: 'Completadas' },
    { key: 'CANCELLED', label: 'Canceladas' },
  ];
  activeFilter = signal<StatusFilter>('ALL');

  filtered = computed(() => {
    const f = this.activeFilter();
    const all = this.bookings();
    return f === 'ALL' ? all : all.filter((b) => b.status === f);
  });

  counts = computed(() => {
    const c: Partial<Record<string, number>> = { ALL: this.bookings().length };
    for (const b of this.bookings()) c[b.status] = (c[b.status] ?? 0) + 1;
    return c;
  });

  // Estado del modal de pago
  paymentModalOpen = signal(false);
  bookingToPay = signal<Booking | null>(null);

  // Estado del modal de reseña
  reviewSending = signal(false);
  reviewModalOpen = signal(false);
  bookingToReview = signal<Booking | null>(null);

  // Estado del modal de confirmación al cancelar
  cancelConfirmOpen = signal(false);
  bookingToCancel = signal<Booking | null>(null);

  ngOnInit(): void {
    this.load();
    this.loadStadiumNames();
    this.assistant.bookingCreated$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.load());
  }

  load(): void {
    this.loading.set(true);
    this.bookingService.findMine().subscribe({
      next: (data) => {
        this.bookings.set(data.sort((a, b) => b.id - a.id));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private loadStadiumNames(): void {
    this.stadiumService.findAll().subscribe({
      next: (list) => {
        const map: Record<number, string> = {};
        for (const s of list) map[s.id] = s.name;
        this.stadiumNames.set(map);
      },
      error: () => {}, // si falla, se muestra "Cancha #id"
    });
  }

  setFilter(f: StatusFilter): void {
    this.activeFilter.set(f);
  }

  // Al hacer clic en "Confirmar" primero se pide el pago (modal), no se confirma directo
  confirm(b: Booking): void {
    this.bookingToPay.set(b);
    this.paymentModalOpen.set(true);
  }

  closePaymentModal(): void {
    this.paymentModalOpen.set(false);
    this.bookingToPay.set(null);
  }

  onPaid(_result: PaymentResult): void {
    const b = this.bookingToPay();
    this.paymentModalOpen.set(false);
    this.bookingToPay.set(null);
    if (!b) return;

    this.actionLoadingId.set(b.id);
    this.bookingService.confirm(b.id).subscribe({
      next: () => {
        this.toast.success('Pago aprobado, reserva confirmada');
        this.load();
      },
      error: () => this.actionLoadingId.set(null),
      complete: () => this.actionLoadingId.set(null),
    });
  }

  // Si ya pagó (CONFIRMED) advertimos que pierde el adelanto; si no pagó (PENDING) se cancela directo
  cancel(b: Booking): void {
    if (b.status === 'CONFIRMED') {
      this.bookingToCancel.set(b);
      this.cancelConfirmOpen.set(true);
      return;
    }
    this.doCancel(b);
  }

  closeCancelConfirm(): void {
    this.cancelConfirmOpen.set(false);
    this.bookingToCancel.set(null);
  }

  confirmCancel(): void {
    const b = this.bookingToCancel();
    this.closeCancelConfirm();
    if (b) this.doCancel(b);
  }

  private doCancel(b: Booking): void {
    this.actionLoadingId.set(b.id);
    this.bookingService.cancel(b.id).subscribe({
      next: () => {
        this.toast.success('Reserva cancelada');
        this.load();
      },
      error: () => this.actionLoadingId.set(null),
      complete: () => this.actionLoadingId.set(null),
    });
  }

  complete(b: Booking): void {
    this.actionLoadingId.set(b.id);
    this.bookingService.complete(b.id).subscribe({
      next: () => {
        this.toast.success('Reserva completada');
        this.load();
        this.bookingToReview.set(b);
        this.reviewModalOpen.set(true);
      },
      error: () => this.actionLoadingId.set(null),
      complete: () => this.actionLoadingId.set(null),
    });
  }

  closeReviewModal(): void {
    this.reviewModalOpen.set(false);
    this.bookingToReview.set(null);
  }

  onReviewSubmitted(result: ReviewResult): void {
    const b = this.bookingToReview();
    if (!b) return;

    this.reviewSending.set(true);
    this.reviewService
      .create(b.id, {
        rating: result.rating,
        comment: result.comment,
        userName: this.authService.username() ?? '',
      })
      .subscribe({
        next: () => {
          this.reviewSending.set(false);
          this.closeReviewModal();
          this.toast.success('¡Gracias por tu reseña!');
        },
        error: () => this.reviewSending.set(false),
      });
  }

  // ===== Helpers de presentación =====
  stadiumName(b: Booking): string {
    return this.stadiumNames()[b.stadiumId] ?? `Cancha #${b.stadiumId}`;
  }

  private dateOf(b: Booking): Date {
    const [y, m, d] = b.bookingDate.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  day(b: Booking): string {
    return String(this.dateOf(b).getDate()).padStart(2, '0');
  }

  month(b: Booking): string {
    return this.dateOf(b).toLocaleDateString('es-PE', { month: 'short' }).replace('.', '').toUpperCase();
  }

  weekday(b: Booking): string {
    const w = this.dateOf(b).toLocaleDateString('es-PE', { weekday: 'long' });
    return w.charAt(0).toUpperCase() + w.slice(1);
  }

  duration(b: Booking): string {
    const toMin = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const hours = (toMin(b.endTime) - toMin(b.startTime)) / 60;
    if (hours <= 0) return '';
    return Number.isInteger(hours) ? `${hours} h` : `${hours.toFixed(1)} h`;
  }

  statusLabel(s: BookingStatus): string {
    return { PENDING: 'Pendiente', CONFIRMED: 'Confirmada', COMPLETED: 'Completada', CANCELLED: 'Cancelada' }[s];
  }

  statusHint(s: BookingStatus): string {
    return {
      PENDING: 'Paga para asegurar tu cancha',
      CONFIRMED: 'Pago recibido · te esperamos',
      COMPLETED: 'Partido jugado',
      CANCELLED: 'Esta reserva fue cancelada',
    }[s];
  }

  statusClass(status: string): string {
    return 'badge-' + status.toLowerCase();
  }

  reviewLabel(): string {
    const b = this.bookingToReview();
    if (!b) return '';
    return `${this.stadiumName(b)} · ${b.bookingDate}`;
  }

  paymentLabel(): string {
    const b = this.bookingToPay();
    if (!b) return '';
    return `${this.stadiumName(b)} · ${b.bookingDate} · ${b.startTime.slice(0, 5)} - ${b.endTime.slice(0, 5)}`;
  }

  cancelWarningMessage(): string {
    const b = this.bookingToCancel();
    if (!b) return '';
    return `Perderás los S/ ${b.totalPrice.toFixed(2)} que ya pagaste por ${this.stadiumName(b)} del ${b.bookingDate}. Esta acción no se puede deshacer.`;
  }
}
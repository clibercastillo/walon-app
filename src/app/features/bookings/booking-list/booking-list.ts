import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BookingService } from '../../../core/services/booking.service';
import { Booking } from '../../../core/models/booking.model';
import { ToastService } from '../../../core/services/toast.service';
import { PaymentModal, PaymentResult } from '../../../shared/components/payment-modal/payment-modal';
import { ReviewModal, ReviewResult } from '../../../shared/components/review-modal/review-modal';
import { ConfirmModal } from '../../../shared/components/confirm-modal/confirm-modal';

@Component({
  selector: 'app-booking-list',
  standalone: true,
  imports: [RouterLink, PaymentModal, ReviewModal, ConfirmModal],
  templateUrl: './booking-list.html',
  styleUrl: './booking-list.scss',
})
export class BookingList {
  private bookingService = inject(BookingService);
  private toast = inject(ToastService);

  bookings = signal<Booking[]>([]);
  loading = signal(true);
  actionLoadingId = signal<number | null>(null);

  // Estado del modal de pago
  paymentModalOpen = signal(false);
  bookingToPay = signal<Booking | null>(null);

  // Estado del modal de reseña
  reviewModalOpen = signal(false);
  bookingToReview = signal<Booking | null>(null);

  // Estado del modal de confirmación al cancelar
  cancelConfirmOpen = signal(false);
  bookingToCancel = signal<Booking | null>(null);

  ngOnInit(): void {
    this.load();
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

  // Al hacer clic en "Confirmar" primero se pide el pago (modal), no se confirma directo
  confirm(b: Booking): void {
    this.bookingToPay.set(b);
    this.paymentModalOpen.set(true);
  }

  closePaymentModal(): void {
    this.paymentModalOpen.set(false);
    this.bookingToPay.set(null);
  }

  // Se ejecuta cuando el pago (ficticio) fue "aprobado" en el modal
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
    this.closeReviewModal();
    this.toast.success('¡Gracias por tu reseña!');
    // TODO: cuando exista backend de reviews, enviar `result` aquí
  }

  reviewLabel(): string {
    const b = this.bookingToReview();
    if (!b) return '';
    return `Cancha #${b.stadiumId} · ${b.bookingDate}`;
  }

  paymentLabel(): string {
    const b = this.bookingToPay();
    if (!b) return '';
    return `Cancha #${b.stadiumId} · ${b.bookingDate} · ${b.startTime.slice(0, 5)} - ${b.endTime.slice(0, 5)}`;
  }

  cancelWarningMessage(): string {
    const b = this.bookingToCancel();
    if (!b) return '';
    return `Perderás los S/ ${b.totalPrice.toFixed(2)} que ya pagaste por la cancha #${b.stadiumId} del ${b.bookingDate}. Esta acción no se puede deshacer.`;
  }

  statusClass(status: string): string {
    return 'badge-' + status.toLowerCase();
  }
}
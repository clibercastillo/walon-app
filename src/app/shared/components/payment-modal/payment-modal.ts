import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface PaymentResult {
  cardHolder: string;
  cardNumberMasked: string; // solo últimos 4 dígitos, nunca guardamos el número completo
}

@Component({
  selector: 'app-payment-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './payment-modal.html',
  styleUrl: './payment-modal.scss',
})
export class PaymentModal {
  @Input() open = false;
  @Input() amount: number | null = null;
  @Input() bookingLabel = '';

  @Output() closed = new EventEmitter<void>();
  @Output() paid = new EventEmitter<PaymentResult>();

  cardHolder = '';
  cardNumber = '';
  expiry = ''; // MM/AA
  cvv = '';

  processing = signal(false);
  errors = signal<Record<string, string>>({});

  // Formatea "4111111111111111" -> "4111 1111 1111 1111" mientras escribe
  onCardNumberInput(value: string): void {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    this.cardNumber = digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  }

  // Formatea "1225" -> "12/25" mientras escribe
  onExpiryInput(value: string): void {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    this.expiry = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
  }

  onCvvInput(value: string): void {
    this.cvv = value.replace(/\D/g, '').slice(0, 4);
  }

  close(): void {
    if (this.processing()) return;
    this.reset();
    this.closed.emit();
  }

  submit(): void {
    const errs: Record<string, string> = {};
    const rawNumber = this.cardNumber.replace(/\s/g, '');

    if (!this.cardHolder.trim()) {
      errs['cardHolder'] = 'Ingresa el nombre del titular';
    }
    if (rawNumber.length !== 16) {
      errs['cardNumber'] = 'El número de tarjeta debe tener 16 dígitos';
    }
    if (!/^\d{2}\/\d{2}$/.test(this.expiry)) {
      errs['expiry'] = 'Formato inválido (MM/AA)';
    } else {
      const [mm, yy] = this.expiry.split('/').map(Number);
      if (mm < 1 || mm > 12) errs['expiry'] = 'Mes inválido';
    }
    if (this.cvv.length < 3) {
      errs['cvv'] = 'CVV inválido';
    }

    this.errors.set(errs);
    if (Object.keys(errs).length > 0) return;

    // Validación ficticia: solo simula una pasarela de pago (sin backend real todavía)
    this.processing.set(true);
    setTimeout(() => {
      this.processing.set(false);
      const result: PaymentResult = {
        cardHolder: this.cardHolder.trim(),
        cardNumberMasked: '**** **** **** ' + rawNumber.slice(-4),
      };
      this.reset();
      this.paid.emit(result);
    }, 1200);
  }

  private reset(): void {
    this.cardHolder = '';
    this.cardNumber = '';
    this.expiry = '';
    this.cvv = '';
    this.errors.set({});
  }
}

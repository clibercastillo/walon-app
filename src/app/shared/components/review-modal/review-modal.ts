import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface ReviewResult {
  rating: number;
  comment: string;
}

@Component({
  selector: 'app-review-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './review-modal.html',
  styleUrl: './review-modal.scss',
})
export class ReviewModal {
  @Input() open = false;
  @Input() bookingLabel = '';

  @Output() closed = new EventEmitter<void>();
  @Output() submitted = new EventEmitter<ReviewResult>();

  stars = [1, 2, 3, 4, 5];
  rating = signal(0);
  hoverRating = signal(0);
  comment = '';

  error = signal<string | null>(null);
  sending = signal(false);

  setRating(value: number): void {
    this.rating.set(value);
    this.error.set(null);
  }

  close(): void {
    if (this.sending()) return;
    this.reset();
    this.closed.emit();
  }

  submit(): void {
    if (this.rating() === 0) {
      this.error.set('Selecciona al menos una estrella');
      return;
    }

    // Reseña ficticia: aún no hay backend de reviews
    this.sending.set(true);
    setTimeout(() => {
      this.sending.set(false);
      const result: ReviewResult = { rating: this.rating(), comment: this.comment.trim() };
      this.reset();
      this.submitted.emit(result);
    }, 600);
  }

  skip(): void {
    this.reset();
    this.closed.emit();
  }

  private reset(): void {
    this.rating.set(0);
    this.hoverRating.set(0);
    this.comment = '';
    this.error.set(null);
  }
}
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
  private _open = false;

  // Al abrirse limpia el formulario
  @Input() set open(value: boolean) {
    if (value && !this._open) this.reset();
    this._open = value;
  }
  get open(): boolean {
    return this._open;
  }

  @Input() bookingLabel = '';
  @Input() sending = false;

  @Output() closed = new EventEmitter<void>();
  @Output() submitted = new EventEmitter<ReviewResult>();

  stars = [1, 2, 3, 4, 5];
  readonly maxComment = 300;
  private readonly labels = ['Toca una estrella', 'Malo', 'Regular', 'Bueno', 'Muy bueno', 'Excelente'];

  rating = signal(0);
  hoverRating = signal(0);
  comment = '';

  error = signal<string | null>(null);

  get ratingLabel(): string {
    return this.labels[this.hoverRating() || this.rating()];
  }

  setRating(value: number): void {
    this.rating.set(value);
    this.error.set(null);
  }

  close(): void {
    if (this.sending) return;
    this.closed.emit();
  }

  submit(): void {
    if (this.rating() === 0) {
      this.error.set('Selecciona al menos una estrella');
      return;
    }
    this.submitted.emit({ rating: this.rating(), comment: this.comment.trim() });
  }

  skip(): void {
    if (this.sending) return;
    this.closed.emit();
  }

  private reset(): void {
    this.rating.set(0);
    this.hoverRating.set(0);
    this.comment = '';
    this.error.set(null);
  }
}
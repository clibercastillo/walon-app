import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [],
  templateUrl: './confirm-modal.html',
  styleUrl: './confirm-modal.scss',
})
export class ConfirmModal {
  @Input() open = false;
  @Input() title = '¿Estás seguro?';
  @Input() message = '';
  @Input() confirmLabel = 'Sí, continuar';
  @Input() cancelLabel = 'Volver';
  @Input() danger = true; // botón de confirmar en rojo por defecto (acción destructiva)

  @Output() confirmed = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();
}
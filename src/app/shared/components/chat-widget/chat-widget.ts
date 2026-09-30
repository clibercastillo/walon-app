import { Component, ElementRef, effect, inject, signal, viewChild } from '@angular/core';
import { AssistantService } from '../../../core/services/assistant.service';
import { ToastService } from '../../../core/services/toast.service';
import { ChatMessage } from '../../../core/models/assistant.model';

const WELCOME: ChatMessage = {
  role: 'assistant',
  text: '¡Hola! Soy el asistente de WALON. Puedo ver horarios ocupados, crear reservas y listar tus reservas. ¿Qué necesitas?',
};
interface Part {
  text: string;
  bold: boolean;
}
@Component({
  selector: 'app-chat-widget',
  standalone: true,
  templateUrl: './chat-widget.html',
  styleUrl: './chat-widget.scss',
})
export class ChatWidget {
  private assistant = inject(AssistantService);
  private toast = inject(ToastService);

  open = signal(false);
  sending = signal(false);
  input = signal('');
  messages = signal<ChatMessage[]>([WELCOME]);
  private conversationId = crypto.randomUUID();

  private list = viewChild<ElementRef<HTMLDivElement>>('list');

  constructor() {
    // Baja el scroll al final cuando llega un mensaje nuevo
    effect(() => {
      this.messages();
      this.sending();
      setTimeout(() => {
        const el = this.list()?.nativeElement;
        if (el) el.scrollTop = el.scrollHeight;
      });
    });
  }

  parts(text: string): Part[] {
    return text
      .split(/(\*\*[^*]+\*\*)/g)
      .filter(Boolean)
      .map((s) =>
        s.startsWith('**') && s.endsWith('**') && s.length > 4
          ? { text: s.slice(2, -2), bold: true }
          : { text: s, bold: false }
      );
  }

  toggle(): void {
    this.open.update((v) => !v);
  }

  reset(): void {
    this.messages.set([WELCOME]);
    this.conversationId = crypto.randomUUID();
  }

  send(): void {
    const text = this.input().trim();
    if (!text || this.sending()) return;

    this.messages.update((m) => [...m, { role: 'user', text }]);
    this.input.set('');
    this.sending.set(true);

    this.assistant.chat(text, this.conversationId).subscribe({
      next: (res) => {
        this.messages.update((m) => [...m, { role: 'assistant', text: res.reply }]);
        this.sending.set(false);
        if (res.bookingCreated) {
          this.assistant.bookingCreated$.next();
          this.toast.success('Reserva creada. Confírmala pagando desde Mis reservas.');
        }
      },
      error: () => {
        this.messages.update((m) => [
          ...m,
          { role: 'assistant', text: 'No pude responder ahora. Intenta de nuevo en un momento.' },
        ]);
        this.sending.set(false);
      },
    });
  }
}
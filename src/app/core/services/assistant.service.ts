import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AssistantChatReply, AssistantChatRequest } from '../models/assistant.model';

@Injectable({ providedIn: 'root' })
export class AssistantService {
  private http = inject(HttpClient);

  /** Emite cuando el asistente creó una reserva (para refrescar "Mis reservas"). */
  readonly bookingCreated$ = new Subject<void>();

  chat(message: string, conversationId: string): Observable<AssistantChatReply> {
    const body: AssistantChatRequest = { message, conversationId };
    return this.http.post<AssistantChatReply>(`${environment.bookingsUrl}/assistant/chat`, body);
  }
}
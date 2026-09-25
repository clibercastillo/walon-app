import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Booking } from '../models/booking.model';

@Injectable({ providedIn: 'root' })
export class CalendarService {
  private http = inject(HttpClient);

  findAllForAdmin(from: string, to: string, stadiumId?: number): Observable<Booking[]> {
    let params = new HttpParams().set('from', from).set('to', to);
    if (stadiumId) params = params.set('stadiumId', stadiumId);
    return this.http.get<Booking[]>(`${environment.bookingsUrl}/admin`, { params });
  }
}
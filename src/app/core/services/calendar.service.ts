import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Booking } from '../models/booking.model';
import { Stadium } from '../models/stadium.model';
import { StadiumService } from './stadium.service';

// ⚠️ MOCK: no existe aún GET /api/bookings?status=CONFIRMED&from=&to=&stadiumId=
// Cuando el endpoint real esté listo en ms-bookings, reemplazar el cuerpo de
// findConfirmed() por la llamada HTTP comentada abajo y borrar el resto de este archivo.
@Injectable({ providedIn: 'root' })
export class CalendarService {
  private http = inject(HttpClient);
  private stadiumService = inject(StadiumService);

  findConfirmed(from: string, to: string, stadiumId?: number): Observable<Booking[]> {
    // --- Versión real (activar cuando exista el endpoint) ---
    // let params = new HttpParams().set('status', 'CONFIRMED').set('from', from).set('to', to);
    // if (stadiumId) params = params.set('stadiumId', stadiumId);
    // return this.http.get<Booking[]>(environment.bookingsUrl, { params });

    // --- Mock temporal ---
    return this.stadiumService.findAll().pipe(
      map((stadiums) => this.generateMock(stadiums, from, to, stadiumId))
    );
  }

  private generateMock(
    stadiums: Stadium[],
    from: string,
    to: string,
    stadiumId?: number
  ): Booking[] {
    const pool = stadiumId ? stadiums.filter((s) => s.id === stadiumId) : stadiums;
    if (pool.length === 0) return [];

    const start = new Date(from + 'T00:00:00');
    const end = new Date(to + 'T00:00:00');
    const users = ['ana@correo.com', 'luis@correo.com', 'maria@correo.com', 'carlos@correo.com'];
    const slots = [
      ['08:00:00', '09:00:00'],
      ['10:00:00', '11:00:00'],
      ['12:00:00', '13:30:00'],
      ['15:00:00', '16:00:00'],
      ['17:30:00', '19:00:00'],
      ['19:00:00', '20:30:00'],
      ['20:30:00', '22:00:00'],
    ];

    const bookings: Booking[] = [];
    let id = 1;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);
      pool.forEach((stadium, si) => {
        // Deja huecos: no todas las canchas tienen reserva todos los días
        const dayIndex = d.getDate() + si;
        const daySlots = slots.filter((_, i) => (dayIndex + i) % 3 !== 0);

        daySlots.forEach(([startTime, endTime], i) => {
          bookings.push({
            id: id++,
            stadiumId: stadium.id,
            userEmail: users[(dayIndex + i) % users.length],
            bookingDate: dateStr,
            startTime,
            endTime,
            totalPrice: stadium.pricePerHour,
            status: 'CONFIRMED',
          });
        });
      });
    }
    return bookings;
  }
}
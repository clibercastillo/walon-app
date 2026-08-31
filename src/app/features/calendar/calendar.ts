import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CalendarService } from '../../core/services/calendar.service';
import { StadiumService } from '../../core/services/stadium.service';
import { Booking } from '../../core/models/booking.model';
import { Stadium } from '../../core/models/stadium.model';

type ViewMode = 'week' | 'month';

interface CalendarEvent {
  booking: Booking;
  stadiumName: string;
  top: number;
  height: number;
}

interface MonthCell {
  date: Date;
  inMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
}

const START_HOUR = 7;
const END_HOUR = 23;
const HOUR_HEIGHT = 56; // px por hora

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './calendar.html',
  styleUrl: './calendar.scss',
})
export class CalendarPage {
  private calendarService = inject(CalendarService);
  private stadiumService = inject(StadiumService);

  viewMode = signal<ViewMode>('week');
  anchorDate = signal<Date>(this.startOfWeek(new Date()));
  loading = signal(true);
  stadiums = signal<Stadium[]>([]);
  stadiumFilter = signal<number | null>(null);
  bookings = signal<Booking[]>([]);

  hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

  weekDays = computed<Date[]>(() => {
    const start = this.startOfWeek(this.anchorDate());
    return Array.from({ length: 7 }, (_, i) => this.addDays(start, i));
  });

  weekRangeLabel = computed(() => {
    const days = this.weekDays();
    const f = (d: Date) => d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
    return `${f(days[0])} – ${f(days[6])}`;
  });

  monthLabel = computed(() =>
    this.anchorDate().toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })
  );

  monthCells = computed<MonthCell[]>(() => {
    const anchor = this.anchorDate();
    const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const gridStart = this.startOfWeek(firstOfMonth);
    const today = new Date();

    return Array.from({ length: 42 }, (_, i) => {
      const date = this.addDays(gridStart, i);
      return {
        date,
        inMonth: date.getMonth() === anchor.getMonth(),
        isToday: this.isSameDay(date, today),
        events: this.eventsForDay(date),
      };
    });
  });

  weekEventsByDay = computed<CalendarEvent[][]>(() =>
    this.weekDays().map((d) => this.eventsForDay(d))
  );

  ngOnInit(): void {
    this.stadiumService.findAll().subscribe((s) => this.stadiums.set(s));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    const [from, to] = this.rangeForLoad();
    this.calendarService
      .findConfirmed(from, to, this.stadiumFilter() ?? undefined)
      .subscribe({
        next: (data) => {
          this.bookings.set(data);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  setView(mode: ViewMode): void {
    this.viewMode.set(mode);
    this.load();
  }

  onStadiumFilterChange(): void {
    this.load();
  }

  prev(): void {
    this.anchorDate.set(
      this.viewMode() === 'week'
        ? this.addDays(this.anchorDate(), -7)
        : new Date(this.anchorDate().getFullYear(), this.anchorDate().getMonth() - 1, 1)
    );
    this.load();
  }

  next(): void {
    this.anchorDate.set(
      this.viewMode() === 'week'
        ? this.addDays(this.anchorDate(), 7)
        : new Date(this.anchorDate().getFullYear(), this.anchorDate().getMonth() + 1, 1)
    );
    this.load();
  }

  today(): void {
    this.anchorDate.set(this.viewMode() === 'week' ? this.startOfWeek(new Date()) : new Date());
    this.load();
  }

  stadiumName(id: number): string {
    return this.stadiums().find((s) => s.id === id)?.name ?? `Cancha #${id}`;
  }

  private eventsForDay(date: Date): CalendarEvent[] {
    const dateStr = this.toDateStr(date);
    return this.bookings()
      .filter((b) => b.bookingDate === dateStr)
      .map((b) => this.toEvent(b))
      .sort((a, b) => a.top - b.top);
  }

  private toEvent(booking: Booking): CalendarEvent {
    const startMin = this.toMinutes(booking.startTime);
    const endMin = this.toMinutes(booking.endTime);
    const top = ((startMin - START_HOUR * 60) / 60) * HOUR_HEIGHT;
    const height = ((endMin - startMin) / 60) * HOUR_HEIGHT;
    return {
      booking,
      stadiumName: this.stadiumName(booking.stadiumId),
      top,
      height: Math.max(height, 24),
    };
  }

  private rangeForLoad(): [string, string] {
    if (this.viewMode() === 'week') {
      const days = this.weekDays();
      return [this.toDateStr(days[0]), this.toDateStr(days[6])];
    }
    const first = this.monthCells()[0]?.date ?? this.anchorDate();
    const last = this.monthCells()[41]?.date ?? this.anchorDate();
    return [this.toDateStr(first), this.toDateStr(last)];
  }

  private toMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  private toDateStr(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  private startOfWeek(d: Date): Date {
    const date = new Date(d);
    const day = date.getDay(); // 0=domingo
    date.setDate(date.getDate() - day);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private addDays(d: Date, n: number): Date {
    const date = new Date(d);
    date.setDate(date.getDate() + n);
    return date;
  }

  private isSameDay(a: Date, b: Date): boolean {
    return a.toDateString() === b.toDateString();
  }
}
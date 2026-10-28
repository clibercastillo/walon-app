import { Component, DestroyRef, ElementRef, HostListener, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CalendarService } from '../../core/services/calendar.service';
import { StadiumService } from '../../core/services/stadium.service';
import { Booking, BookingStatus } from '../../core/models/booking.model';
import { Stadium } from '../../core/models/stadium.model';

type ViewMode = 'week' | 'month';

interface CalendarEvent {
  booking: Booking;
  stadiumName: string;
  top: number;
  height: number;
  // posición horizontal para reservas que se solapan (en %)
  left: number;
  width: number;
}

interface MonthCell {
  date: Date;
  inMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
}

const START_HOUR = 7;
const END_HOUR = 24;
const HOUR_HEIGHT = 60; // px por hora (debe coincidir con --hh en el HTML)

const STATUS_LABEL: Record<BookingStatus, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
};

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

  weekScroll = viewChild<ElementRef<HTMLElement>>('weekScroll');

  readonly hourHeight = HOUR_HEIGHT;
  readonly legend: { key: BookingStatus; label: string }[] = [
    { key: 'PENDING', label: 'Pendientes' },
    { key: 'CONFIRMED', label: 'Confirmadas' },
    { key: 'COMPLETED', label: 'Completadas' },
  ];
  readonly dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  viewMode = signal<ViewMode>('week');
  anchorDate = signal<Date>(this.startOfWeek(new Date()));
  loading = signal(true);
  stadiums = signal<Stadium[]>([]);
  stadiumFilter = signal<number | null>(null);
  bookings = signal<Booking[]>([]);
  hidden = signal<ReadonlySet<BookingStatus>>(new Set());
  selected = signal<CalendarEvent | null>(null);
  now = signal(new Date());

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

  // Posición de la línea "ahora" (null si está fuera del rango visible)
  nowTop = computed<number | null>(() => {
    const n = this.now();
    const min = n.getHours() * 60 + n.getMinutes();
    if (min < START_HOUR * 60 || min > END_HOUR * 60) return null;
    return ((min - START_HOUR * 60) / 60) * HOUR_HEIGHT;
  });

  // Reservas del periodo mostrado (en mes: solo las del mes, no las de relleno)
  periodBookings = computed(() => {
    const all = this.bookings();
    if (this.viewMode() === 'week') return all;
    const a = this.anchorDate();
    return all.filter((b) => {
      const d = this.parseDate(b.bookingDate);
      return d.getMonth() === a.getMonth() && d.getFullYear() === a.getFullYear();
    });
  });

  stats = computed(() => {
    const counts: Record<BookingStatus, number> = { PENDING: 0, CONFIRMED: 0, COMPLETED: 0, CANCELLED: 0 };
    let revenue = 0;
    const list = this.periodBookings();
    for (const b of list) {
      counts[b.status]++;
      if (b.status === 'CONFIRMED' || b.status === 'COMPLETED') revenue += b.totalPrice;
    }
    return { counts, total: list.length, revenue };
  });

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

  constructor() {
    // Actualiza la línea de "ahora" cada minuto
    const id = setInterval(() => this.now.set(new Date()), 60_000);
    inject(DestroyRef).onDestroy(() => clearInterval(id));
  }

  ngOnInit(): void {
    this.stadiumService.findAll().subscribe((s) => this.stadiums.set(s));
    this.load(true);
  }

  load(focus = false): void {
    this.loading.set(true);
    const [from, to] = this.rangeForLoad();
    this.calendarService
      .findAllForAdmin(from, to, this.stadiumFilter() ?? undefined)
      .subscribe({
        next: (data: Booking[]) => {
          this.bookings.set(data);
          this.loading.set(false);
          if (focus) this.scrollToFocus();
        },
        error: () => this.loading.set(false),
      });
  }

  setView(mode: ViewMode): void {
    if (mode === this.viewMode()) return;
    this.viewMode.set(mode);
    this.load(mode === 'week');
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
    this.load(true);
  }

  // Desde el mes: ir a la semana de ese día
  goToDay(date: Date): void {
    this.viewMode.set('week');
    this.anchorDate.set(this.startOfWeek(date));
    this.load(true);
  }

  toggleStatus(s: BookingStatus): void {
    const next = new Set(this.hidden());
    if (next.has(s)) next.delete(s);
    else next.add(s);
    this.hidden.set(next);
  }

  isHidden(s: BookingStatus): boolean {
    return this.hidden().has(s);
  }

  open(ev: CalendarEvent): void {
    this.selected.set(ev);
  }

  @HostListener('document:keydown.escape')
  close(): void {
    this.selected.set(null);
  }

  // ===== Helpers de presentación =====
  isToday(d: Date): boolean {
    return this.isSameDay(d, this.now());
  }

  hourLabel(h: number): string {
    return String(h).padStart(2, '0') + ':00';
  }

  statusLabel(s: BookingStatus): string {
    return STATUS_LABEL[s];
  }

  stadiumName(id: number): string {
    return this.stadiums().find((s) => s.id === id)?.name ?? `Cancha #${id}`;
  }

  longDate(b: Booking): string {
    const t = this.parseDate(b.bookingDate).toLocaleDateString('es-PE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  duration(b: Booking): string {
    const start = this.toMinutes(b.startTime);
    let end = this.toMinutes(b.endTime);
    if (end <= start) end += 24 * 60;
    const h = (end - start) / 60;
    return Number.isInteger(h) ? `${h} h` : `${h.toFixed(1)} h`;
  }

  // ===== Lógica interna =====
  private scrollToFocus(): void {
    setTimeout(() => {
      const el = this.weekScroll()?.nativeElement;
      if (!el) return;
      const showingToday = this.weekDays().some((d) => this.isToday(d));
      const tops = this.weekEventsByDay().flat().map((e) => e.top);
      let target = 0;
      const nowTop = this.nowTop();
      if (showingToday && nowTop !== null) target = nowTop - 140;
      else if (tops.length) target = Math.min(...tops) - 40;
      el.scrollTop = Math.max(0, target);
    }, 80);
  }

  private eventsForDay(date: Date): CalendarEvent[] {
    const dateStr = this.toDateStr(date);
    const hidden = this.hidden();
    const events = this.bookings()
      .filter((b) => b.bookingDate === dateStr && !hidden.has(b.status))
      .map((b) => this.toEvent(b));
    return this.layoutDay(events);
  }

  private toEvent(booking: Booking): CalendarEvent {
    const startRaw = this.toMinutes(booking.startTime);
    let endRaw = this.toMinutes(booking.endTime);
    if (endRaw <= startRaw) endRaw += 24 * 60;
    const startMin = Math.max(startRaw, START_HOUR * 60);
    const endMin = Math.min(endRaw, END_HOUR * 60);
    const top = ((startMin - START_HOUR * 60) / 60) * HOUR_HEIGHT;
    const height = ((endMin - startMin) / 60) * HOUR_HEIGHT;
    return {
      booking,
      stadiumName: this.stadiumName(booking.stadiumId),
      top,
      height: Math.max(height, 26),
      left: 0,
      width: 100,
    };
  }

  // Reparte en columnas las reservas que se solapan para que no se tapen entre sí
  private layoutDay(events: CalendarEvent[]): CalendarEvent[] {
    const sorted = [...events].sort((a, b) => a.top - b.top || b.height - a.height);
    let cluster: CalendarEvent[] = [];
    let clusterEnd = -1;

    const flush = () => {
      const colEnds: number[] = [];
      const colOf = new Map<CalendarEvent, number>();
      for (const ev of cluster) {
        let c = colEnds.findIndex((end) => end <= ev.top);
        if (c === -1) {
          c = colEnds.length;
          colEnds.push(0);
        }
        colEnds[c] = ev.top + ev.height;
        colOf.set(ev, c);
      }
      const n = colEnds.length;
      for (const ev of cluster) {
        ev.left = ((colOf.get(ev) ?? 0) / n) * 100;
        ev.width = 100 / n;
      }
    };

    for (const ev of sorted) {
      if (cluster.length && ev.top >= clusterEnd) {
        flush();
        cluster = [];
        clusterEnd = -1;
      }
      cluster.push(ev);
      clusterEnd = Math.max(clusterEnd, ev.top + ev.height);
    }
    if (cluster.length) flush();
    return sorted;
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

  // Fecha local (yyyy-MM-dd). toISOString() usaba UTC y podía correr el día.
  private toDateStr(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private parseDate(s: string): Date {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
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
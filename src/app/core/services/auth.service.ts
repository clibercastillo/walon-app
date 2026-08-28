import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest, RegisterRequest } from '../models/auth.model';

const TOKEN_KEY = 'campo_token';
const USERNAME_KEY = 'campo_username';
const EMAIL_KEY = 'campo_email';
const ROLES_KEY = 'campo_roles';

function readRoles(): string[] {
  try {
    const raw = localStorage.getItem(ROLES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenSignal = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  private readonly usernameSignal = signal<string | null>(localStorage.getItem(USERNAME_KEY));
  private readonly emailSignal = signal<string | null>(localStorage.getItem(EMAIL_KEY));
  private readonly rolesSignal = signal<string[]>(readRoles());

  readonly isAuthenticated = computed(() => !!this.tokenSignal());
  readonly username = computed(() => this.usernameSignal());
  readonly email = computed(() => this.emailSignal());
  readonly roles = computed(() => this.rolesSignal());
  readonly isAdmin = computed(() => this.rolesSignal().includes('ROLE_ADMIN'));

  constructor(private http: HttpClient) {}

  register(request: RegisterRequest): Observable<string> {
    return this.http.post(`${environment.authUrl}/register`, request, { responseType: 'text' });
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.authUrl}/login`, request).pipe(
      tap((res) => this.setSession(res))
    );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USERNAME_KEY);
    localStorage.removeItem(EMAIL_KEY);
    localStorage.removeItem(ROLES_KEY);
    this.tokenSignal.set(null);
    this.usernameSignal.set(null);
    this.emailSignal.set(null);
    this.rolesSignal.set([]);
  }

  getToken(): string | null {
    return this.tokenSignal();
  }

  private setSession(res: AuthResponse): void {
    const roles = res.roles ?? [];
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(USERNAME_KEY, res.username);
    localStorage.setItem(EMAIL_KEY, res.email);
    localStorage.setItem(ROLES_KEY, JSON.stringify(roles));
    this.tokenSignal.set(res.token);
    this.usernameSignal.set(res.username);
    this.emailSignal.set(res.email);
    this.rolesSignal.set(roles);
  }
}
import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { StadiumService } from '../../../core/services/stadium.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-stadium-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './stadium-form.html',
  styleUrl: './stadium-form.scss',
})
export class StadiumForm {
  private fb = inject(FormBuilder);
  private stadiumService = inject(StadiumService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loading = signal(false);
  loadingStadium = signal(false);
  editingId = signal<number | null>(null);

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    address: ['', Validators.required],
    city: ['', Validators.required],
    capacity: [10, [Validators.required, Validators.min(1)]],
    fieldType: ['sintetico', Validators.required],
    pricePerHour: [50, [Validators.required, Validators.min(1)]],
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) return;

    const id = Number(idParam);
    this.editingId.set(id);
    this.loadingStadium.set(true);
    this.stadiumService.findById(id).subscribe({
      next: (stadium) => {
        this.form.patchValue({
          name: stadium.name,
          address: stadium.address,
          city: stadium.city,
          capacity: stadium.capacity,
          fieldType: stadium.fieldType,
          pricePerHour: stadium.pricePerHour,
        });
        this.loadingStadium.set(false);
      },
      error: () => {
        this.toast.error('No se pudo cargar la cancha');
        this.loadingStadium.set(false);
        this.router.navigate(['/stadiums']);
      },
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);

    const id = this.editingId();
    const request$ = id
      ? this.stadiumService.update(id, this.form.getRawValue())
      : this.stadiumService.create(this.form.getRawValue());

    request$.subscribe({
      next: () => {
        this.toast.success(id ? 'Cancha actualizada correctamente' : 'Cancha registrada correctamente');
        this.router.navigate(['/stadiums']);
      },
      error: () => this.loading.set(false),
      complete: () => this.loading.set(false),
    });
  }
}
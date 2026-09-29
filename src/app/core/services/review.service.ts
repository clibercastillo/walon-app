import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Review, ReviewRequest } from '../models/review.model';

@Injectable({ providedIn: 'root' })
export class ReviewService {
  constructor(private http: HttpClient) {}

  create(bookingId: number, request: ReviewRequest): Observable<Review> {
    return this.http.post<Review>(`${environment.bookingsUrl}/${bookingId}/review`, request);
  }

  findByStadium(stadiumId: number): Observable<Review[]> {
    return this.http.get<Review[]>(`${environment.bookingsUrl}/reviews/stadium/${stadiumId}`);
  }
}
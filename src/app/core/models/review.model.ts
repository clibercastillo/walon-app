export interface Review {
  id: number;
  bookingId: number;
  stadiumId: number;
  userName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface ReviewRequest {
  rating: number;
  comment: string;
  userName: string;
}
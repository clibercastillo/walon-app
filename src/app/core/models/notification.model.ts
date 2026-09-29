export interface AppNotification {
  id: number;
  bookingId: number;
  message: string;
  channel: string;
  createdAt: string;
  read: boolean;
}

export interface NotificationPage {
  content: AppNotification[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  unreadCount: number;
}
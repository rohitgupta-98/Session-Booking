import { Request } from 'express';

export enum SessionStatus {
  AVAILABLE = 'AVAILABLE',
  BOOKED = 'BOOKED',
  COMPLETED = 'COMPLETED',
}

export interface PaginatedRequest extends Request {
  query: {
    dateTimestamp?: string;
    [key: string]: string | undefined;
  };
}

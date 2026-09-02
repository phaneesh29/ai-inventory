import { Response } from "express";

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

export const sendSuccess = <T>(
  res: Response,
  data?: T,
  message?: string,
  statusCode = 200
): Response => {
  const response: ApiResponse<T> = {
    success: true,
    ...(message && { message }),
    ...(data !== undefined && { data }),
    timestamp: new Date().toISOString(),
  };
  return res.status(statusCode).json(response);
};

export const sendPaginated = <T>(
  res: Response,
  data: T[],
  total: number,
  limit: number,
  offset: number,
  message?: string,
  statusCode = 200
): Response => {
  const response: ApiResponse<T[]> = {
    success: true,
    ...(message && { message }),
    data,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + data.length < total,
    },
    timestamp: new Date().toISOString(),
  };
  return res.status(statusCode).json(response);
};

export const sendError = (
  res: Response,
  message: string,
  statusCode = 500,
  errorCode = "INTERNAL_SERVER_ERROR",
  details?: any
): Response => {
  const response: ApiResponse = {
    success: false,
    error: {
      code: errorCode,
      message,
      ...(details !== undefined && { details }),
    },
    timestamp: new Date().toISOString(),
  };
  return res.status(statusCode).json(response);
};

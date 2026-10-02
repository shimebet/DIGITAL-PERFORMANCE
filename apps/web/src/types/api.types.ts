export interface ApiErrorResponse {
  statusCode?: number;

  message: string | string[];

  error?: string;

  timestamp?: string;

  path?: string;
}

export interface ApiMessageResponse {
  success?: boolean;
  message: string;
}
declare module "@/api" {
  export const API_URL: string;

  export interface DecodedToken {
    sub?: number;
    email?: string | null;
    username?: string;
    user_name?: string;
    name?: string;
    employee_id?: string;
    role?: string;
    [key: string]: string | number | boolean | null | undefined;
  }

  export function isTokenExpired(token?: string | null): boolean;
  export function loginUser(identifier: string, password: string): Promise<any>;
  export function logoutUser(): Promise<any>;
  export function decodeToken(token: string): DecodedToken | null;
  export function handleAuthError(): void;
}

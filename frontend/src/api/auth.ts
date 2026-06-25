import { apiClient } from './client'

export interface AuthResponse {
  accessToken: string
  tokenType: string
  expiresIn: number
  email: string
  username: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  username: string
  email: string
  password: string
}

/** POST /api/auth/login */
export async function login(data: LoginPayload): Promise<AuthResponse> {
  const res = await apiClient.post<AuthResponse>('/api/auth/login', data)
  return res.data
}

/** POST /api/auth/register */
export async function register(data: RegisterPayload): Promise<AuthResponse> {
  const res = await apiClient.post<AuthResponse>('/api/auth/register', data)
  return res.data
}

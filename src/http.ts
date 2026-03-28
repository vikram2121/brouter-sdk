import { PaymentRequired, BrouterError } from './errors.js'
import type { PaymentRequiredData } from './types.js'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export class HttpClient {
  private baseUrl: string
  private token?: string
  private _fetch: typeof fetch

  constructor(baseUrl: string, token?: string, fetchImpl?: typeof fetch) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.token = token
    this._fetch = fetchImpl ?? globalThis.fetch
  }

  setToken(token: string) {
    this.token = token
  }

  async request<T>(
    method: HttpMethod,
    path: string,
    body?: unknown,
    extraHeaders?: Record<string, string>
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...extraHeaders,
    }
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    const res = await this._fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })

    // 402 — parse and throw PaymentRequired
    if (res.status === 402) {
      const data = await res.json() as PaymentRequiredData
      throw new PaymentRequired(data)
    }

    const json = await res.json() as { success: boolean; data?: T; error?: string }

    if (!res.ok || !json.success) {
      throw new BrouterError(
        res.status,
        json.error ?? `HTTP ${res.status}`,
        json
      )
    }

    return json.data as T
  }

  get<T>(path: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>('GET', path, undefined, headers)
  }

  post<T>(path: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
    return this.request<T>('POST', path, body, headers)
  }

  put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, body)
  }
}

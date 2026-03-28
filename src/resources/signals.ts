import type { HttpClient } from '../http.js'
import type { VoteParams, Signal } from '../types.js'

export class SignalsResource {
  constructor(private http: HttpClient) {}

  /** Vote on a signal. Minimum 100 sats. */
  vote(signalId: string, params: VoteParams): Promise<{ vote: unknown }> {
    return this.http.post(`/api/signals/${signalId}/vote`, params)
  }

  /** Get a signal by ID. */
  get(signalId: string): Promise<{ signal: Signal }> {
    return this.http.get(`/api/signals/${signalId}`)
  }
}

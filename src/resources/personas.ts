import type { HttpClient } from '../http.js'
import type { PersonaSummary } from '../types.js'

export class PersonasResource {
  constructor(private http: HttpClient) {}

  /** List all available persona templates. */
  async list(): Promise<{ personas: PersonaSummary[] }> {
    return this.http.get('/api/personas')
  }
}

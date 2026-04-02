import { HttpClient } from './http.js'
import { AgentsResource } from './resources/agents.js'
import { MarketsResource } from './resources/markets.js'
import { SignalsResource } from './resources/signals.js'
import { OracleResource } from './resources/oracle.js'
import { JobsResource } from './resources/jobs.js'
import { PersonasResource } from './resources/personas.js'
import { ComputeResource } from './resources/compute.js'
import type { BrouterClientOptions, RegisterParams, RegisterResponse, DiscoverResponse } from './types.js'

export const DEFAULT_BASE_URL = 'https://brouter.ai'

export class BrouterClient {
  readonly agents: AgentsResource
  readonly markets: MarketsResource
  readonly signals: SignalsResource
  readonly oracle: OracleResource
  readonly jobs: JobsResource
  readonly compute: ComputeResource
  readonly personas: PersonasResource

  private http: HttpClient

  constructor(options: BrouterClientOptions = {}) {
    this.http = new HttpClient(
      options.baseUrl ?? DEFAULT_BASE_URL,
      options.token,
      options.fetch
    )
    this.agents   = new AgentsResource(this.http)
    this.markets  = new MarketsResource(this.http)
    this.signals  = new SignalsResource(this.http)
    this.oracle   = new OracleResource(this.http)
    this.jobs     = new JobsResource(this.http)
    this.compute  = new ComputeResource(this.http)
    this.personas = new PersonasResource(this.http)
  }

  /**
   * Shortcut: register a new agent and return a pre-authenticated client.
   *
   * @example
   * const { client, token, agent } = await BrouterClient.register({
   *   name: 'myagent',
   *   publicKey: '02a1b2c3...',
   *   bsvAddress: '1MyBSVAddress...',
   * })
   * // client is ready to use with the agent's token
   * await client.markets.list()
   */
  static async register(
    params: RegisterParams,
    options?: Omit<BrouterClientOptions, 'token'>
  ): Promise<{ client: BrouterClient; token: string; registration: RegisterResponse }> {
    const client = new BrouterClient(options)
    const registration = await client.agents.register(params)
    return { client, token: registration.token, registration }
  }

  /**
   * Discover the platform: version, open markets, and all endpoint paths.
   * Useful for agents bootstrapping — no auth required.
   */
  discover(): Promise<DiscoverResponse> {
    return this.http.get('/api/discover')
  }

  /**
   * Set or replace the auth token (e.g. after loading from storage).
   */
  setToken(token: string): this {
    this.http.setToken(token)
    return this
  }
}

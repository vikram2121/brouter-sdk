import type { HttpClient } from '../http.js'
import type {
  RegisterParams, RegisterResponse, Agent,
  WalletStats, CalibrationResponse, UpdateAgentParams,
  FaucetResponse, Job,
} from '../types.js'

export class AgentsResource {
  constructor(private http: HttpClient) {}

  /**
   * Register a new agent. Returns the agent record + JWT token.
   * Token is automatically set on the client for subsequent calls.
   */
  async register(params: RegisterParams): Promise<RegisterResponse> {
    const data = await this.http.post<RegisterResponse>('/api/agents/register', params)
    if (data.token) this.http.setToken(data.token)
    return data
  }

  /** Get an agent by ID. */
  get(agentId: string): Promise<{ agent: Agent }> {
    return this.http.get(`/api/agents/${agentId}`)
  }

  /** Update agent description or callbackUrl. */
  update(agentId: string, params: UpdateAgentParams): Promise<{ agent: Agent }> {
    return this.http.put(`/api/agents/${agentId}`, params)
  }

  /**
   * Claim 5000 starter sats. One-time per agent.
   * Requires agent to have a bsvAddress.
   */
  faucet(agentId: string): Promise<FaucetResponse> {
    return this.http.post(`/api/agents/${agentId}/faucet`)
  }

  /** Live wallet stats: balance, 7d earnings, staked sats, x402 count. */
  walletStats(agentId: string): Promise<WalletStats> {
    return this.http.get(`/api/agents/${agentId}/wallet-stats`)
  }

  /** Brier calibration scores per domain. */
  calibration(agentId: string): Promise<CalibrationResponse> {
    return this.http.get(`/api/agents/${agentId}/calibration`)
  }

  /** All jobs where agent is poster or worker. */
  jobs(agentId: string): Promise<{ jobs: Job[] }> {
    return this.http.get(`/api/agents/${agentId}/jobs`)
  }
}

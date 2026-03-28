import type { HttpClient } from '../http.js'
import type {
  Market, CreateMarketParams, ListMarketsParams,
  Stake, StakeParams, Signal, PostSignalParams, VoteParams,
  ConsensusClaimParams, CommitParams, RevealParams,
} from '../types.js'

export class MarketsResource {
  constructor(private http: HttpClient) {}

  /** Create a new market. */
  create(params: CreateMarketParams): Promise<{ market: Market }> {
    return this.http.post('/api/markets', params)
  }

  /** List markets with optional filters. */
  list(params?: ListMarketsParams): Promise<{ markets: Market[]; total: number }> {
    const qs = params ? '?' + new URLSearchParams(
      Object.fromEntries(
        Object.entries(params)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)])
      )
    ).toString() : ''
    return this.http.get(`/api/markets${qs}`)
  }

  /** Get a single market with positions and signals. */
  get(marketId: string): Promise<{ market: Market }> {
    return this.http.get(`/api/markets/${marketId}`)
  }

  // ── Staking ──────────────────────────────────────────────────────────────

  /** Take a position on a market. Minimum 100 sats. */
  stake(marketId: string, params: StakeParams): Promise<{ stake: Stake }> {
    return this.http.post(`/api/markets/${marketId}/stake`, params)
  }

  /** Get all stakes for a market. */
  stakes(marketId: string): Promise<{ stakes: Stake[] }> {
    return this.http.get(`/api/markets/${marketId}/stakes`)
  }

  // ── Signals ──────────────────────────────────────────────────────────────

  /** Post a signal for a market. */
  postSignal(marketId: string, params: PostSignalParams): Promise<{ signal: Signal }> {
    return this.http.post(`/api/markets/${marketId}/signal`, params)
  }

  /** Get all signals for a market. */
  signals(marketId: string): Promise<{ signals: Signal[] }> {
    return this.http.get(`/api/markets/${marketId}/signals`)
  }

  // ── Consensus (Tier 2) ───────────────────────────────────────────────────

  /** Submit a staked claim on the resolution outcome. */
  consensusClaim(marketId: string, params: ConsensusClaimParams): Promise<unknown> {
    return this.http.post(`/api/markets/${marketId}/consensus/claim`, params)
  }

  /** Get current consensus claims and tally. */
  consensusClaims(marketId: string): Promise<unknown> {
    return this.http.get(`/api/markets/${marketId}/consensus/claims`)
  }

  // ── Commit-Reveal (Tier 3) ───────────────────────────────────────────────

  /**
   * Phase 1 of commit-reveal: submit hashed vote.
   * hash = SHA256(outcome + salt)
   * @example
   * import { createHash } from 'crypto'
   * const hash = createHash('sha256').update('yes' + 'mysecret').digest('hex')
   */
  commit(marketId: string, params: CommitParams): Promise<unknown> {
    return this.http.post(`/api/markets/${marketId}/consensus/commit`, params)
  }

  /** Phase 2 of commit-reveal: reveal your vote after commit phase closes. */
  reveal(marketId: string, params: RevealParams): Promise<unknown> {
    return this.http.post(`/api/markets/${marketId}/consensus/reveal`, params)
  }
}

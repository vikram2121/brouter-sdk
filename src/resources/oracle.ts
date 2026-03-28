import type { HttpClient } from '../http.js'
import type {
  OraclePublishParams, OraclePublishResponse,
  OracleSignalsResponse, OracleSignal,
  CalibrationLeader,
} from '../types.js'
import { PaymentRequired } from '../errors.js'

export class OracleResource {
  constructor(private http: HttpClient) {}

  /**
   * Publish a priced oracle signal to the Anvil BSV mesh.
   * Requires bsvAddress on the agent for monetised=true.
   */
  publish(agentId: string, params: OraclePublishParams): Promise<OraclePublishResponse> {
    return this.http.post(`/api/agents/${agentId}/oracle/publish`, params)
  }

  /** View your published oracle signal history. */
  mySignals(agentId: string): Promise<OracleSignalsResponse> {
    return this.http.get(`/api/agents/${agentId}/oracle/signals`)
  }

  /**
   * Query all oracle signals for a market.
   *
   * Free signals are returned directly.
   * Monetised signals throw `PaymentRequired` — catch it to inspect
   * `err.payment` and build an X-Payment header.
   *
   * @param xPayment - base64-encoded payment header (retry after paying)
   *
   * @example
   * try {
   *   return await brouter.oracle.marketSignals(marketId)
   * } catch (err) {
   *   if (err instanceof PaymentRequired) {
   *     const xp = buildXPayment(err.payment.payeeLockingScript, err.payment.priceSats)
   *     return await brouter.oracle.marketSignals(marketId, xp)
   *   }
   *   throw err
   * }
   */
  async marketSignals(
    marketId: string,
    xPayment?: string
  ): Promise<{ signals: OracleSignal[]; free_count: number; paid_count: number }> {
    const headers = xPayment ? { 'X-Payment': xPayment } : undefined
    try {
      return await this.http.get(`/api/markets/${marketId}/oracle/signals`, headers)
    } catch (err) {
      if (err instanceof PaymentRequired) throw err
      throw err
    }
  }

  /** Global calibration leaderboard — top agents per domain. */
  leaderboard(): Promise<{ leaderboard: Record<string, CalibrationLeader[]> }> {
    return this.http.get('/api/calibration/top')
  }
}

export { PaymentRequired }

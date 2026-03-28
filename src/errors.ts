import type { PaymentRequiredData } from './types.js'

/**
 * Thrown when the server returns HTTP 402 Payment Required.
 * Contains the full payment descriptor so your agent can pay and retry.
 *
 * @example
 * try {
 *   const signals = await brouter.oracle.marketSignals(marketId)
 * } catch (err) {
 *   if (err instanceof PaymentRequired) {
 *     const { priceSats, payeeLockingScript } = err.payment
 *     const xPayment = buildXPayment(payeeLockingScript, priceSats)
 *     const signals = await brouter.oracle.marketSignals(marketId, xPayment)
 *   }
 * }
 */
export class PaymentRequired extends Error {
  readonly status = 402
  readonly payment: PaymentRequiredData['payment']
  readonly freeSignals: PaymentRequiredData['free_signals']
  readonly freeCount: number
  readonly paidCount: number
  readonly raw: PaymentRequiredData

  constructor(data: PaymentRequiredData) {
    super(`Payment required: ${data.payment.priceSats} sats to ${data.payment.payeeLockingScript.slice(0, 20)}…`)
    this.name = 'PaymentRequired'
    this.raw = data
    this.payment = data.payment
    this.freeSignals = data.free_signals
    this.freeCount = data.free_count
    this.paidCount = data.paid_count
  }
}

/** Thrown when the server returns a non-2xx, non-402 error. */
export class BrouterError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(status: number, message: string, body?: unknown) {
    super(message)
    this.name = 'BrouterError'
    this.status = status
    this.body = body
  }
}

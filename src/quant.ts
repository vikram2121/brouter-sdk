/**
 * quant.ts — Quantitative finance utilities for Brouter agents
 *
 * Implements the core formulas for edge detection, position sizing,
 * arbitrage detection, and performance measurement.
 *
 * All functions are pure (no side effects), deterministic, and safe to
 * call in any agent callback handler.
 *
 * Reference formulas from: Brouter Agent Trading System v1
 */

// ─── Edge Detection ────────────────────────────────────────────────────────────

/**
 * Expected Value of a binary bet.
 * EV = p * b - (1 - p)
 *
 * @param p     Model probability of YES (0–1)
 * @param b     Decimal odds minus 1. E.g. evens = 1.0, 2:1 = 2.0
 * @returns     Expected value per unit staked. Positive = profitable bet.
 */
export function expectedValue(p: number, b: number): number {
  return p * b - (1 - p)
}

/**
 * Market edge — difference between model probability and market-implied probability.
 * edge = p_model - p_market
 *
 * Rule: only stake when edge > 0.04 (4% minimum edge).
 *
 * @param pModel   Agent's estimated probability (0–1)
 * @param pMarket  Market-implied probability (0–1). For binary: implied = stake_yes / total_stakes
 * @returns        Edge as a decimal. Positive = model says YES is underpriced.
 */
export function marketEdge(pModel: number, pMarket: number): number {
  return pModel - pMarket
}

/**
 * Bayes update — revise prior probability given new evidence.
 * P(H|E) = P(E|H) * P(H) / P(E)
 *
 * @param prior       Prior probability P(H) — agent's current belief (0–1)
 * @param likelihood  P(E|H) — probability of observing the evidence if hypothesis is true
 * @param marginal    P(E) — total probability of the evidence. If unsure, use base rate.
 * @returns           Posterior probability P(H|E)
 */
export function bayesUpdate(prior: number, likelihood: number, marginal: number): number {
  if (marginal === 0) return prior
  return (likelihood * prior) / marginal
}

/**
 * Brier Score — measures calibration accuracy of probabilistic predictions.
 * BS = (1/n) * Σ(p_i - o_i)²
 *
 * Lower is better. Perfect calibration = 0. Random = 0.25.
 * Note: Brouter's calibration_scores table stores the inverse (higher = better).
 *
 * @param predictions  Array of { prob: number (0–1), outcome: 0 | 1 } pairs
 * @returns            Brier Score (0–1, lower is better)
 */
export function brierScore(predictions: Array<{ prob: number; outcome: 0 | 1 }>): number {
  if (predictions.length === 0) return 0
  const sumSquaredErrors = predictions.reduce((sum, { prob, outcome }) => {
    return sum + Math.pow(prob - outcome, 2)
  }, 0)
  return sumSquaredErrors / predictions.length
}

// ─── Position Sizing ───────────────────────────────────────────────────────────

/**
 * Kelly Criterion — optimal fraction of bankroll to stake.
 * f* = (p * b - q) / b   where q = 1 - p
 *
 * @param p         Probability of winning (0–1)
 * @param b         Net odds received on the bet (decimal odds - 1)
 * @returns         Optimal fraction of bankroll (0–1). Negative = don't bet.
 */
export function kellyCriterion(p: number, b: number): number {
  const q = 1 - p
  return (p * b - q) / b
}

/**
 * Fractional Kelly — reduces variance by using a fraction of the full Kelly stake.
 * f = alpha * f*    where alpha ∈ (0, 1]
 *
 * Recommended: alpha = 0.25–0.5 for most agents.
 * Use lower alpha when model confidence is lower.
 *
 * @param p       Probability of winning (0–1)
 * @param b       Net odds (decimal odds - 1)
 * @param alpha   Kelly fraction (0–1). Default 0.25 (quarter Kelly — conservative)
 * @returns       Fraction of bankroll to stake (0–1)
 */
export function fractionalKelly(p: number, b: number, alpha = 0.25): number {
  return alpha * kellyCriterion(p, b)
}

/**
 * Kelly stake in sats — converts Kelly fraction to an absolute sats amount.
 * Clamps to [0, bankroll]. Never returns negative.
 *
 * @param p           Probability of winning (0–1)
 * @param b           Net odds (decimal odds - 1)
 * @param bankrollSats Agent's current balance in satoshis
 * @param alpha       Kelly fraction (default 0.25)
 * @param minSats     Minimum stake (default 100 sats)
 * @param maxSats     Maximum stake cap (default bankroll)
 * @returns           Stake in satoshis (integer)
 */
export function kellySats(
  p: number,
  b: number,
  bankrollSats: number,
  alpha = 0.25,
  minSats = 100,
  maxSats?: number
): number {
  const f = fractionalKelly(p, b, alpha)
  if (f <= 0) return 0
  const raw = Math.floor(f * bankrollSats)
  const capped = Math.min(raw, maxSats ?? bankrollSats)
  return Math.max(minSats, capped)
}

/**
 * Value at Risk (95%) — maximum expected daily loss at 95% confidence.
 * VaR = μ - 1.645 * σ
 *
 * @param returns   Array of historical daily returns (as decimals, e.g. 0.02 = +2%)
 * @returns         VaR as a negative decimal (loss). E.g. -0.05 = max 5% daily loss.
 */
export function valueAtRisk95(returns: number[]): number {
  if (returns.length < 2) return 0
  const mu = returns.reduce((a, b) => a + b, 0) / returns.length
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mu, 2), 0) / returns.length
  const sigma = Math.sqrt(variance)
  return mu - 1.645 * sigma
}

/**
 * Max Drawdown — largest peak-to-trough decline in a returns series.
 * MDD = (Peak - Trough) / Peak
 *
 * Rule: block new trades if MDD > 0.08 (8%).
 *
 * @param equityCurve  Array of cumulative portfolio values (e.g. balance over time)
 * @returns            Max drawdown as a positive decimal (0–1). E.g. 0.08 = 8% drawdown.
 */
export function maxDrawdown(equityCurve: number[]): number {
  if (equityCurve.length < 2) return 0
  let peak = equityCurve[0]
  let mdd = 0
  for (const value of equityCurve) {
    if (value > peak) peak = value
    const dd = (peak - value) / peak
    if (dd > mdd) mdd = dd
  }
  return mdd
}

// ─── Arbitrage & Performance ────────────────────────────────────────────────────

/**
 * Arbitrage condition — checks if sum of reciprocal odds < 1.
 * Σ (1/odds_i) < 1 → profit opportunity exists
 *
 * @param decimalOdds  Array of decimal odds for each outcome (e.g. [2.1, 2.1])
 * @returns            { arb: boolean, margin: number }
 *                     arb = true if arbitrage exists
 *                     margin = how much below 1.0 (positive = profit, negative = overround)
 */
export function arbCondition(decimalOdds: number[]): { arb: boolean; margin: number } {
  const sum = decimalOdds.reduce((acc, o) => acc + 1 / o, 0)
  return {
    arb: sum < 1,
    margin: 1 - sum,
  }
}

/**
 * Mispricing score — Z-score of model vs market divergence.
 * δ = (p_model - p_market) / σ
 *
 * High δ (> 2.0) = strong signal to trade. Low δ = noise.
 *
 * @param pModel     Agent's estimated probability
 * @param pMarket    Market-implied probability
 * @param sigma      Standard deviation of historical model errors (calibration uncertainty)
 *                   If unknown, use 0.1 as a conservative estimate.
 * @returns          Z-score. > 2.0 is a strong mispricing signal.
 */
export function mispricingScore(pModel: number, pMarket: number, sigma: number): number {
  if (sigma === 0) return 0
  return (pModel - pMarket) / sigma
}

/**
 * Sharpe Ratio — risk-adjusted return.
 * SR = (E[R] - Rf) / σ(R)
 *
 * Target: SR > 2.0 for a healthy agent.
 *
 * @param returns    Array of period returns (decimals)
 * @param riskFree   Risk-free rate per period (default 0 — appropriate for BSV)
 * @returns          Sharpe ratio. > 2.0 = excellent, 1.0–2.0 = good, < 1.0 = poor.
 */
export function sharpeRatio(returns: number[], riskFree = 0): number {
  if (returns.length < 2) return 0
  const mu = returns.reduce((a, b) => a + b, 0) / returns.length
  const excessMu = mu - riskFree
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mu, 2), 0) / returns.length
  const sigma = Math.sqrt(variance)
  if (sigma === 0) return 0
  return excessMu / sigma
}

/**
 * Profit Factor — ratio of gross profits to gross losses.
 * PF = gross_profit / gross_loss
 *
 * Healthy agent: PF > 1.5. Below 1.0 = net losing.
 *
 * @param trades  Array of trade PnLs in sats (positive = profit, negative = loss)
 * @returns       Profit factor. Infinity if no losses.
 */
export function profitFactor(trades: number[]): number {
  const grossProfit = trades.filter(t => t > 0).reduce((a, b) => a + b, 0)
  const grossLoss = Math.abs(trades.filter(t => t < 0).reduce((a, b) => a + b, 0))
  if (grossLoss === 0) return Infinity
  return grossProfit / grossLoss
}

// ─── Composite helpers ─────────────────────────────────────────────────────────

/**
 * shouldStake — single guard function combining all risk checks.
 *
 * Returns { stake: number, reason: string } where stake = 0 means don't bet.
 * Implements the full pipeline:
 *   1. Edge check (> MIN_EDGE)
 *   2. MDD circuit breaker (< MAX_MDD)
 *   3. Kelly sizing with fractional alpha
 *
 * @param pModel        Agent's probability estimate
 * @param pMarket       Market-implied probability
 * @param bankrollSats  Current balance
 * @param equityCurve   Historical balance values (for MDD check)
 * @param opts          Overrides for thresholds
 */
export function shouldStake(
  pModel: number,
  pMarket: number,
  bankrollSats: number,
  equityCurve: number[] = [],
  opts: {
    minEdge?: number    // default 0.04 (4%)
    maxMdd?: number     // default 0.08 (8%)
    kellyAlpha?: number // default 0.25
    minSats?: number    // default 100
    maxSats?: number
    b?: number          // net odds, default 1.0 (evens)
  } = {}
): { stake: number; reason: string } {
  const {
    minEdge = 0.04,
    maxMdd = 0.08,
    kellyAlpha = 0.25,
    minSats = 100,
    maxSats,
    b = 1.0,
  } = opts

  const edge = marketEdge(pModel, pMarket)
  if (edge <= minEdge) {
    return { stake: 0, reason: `edge ${edge.toFixed(4)} ≤ min ${minEdge} — no bet` }
  }

  if (equityCurve.length >= 2) {
    const mdd = maxDrawdown(equityCurve)
    if (mdd >= maxMdd) {
      return { stake: 0, reason: `MDD ${(mdd * 100).toFixed(1)}% ≥ max ${maxMdd * 100}% — circuit breaker` }
    }
  }

  const stake = kellySats(pModel, b, bankrollSats, kellyAlpha, minSats, maxSats)
  if (stake === 0) {
    return { stake: 0, reason: 'Kelly returned 0 — negative EV at these odds' }
  }

  return {
    stake,
    reason: `edge ${edge.toFixed(4)}, Kelly ${(fractionalKelly(pModel, b, kellyAlpha) * 100).toFixed(1)}% → ${stake} sats`,
  }
}

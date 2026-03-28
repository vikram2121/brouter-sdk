/**
 * Build the X-Payment header required to access monetised oracle signals.
 *
 * Works in both Node.js (Buffer) and browsers (Uint8Array / btoa).
 *
 * @example
 * try {
 *   await brouter.oracle.marketSignals(marketId)
 * } catch (err) {
 *   if (err instanceof PaymentRequired) {
 *     const xp = buildXPayment(err.payment.payeeLockingScript, err.payment.priceSats)
 *     const signals = await brouter.oracle.marketSignals(marketId, xp)
 *   }
 * }
 */
export function buildXPayment(payeeLockingScriptHex: string, priceSats: number): string {
  const lockingScript = hexToBytes(payeeLockingScriptHex)

  const parts: Uint8Array[] = []
  parts.push(fromHex('01000000'))        // version
  parts.push(fromHex('01'))              // input count
  parts.push(new Uint8Array(32))         // prev txid (32 zeros = coinbase-style stub)
  parts.push(fromHex('ffffffff'))        // prev vout index
  parts.push(fromHex('00'))             // empty scriptSig
  parts.push(fromHex('ffffffff'))        // sequence
  parts.push(fromHex('01'))              // output count

  // 8-byte little-endian value
  const val = new Uint8Array(8)
  const view = new DataView(val.buffer)
  // priceSats fits in 32 bits for any realistic micropayment
  view.setUint32(0, priceSats >>> 0, true)
  view.setUint32(4, Math.floor(priceSats / 0x100000000) >>> 0, true)
  parts.push(val)

  // varint for script length (assumes length < 0xfd for typical P2PKH)
  parts.push(new Uint8Array([lockingScript.length]))
  parts.push(lockingScript)
  parts.push(fromHex('00000000'))        // locktime

  const txbytes = concat(parts)
  const txhex = bytesToHex(txbytes)

  const payload = JSON.stringify({ txhex, payeeLockingScript: payeeLockingScriptHex, priceSats })
  return toBase64(payload)
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fromHex(hex: string): Uint8Array {
  return hexToBytes(hex)
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

function concat(arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((n, a) => n + a.length, 0)
  const result = new Uint8Array(total)
  let offset = 0
  for (const arr of arrays) {
    result.set(arr, offset)
    offset += arr.length
  }
  return result
}

function toBase64(str: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str).toString('base64')
  }
  return btoa(str)
}

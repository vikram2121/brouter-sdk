import type { HttpClient } from '../http.js'
import type {
  ComputeListing, CreateListingParams, ListListingsParams,
  ComputeBooking, BookSlotParams, ListBookingsParams,
  ComputeReceipt, UsageResponse,
} from '../types.js'

export class ComputeResource {
  constructor(private http: HttpClient) {}

  // ── Listings ────────────────────────────────────────────────────────────────

  /** Create a new compute listing (GPU or inference slot). */
  createListing(params: CreateListingParams): Promise<{ listing: ComputeListing }> {
    return this.http.post('/api/compute/listings', params)
  }

  /** Browse listings — filter by type, status, or agent. */
  listListings(params?: ListListingsParams): Promise<{ listings: ComputeListing[]; total: number }> {
    const qs = params ? '?' + new URLSearchParams(params as any).toString() : ''
    return this.http.get(`/api/compute/listings${qs}`)
  }

  /** Get a single listing with active booking count. */
  getListing(listingId: string): Promise<{ listing: ComputeListing }> {
    return this.http.get(`/api/compute/listings/${listingId}`)
  }

  /**
   * Update a listing — change specs, price, or status.
   * Pass `{ status: 'paused' }` to stop new bookings.
   * Pass `{ status: 'deleted' }` to soft-delete.
   */
  updateListing(listingId: string, params: Partial<CreateListingParams> & { status?: string }): Promise<{ listing: ComputeListing }> {
    return this.http.patch(`/api/compute/listings/${listingId}`, params)
  }

  // ── Bookings ────────────────────────────────────────────────────────────────

  /**
   * Book a slot.
   *
   * - Deducts `priceSats` from your balance immediately (held in escrow).
   * - Instant mode (`availabilityMode: 'instant'`): starts `active` immediately.
   * - Scheduled mode: specify `startsAt`; status is `reserved` until slot begins.
   *
   * Provider is notified via their `callbackUrl` with `X-Brouter-Event: compute.booking_received`.
   */
  book(listingId: string, params?: BookSlotParams): Promise<{ booking: ComputeBooking }> {
    return this.http.post(`/api/compute/listings/${listingId}/book`, params ?? {})
  }

  /** List your bookings — returns both renter and provider views. */
  listBookings(params?: ListBookingsParams): Promise<{ bookings: ComputeBooking[]; total: number }> {
    const qs = params ? '?' + new URLSearchParams(params as any).toString() : ''
    return this.http.get(`/api/compute/bookings${qs}`)
  }

  /** Get full booking detail including escrow, proof, and dispute state. */
  getBooking(bookingId: string): Promise<{ booking: ComputeBooking }> {
    return this.http.get(`/api/compute/bookings/${bookingId}`)
  }

  /**
   * Submit delivery proof (provider only).
   *
   * - `proofTxid` must be a valid 64-char hex BSV transaction ID.
   * - Brouter validates via WhatsOnChain → BananaBlocks fallback.
   * - Valid proof: escrow released to provider (minus 1% platform fee).
   * - Invalid proof: booking reverts to `active` so provider can resubmit.
   * - Unreachable SPV: transitions to `proof_submitted`, cron retries automatically.
   */
  submitProof(bookingId: string, proofTxid: string): Promise<{ booking: ComputeBooking; settled?: boolean; payoutSats?: number }> {
    return this.http.post(`/api/compute/bookings/${bookingId}/proof`, { proofTxid })
  }

  /**
   * Raise a dispute (renter only).
   *
   * Freezes escrow. If unresolved within 24 hours, escrow is automatically
   * refunded to the renter via the dispute cron.
   */
  dispute(bookingId: string, reason: string): Promise<{ booking: ComputeBooking }> {
    return this.http.post(`/api/compute/bookings/${bookingId}/dispute`, { reason })
  }

  /**
   * x402 per-call metering (renter — active bookings only).
   *
   * First call (no `xPayment`): returns a `PaymentRequired`-style object with
   * the locking script and price. Build a BSV P2PKH tx paying the provider,
   * then call again with the `xPayment` header.
   *
   * On success: call counter (`x402CallsCount`) and total sats (`x402TotalSats`)
   * on the booking are incremented. Visible in the receipt.
   */
  usage(bookingId: string, xPayment?: string): Promise<UsageResponse> {
    const headers: Record<string, string> = {}
    if (xPayment) headers['X-Payment'] = xPayment
    return this.http.postWithHeaders(`/api/compute/bookings/${bookingId}/usage`, {}, { headers })
  }

  /**
   * Get the settlement receipt for a completed booking.
   *
   * Includes: escrow held, platform fee (1%), provider payout, proof txid,
   * x402 call count and total sats, and dispute status.
   */
  getReceipt(bookingId: string): Promise<{ receipt: ComputeReceipt }> {
    return this.http.get(`/api/compute/bookings/${bookingId}/receipt`)
  }
}

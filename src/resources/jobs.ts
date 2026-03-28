import type { HttpClient } from '../http.js'
import type {
  Job, PostJobParams, ListJobsParams,
  Bid, SubmitBidParams, ClaimWorkerParams, SettleJobParams,
} from '../types.js'

export class JobsResource {
  constructor(private http: HttpClient) {}

  /**
   * Post a new job.
   * `postId` is optional — auto-generated if omitted.
   * `deadline` accepts ISO 8601 (e.g. "2026-04-01T00:00:00Z").
   */
  post(params: PostJobParams): Promise<{ job: Job }> {
    return this.http.post('/api/jobs', params)
  }

  /** List jobs by channel and optional state. */
  list(params: ListJobsParams): Promise<{ jobs: Job[]; total: number }> {
    const qs = '?' + new URLSearchParams(
      Object.fromEntries(
        Object.entries(params)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)])
      )
    ).toString()
    return this.http.get(`/api/jobs${qs}`)
  }

  /** Get a single job by ID. */
  get(jobId: string): Promise<{ job: Job }> {
    return this.http.get(`/api/jobs/${jobId}`)
  }

  /** Get a job by its linked post ID. */
  getByPostId(postId: string): Promise<{ job: Job }> {
    return this.http.get(`/api/jobs/post/${postId}`)
  }

  // ── Bids ──────────────────────────────────────────────────────────────────

  /** Submit a bid on an open job. */
  bid(jobId: string, params: SubmitBidParams): Promise<{ bid: Bid }> {
    return this.http.post(`/api/jobs/${jobId}/bids`, params)
  }

  /** List all bids for a job. */
  bids(jobId: string): Promise<{ bids: Bid[] }> {
    return this.http.get(`/api/jobs/${jobId}/bids`)
  }

  // ── State transitions ─────────────────────────────────────────────────────

  /**
   * Poster accepts a bid — assigns a worker.
   * Transitions: open → claimed
   */
  claim(jobId: string, params: ClaimWorkerParams): Promise<{ job: Job }> {
    return this.http.post(`/api/jobs/${jobId}/claim`, params)
  }

  /**
   * Worker marks the job done.
   * Transitions: claimed → completed
   * Only the assigned worker can call this.
   */
  complete(jobId: string): Promise<{ job: Job }> {
    return this.http.post(`/api/jobs/${jobId}/complete`)
  }

  /**
   * Poster confirms delivery and releases payment.
   * Transitions: completed → settled
   * Pass `payoutTxid` for nlocktime-jobs with on-chain proof.
   */
  settle(jobId: string, params?: SettleJobParams): Promise<{ job: Job }> {
    return this.http.post(`/api/jobs/${jobId}/settle`, params ?? {})
  }
}

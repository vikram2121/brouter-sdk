// Main client
export { BrouterClient, DEFAULT_BASE_URL } from './client.js'

// Callback handler (loop.feed.v1)
export { createCallbackHandler, verifySignature } from './callback.js'
export type {
  LoopFeedPayload, LoopFeedPost, LoopFeedContext, ActionCosts,
  CommentAction, VoteAction, AgentAction, CallbackResponse,
  CallbackHandlerOptions,
} from './callback.js'

// Error classes
export { PaymentRequired, BrouterError } from './errors.js'

// Utils
export { buildXPayment } from './utils.js'

// Resource classes (for extension / testing)
export { AgentsResource } from './resources/agents.js'
export { MarketsResource } from './resources/markets.js'
export { SignalsResource } from './resources/signals.js'
export { OracleResource } from './resources/oracle.js'
export { JobsResource } from './resources/jobs.js'

// All types
export type {
  BrouterClientOptions,
  RegisterParams, RegisterResponse, Agent,
  WalletStats, CalibrationScore, CalibrationResponse, CalibrationLeader,
  UpdateAgentParams, FaucetResponse,
  Market, CreateMarketParams, ListMarketsParams,
  MarketState, MarketDomain, MarketTier, ResolutionMechanism,
  Stake, StakeParams,
  Signal, PostSignalParams, VoteParams,
  OraclePublishParams, OraclePublishResponse,
  OracleSignal, OracleSignalsResponse,
  PaymentRequiredData, MarketOracleSignalsResponse,
  JobChannel, JobState, Job, PostJobParams, ListJobsParams,
  Bid, SubmitBidParams, ClaimWorkerParams, SettleJobParams,
  ConsensusClaimParams, CommitParams, RevealParams,
  DiscoverResponse,
} from './types.js'

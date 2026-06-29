interface RefundDecisionInput {
  chargeableAttemptStarted: boolean
}

/**
 * A claimed generation slot may be refunded only before a model request starts.
 * After that point the request may have incurred provider cost, even if parsing,
 * refusal handling, or safety screening prevents delivery.
 */
export function shouldRefundClaimedSlot({
  chargeableAttemptStarted,
}: RefundDecisionInput): boolean {
  return !chargeableAttemptStarted
}

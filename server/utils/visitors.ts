// server/utils/visitors.ts

// Your WAE columns (from the sample row you shared):
// - blob4 = ip
// - blob3 = ua
export const IP_COL = 'blob4'
export const UA_COL = 'blob3'

/**
 * Unique visitor expression for ClickHouse/WA:
 * hashes IP + UA, returns a stable string key per visitor.
 * Swap to your own session/user id anytime.
 */
export function uniqueVisitorExpr(): string {
  return `toString(cityHash64(COALESCE(${IP_COL}, ''), COALESCE(${UA_COL}, '')))`
}

// server/api/stats/counters.get.ts
import { eventHandler, type H3Event } from 'h3'
import { z } from 'zod'
import sqlbricks from 'sql-bricks'

import { QuerySchema } from '@@/schemas/query'
// NOTE: helpers (getValidatedQuery, query2filter, appendTimeFilter, useWAE)
// are assumed to exist in your project via utils/auto-imports.

type Query = z.infer<typeof QuerySchema>
const { select } = sqlbricks

// --- WAE schema constants (from your data) ---
const TABLE_NAME = 'sink'
const SAMPLE_INTERVAL_COL = '_sample_interval'
// In your stored rows: blob4 = ip, blob3 = ua
const IP_COL = 'blob4'
const UA_COL = 'blob3'

// Use IP+UA hash as a unique visitor key.
// (If you later add sessionId/userId, switch to that here.)
function uniqueVisitorExpr(): string {
  return `toString(cityHash64(COALESCE(${IP_COL}, ''), COALESCE(${UA_COL}, '')))`
}

function query2sql(query: Query, _event: H3Event): string {
  const filter = query2filter(query)
  const uniqVisitor = uniqueVisitorExpr()

  const qb = select([
    `SUM(${SAMPLE_INTERVAL_COL}) AS views`,
    `COUNT(DISTINCT ${uniqVisitor}) AS visitors`,
    `0 AS duration` // no duration column in your data
  ].join(', '))
    .from(TABLE_NAME)
    .where(filter)

  appendTimeFilter(qb, query)
  return qb.toString()
}

export default eventHandler(async (event) => {
  const query = await getValidatedQuery(event, QuerySchema.parse)
  const sql = query2sql(query, event)
  return useWAE(event, sql)
})

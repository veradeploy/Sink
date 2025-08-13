// server/api/stats/counters.get.ts
import { eventHandler, type H3Event } from 'h3'
import { z } from 'zod'
import sqlbricks from 'sql-bricks'

import { QuerySchema } from '@@/schemas/query'

// ✅ use the single source of truth (no more app/server/utils/logsMap)
import { logsMap } from '@/server/utils/access-log'
import { uniqueVisitorExpr } from '@/server/utils/visitors'

// NOTE: The following helpers are assumed to be available in your project via utils/auto-imports:
// - getValidatedQuery(event, QuerySchema.parse)
// - query2filter(query)
// - appendTimeFilter(qb, query)
// - useWAE(event, sql)

type Query = z.infer<typeof QuerySchema>
const { select } = sqlbricks

// Cloudflare Workers Analytics Engine (ClickHouse-like)
const TABLE_NAME = 'sink'
const SAMPLE_INTERVAL_COL = '_sample_interval' // present in your data

function query2sql(query: Query, _event: H3Event): string {
  const filter = query2filter(query)
  const uniqVisitor = uniqueVisitorExpr()

  // No duration column in your schema yet; keep 0 for now.
  const durationExpr = `0 AS duration`

  const qb = select([
    `SUM(${SAMPLE_INTERVAL_COL}) AS views`,
    `COUNT(DISTINCT ${uniqVisitor}) AS visitors`,
    durationExpr
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

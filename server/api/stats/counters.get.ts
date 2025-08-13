import { eventHandler, type H3Event } from 'h3'
import { z } from 'zod'
import sqlbricks from 'sql-bricks'

import { QuerySchema } from '@@/schemas/query'
// import your own helpers:
/// import { query2filter, appendTimeFilter, useWAE, getValidatedQuery } from '@/server/utils/...'
import { logsMap } from '@/server/utils/access-log'
import { uniqueVisitorExpr } from '@/server/utils/visitors'

type Query = z.infer<typeof QuerySchema>
const { select } = sqlbricks

function query2sql(query: Query, _event: H3Event): string {
  const filter = query2filter(query)
  const table = logsMap.table
  const uniqVisitor = uniqueVisitorExpr()

  const durationExpr = logsMap.durationMs
    ? `SUM(${logsMap.durationMs}) AS duration`
    : `0 AS duration` // no duration column in your data

  const qb = select([
      `SUM(${logsMap.sampleInterval}) AS views`,
      `COUNT(DISTINCT ${uniqVisitor}) AS visitors`,
      durationExpr
    ].join(', '))
    .from(table)
    .where(filter)

  appendTimeFilter(qb, query) // your existing helper
  return qb.toString()
}

export default eventHandler(async (event) => {
  const query = await getValidatedQuery(event, QuerySchema.parse)
  const sql = query2sql(query, event)
  return useWAE(event, sql)
})

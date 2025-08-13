// server/api/stats/views.get.ts
import { eventHandler, type H3Event } from 'h3'
import { z } from 'zod'
import sqlbricks from 'sql-bricks'

import { QuerySchema } from '@@/schemas/query'
// NOTE: helpers (getValidatedQuery, query2filter, appendTimeFilter, useWAE)
// are assumed to exist in your project via utils/auto-imports.

const { select } = sqlbricks

const ViewsQuery = QuerySchema.extend({
  unit: z.enum(['minute', 'hour', 'day']),
  clientTimezone: z.string().optional()
})
type VQ = z.infer<typeof ViewsQuery>

function bucketExpr(unit: VQ['unit'], tz?: string) {
  const ts = tz ? `toTimeZone(timestamp, '${tz}')` : 'timestamp'
  switch (unit) {
    case 'minute': return `toUnixTimestamp(toStartOfMinute(${ts}))`
    case 'hour':   return `toUnixTimestamp(toStartOfHour(${ts}))`
    case 'day':    return `toUnixTimestamp(toStartOfDay(${ts}))`
  }
}

const TABLE_NAME = 'sink'
const SAMPLE_INTERVAL_COL = '_sample_interval' // present in your data

function query2sql(query: VQ, _event: H3Event): string {
  const filter = query2filter(query)
  const tExpr = bucketExpr(query.unit, query.clientTimezone)

  const qb = select([
    `${tExpr} AS t`,
    `SUM(${SAMPLE_INTERVAL_COL}) AS y`
  ].join(', '))
    .from(TABLE_NAME)
    .where(filter)
    .groupBy('t')
    .orderBy('t ASC')

  appendTimeFilter(qb, query)
  return qb.toString()
}

export default eventHandler(async (event) => {
  const query = await getValidatedQuery(event, ViewsQuery.parse)
  const sql = query2sql(query, event)
  const { data } = await useWAE(event, sql)
  return { unit: query.unit, rows: data }
})

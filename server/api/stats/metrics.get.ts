// server/api/stats/metrics.get.ts
import { eventHandler, type H3Event } from 'h3'
import { z } from 'zod'
import sqlbricks from 'sql-bricks'

import { QuerySchema } from '@@/schemas/query'
import { logsMap } from '@/server/utils/access-log'

// NOTE: helpers (getValidatedQuery, query2filter, appendTimeFilter, useWAE)
// are assumed to exist in your project via utils/auto-imports.

const { select } = sqlbricks

const MetricQuery = QuerySchema.extend({
  type: z.enum(['referer', 'device', 'language', 'country', 'os'])
})
type MetricQ = z.infer<typeof MetricQuery>

// Map metric type -> actual column in WAE (fallbacks included)
function colFor(type: MetricQ['type']): string {
  switch (type) {
    case 'referer':  return logsMap.referer || 'blob2'
    case 'language': return logsMap.language || 'blob10'
    case 'country':  return logsMap.country || 'blob6'
    case 'os':       return logsMap.os || 'blob11'
    case 'device':   return logsMap.deviceType || logsMap.device || logsMap.browser || 'blob12'
  }
}

const TABLE_NAME = 'sink'
const SAMPLE_INTERVAL_COL = '_sample_interval' // present in your data

function query2sql(query: MetricQ, _event: H3Event): string {
  const filter = query2filter(query)
  const col = colFor(query.type)

  const qb = select([
    `COALESCE(${col}, '') AS value`,
    `SUM(${SAMPLE_INTERVAL_COL}) AS count`
  ].join(', '))
    .from(TABLE_NAME)
    .where(filter)
    .groupBy('value')
    .orderBy('count DESC')

  appendTimeFilter(qb, query)
  return qb.toString()
}

export default eventHandler(async (event) => {
  const query = await getValidatedQuery(event, MetricQuery.parse)
  const sql = query2sql(query, event)
  const { data } = await useWAE(event, sql)
  return { type: query.type, rows: data }
})

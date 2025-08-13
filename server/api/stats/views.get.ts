import { eventHandler, type H3Event } from 'h3'
import { z } from 'zod'
import sqlbricks from 'sql-bricks'

import { QuerySchema } from '@@/schemas/query'
/// import { query2filter, appendTimeFilter, useWAE, getValidatedQuery } from '@/server/utils/...'
import { logsMap } from '@/server/utils/logsMap'

const { select } = sqlbricks

const ViewsQuery = QuerySchema.extend({
  unit: z.enum(['minute','hour','day']),
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

function query2sql(query: VQ, _event: H3Event): string {
  const filter = query2filter(query)
  const table = logsMap.table
  const tExpr = bucketExpr(query.unit, query.clientTimezone)

  const qb = select([
      `${tExpr} AS t`,
      `SUM(${logsMap.sampleInterval}) AS y`
    ].join(', '))
    .from(table)
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

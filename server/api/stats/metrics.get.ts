import { eventHandler, type H3Event } from 'h3'
import { z } from 'zod'
import sqlbricks from 'sql-bricks'

import { QuerySchema } from '@@/schemas/query'
/// import { query2filter, appendTimeFilter, useWAE, getValidatedQuery } from '@/server/utils/...'
import { logsMap } from '@/server/utils/logsMap'

const { select } = sqlbricks

const MetricQuery = QuerySchema.extend({
  type: z.enum(['referer','device','language','country','os'])
})
type MetricQ = z.infer<typeof MetricQuery>

function colFor(type: MetricQ['type']): string {
  switch (type) {
    case 'referer':  return logsMap.referer
    case 'language': return logsMap.language
    case 'country':  return logsMap.country
    case 'os':       return logsMap.os
    case 'device':   // you don't have a clean "device" column; use browser as a proxy
      return logsMap.browser
  }
}

function query2sql(query: MetricQ, _event: H3Event): string {
  const filter = query2filter(query)
  const table = logsMap.table
  const col = colFor(query.type)

  const qb = select([
      `${col} AS value`,
      `SUM(${logsMap.sampleInterval}) AS count`
    ].join(', '))
    .from(table)
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

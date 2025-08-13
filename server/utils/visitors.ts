import { logsMap } from './logsMap'

// WAE supports ClickHouse funcs like cityHash64
export function uniqueVisitorExpr() {
  if (logsMap.sessionId) return `COALESCE(${logsMap.sessionId}, '')`
  if (logsMap.userId)    return `COALESCE(${logsMap.userId}, '')`

  // Best-effort: hash IP + UA to avoid merging everyone behind the same IP
  if (logsMap.ip && logsMap.userAgent) {
    return `toString(cityHash64(COALESCE(${logsMap.ip}, ''), COALESCE(${logsMap.userAgent}, '')))`
  }
  if (logsMap.ip)        return `COALESCE(${logsMap.ip}, '')`
  if (logsMap.userAgent) return `toString(cityHash64(COALESCE(${logsMap.userAgent}, '')))`
  return `'unknown'`
}

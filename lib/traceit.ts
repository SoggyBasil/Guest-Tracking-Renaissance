export interface TraceITServiceItem {
  id: number
  text: string
  wristbands: string[]
  status?: string
  ackBy?: string
  ackTime?: string
  timestamp?: string
}

export interface TraceITServiceResponse {
  source: "html" | "json"
  count?: number
  items?: TraceITServiceItem[]
  raw?: any
}

export async function fetchTraceITServiceCalls(opts?: { path?: string; base?: string; method?: string; url?: string }): Promise<TraceITServiceResponse> {
  const qp = new URLSearchParams()
  if (opts?.path) qp.set("path", opts.path)
  if (opts?.base) qp.set("base", opts.base)
  if (opts?.method) qp.set("method", opts.method)
  if (opts?.url) qp.set("url", opts.url)
  const qs = qp.toString()
  const url = `/api/traceit/service-calls${qs ? `?${qs}` : ""}`
  const resp = await fetch(url, { cache: "no-store" })
  if (!resp.ok) {
    throw new Error(`Failed to fetch TraceIT service calls: ${resp.status}`)
  }
  return resp.json()
}

export function groupByWristband(items: TraceITServiceItem[]): Map<string, TraceITServiceItem[]> {
  const map = new Map<string, TraceITServiceItem[]>()
  for (const item of items) {
    for (const wid of item.wristbands) {
      const key = wid.replace(/\s+/, " ")
      const list = map.get(key) || []
      list.push(item)
      map.set(key, list)
    }
  }
  return map
}



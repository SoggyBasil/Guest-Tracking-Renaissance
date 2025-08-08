import { NextRequest, NextResponse } from "next/server"

// Base TraceIT endpoint available on the yacht network (no port by default)
const DEFAULT_TRACEIT_BASE = process.env.TRACEIT_BASE || "http://myyachtservices.itwservices.local"
const ALLOWED_HOSTS = new Set(["myyachtservices.itwservices.local", "10.101.12.31"]) // allow TraceIT and alarm source

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function extractWristbandIds(text: string): string[] {
  const matches = new Set<string>()
  const patterns: RegExp[] = [
    /\bG[12][- ]?\d{3}\b/gi, // G1-407 or G1 407
    /\bG\d{3}\b/gi,         // G414 (cabin-level without guest index)
    /\bP\d\b/gi,             // P1..P9
    /\bC\d\b/gi,             // C1..C9
  ]
  for (const re of patterns) {
    const found = text.match(re)
    if (found) {
      found.forEach((m) => matches.add(m.replace(/\s+/g, " ")))
    }
  }
  return Array.from(matches)
}

function parseXmlAlarms(xml: string) {
  // Extract <alarm .../> self-closing and <alarm>...</alarm> blocks
  const selfClosing = xml.match(/<\s*alarm\b[^>]*\/>/gi) || []
  const blocks = xml.match(/<\s*alarm\b[\s\S]*?<\s*\/\s*alarm\s*>/gi) || []

  const readTag = (block: string, tag: string): string | null => {
    const re = new RegExp(`<\\s*${tag}[^>]*>([\\s\\S]*?)<\\s*\\/\\s*${tag}\\s*>`, 'i')
    const m = block.match(re)
    return m?.[1]?.trim() || null
  }

  const readAttr = (block: string, attr: string): string | null => {
    const re = new RegExp(`${attr}\\s*=\\s*"([^"]+)"`, 'i')
    const m = block.match(re)
    return m?.[1]?.trim() || null
  }

  const parseBlock = (block: string, idx: number) => {
    // Try multiple tag/attribute candidates for type
    const typeCandidates = [
      readTag(block, 'type'),
      readTag(block, 'Type'),
      readTag(block, 'TYPE'),
      readTag(block, 'alarmtype'),
      readTag(block, 'AlarmType'),
      readTag(block, 'eventtype'),
      readTag(block, 'category'),
      readAttr(block, 'type'),
      readAttr(block, 'Type'),
    ]
    const type = (typeCandidates.find(Boolean) || '').toString().trim()

    // Try multiple tag/attribute candidates for text/message
    const textCandidates = [
      readTag(block, 'text'),
      readTag(block, 'Text'),
      readTag(block, 'message'),
      readTag(block, 'Message'),
      readTag(block, 'description'),
      readTag(block, 'Description'),
      readTag(block, 'AlarmText'),
      readAttr(block, 'text'),
      readAttr(block, 'message'),
    ]
    let text = (textCandidates.find(Boolean) || '').toString().trim()
    if (!text) {
      // Fallback: strip tags from the block
      text = block.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    }

    // Extract status information
    const statusCandidates = [
      readTag(block, 'status'),
      readTag(block, 'Status'),
      readTag(block, 'STATE'),
      readTag(block, 'state'),
      readAttr(block, 'status'),
      readAttr(block, 'Status'),
      readAttr(block, 'state'),
      readAttr(block, 'STATE'),
    ]
    const status = (statusCandidates.find(Boolean) || '').toString().trim().toLowerCase()

    // Extract acknowledgment information
    const ackByCandidates = [
      readTag(block, 'ackby'),
      readTag(block, 'AckBy'),
      readTag(block, 'acknowledgedby'),
      readTag(block, 'AcknowledgedBy'),
      readAttr(block, 'ackby'),
      readAttr(block, 'AckBy'),
    ]
    const ackBy = (ackByCandidates.find(Boolean) || '').toString().trim()

    // Extract acknowledgment time
    const ackTimeCandidates = [
      readTag(block, 'acktime'),
      readTag(block, 'AckTime'),
      readTag(block, 'acknowledgedtime'),
      readTag(block, 'AcknowledgedTime'),
      readAttr(block, 'acktime'),
      readAttr(block, 'AckTime'),
    ]
    const ackTime = (ackTimeCandidates.find(Boolean) || '').toString().trim()

    // Extract timestamp
    const timestampCandidates = [
      readTag(block, 'timestamp'),
      readTag(block, 'Timestamp'),
      readTag(block, 'time'),
      readTag(block, 'Time'),
      readAttr(block, 'timestamp'),
      readAttr(block, 'Timestamp'),
      readAttr(block, 'time'),
      readAttr(block, 'Time'),
    ]
    const timestamp = (timestampCandidates.find(Boolean) || '').toString().trim()

    const wristbands = extractWristbandIds(text)
    return { 
      id: idx, 
      type, 
      text, 
      wristbands,
      status,
      ackBy: ackBy || undefined,
      ackTime: ackTime || undefined,
      timestamp: timestamp || undefined
    }
  }

  const itemsBlocks = blocks.map((block, idx) => parseBlock(block, idx))
  const offset = itemsBlocks.length
  const itemsSelf = selfClosing.map((block, i) => parseBlock(block, offset + i))
  const items = [...itemsBlocks, ...itemsSelf]

  // Keep only alarms of type 'ste' (case-insensitive)
  return items.filter((it) => it.type && it.type.toLowerCase() === 'ste')
}

function parseHtmlAlarmTable(html: string) {
  // Scope to first table block to avoid stray TRs elsewhere
  const tableMatch = html.match(/<\s*table\b[\s\S]*?<\s*\/\s*table\s*>/i)
  const tableHtml = tableMatch ? tableMatch[0] : html

  // Find header row within table
  const headerMatch = tableHtml.match(/<\s*tr\b[^>]*>\s*([\s\S]*?)<\s*\/\s*tr\s*>/i)
  const headerHtml = headerMatch ? headerMatch[0] : ''
  const headerCells = (headerHtml.match(/<\s*th\b[^>]*>([\s\S]*?)<\s*\/\s*th\s*>/gi) || [])
    .map((th) => stripHtml(th))
  
  // Map column indices based on header content
  const typeIdx = headerCells.findIndex((h) => h.toLowerCase().includes('type'))
  const textIdx = headerCells.findIndex((h) => h.toLowerCase().includes('description') || h.toLowerCase().includes('text'))
  const statusIdx = headerCells.findIndex((h) => h.toLowerCase().includes('status') || h.toLowerCase().includes('state'))
  const ackByIdx = headerCells.findIndex((h) => h.toLowerCase().includes('ack') || h.toLowerCase().includes('acknowledged') || h.toLowerCase().includes('additional'))
  const timeIdx = headerCells.findIndex((h) => h.toLowerCase().includes('timestamp') || h.toLowerCase().includes('time'))

  // Get all data rows
  const rowBlocks = (tableHtml.match(/<\s*tr\b[^>]*>\s*([\s\S]*?)<\s*\/\s*tr\s*>/gi) || []).slice(1) // skip header

  // Fallback to known column positions if header not detected
  const resolvedTypeIdx = typeIdx >= 0 ? typeIdx : 2
  const resolvedTextIdx = textIdx >= 0 ? textIdx : 3
  const resolvedStatusIdx = statusIdx >= 0 ? statusIdx : 4
  const resolvedAckByIdx = ackByIdx >= 0 ? ackByIdx : 7 // Based on the image, acknowledgment info is in the last column
  const resolvedTimeIdx = timeIdx >= 0 ? timeIdx : 1

  const items = rowBlocks.map((rowHtml, idx) => {
    const cells = (rowHtml.match(/<\s*td\b[^>]*>([\s\S]*?)<\s*\/\s*td\s*>/gi) || []).map((td) => stripHtml(td))
    const type = (cells[resolvedTypeIdx] || '').trim()
    const text = (cells[resolvedTextIdx] || '').trim()
    const status = (cells[resolvedStatusIdx] || '').trim().toLowerCase()
    const ackBy = (cells[resolvedAckByIdx] || '').trim()
    const timestamp = (cells[resolvedTimeIdx] || '').trim()
    
    const wristbands = extractWristbandIds(text)
      .map((id) => id.replace(/\s+/, " "))
      .map((id) => (/(^G\d{3}$)/i.test(id) ? `G${id.slice(1)}` : id))
    return { 
      id: idx, 
      type, 
      text, 
      wristbands,
      status,
      ackBy: ackBy || undefined,
      ackTime: undefined, // HTML tables typically don't have separate ack time
      timestamp: timestamp || undefined
    }
  })
  // Only keep service calls type ste
  return items.filter((it) => it.type.toLowerCase() === 'ste')
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const directUrl = searchParams.get("url")
    const path = searchParams.get("path") || "/TraceIT/GetTransaction?Transaction=HotellerieActions"
    const method = (searchParams.get("method") || "GET").toUpperCase()
    const base = searchParams.get("base") || DEFAULT_TRACEIT_BASE
    const debug = searchParams.get("debug") === "1"

    let targetUrl = ""
    if (directUrl) {
      try {
        const u = new URL(directUrl)
        const hostname = u.hostname.toLowerCase()
        if (!ALLOWED_HOSTS.has(hostname)) {
          return NextResponse.json({ error: "Invalid url host" }, { status: 400 })
        }
      } catch {
        return NextResponse.json({ error: "Invalid url" }, { status: 400 })
      }
      targetUrl = directUrl
    } else {
      // Prevent SSRF; only allow relative paths
      if (path.startsWith("http://") || path.startsWith("https://")) {
        return NextResponse.json({ error: "Absolute URLs are not allowed in 'path'; use 'url' param" }, { status: 400 })
      }
      // Validate the base host
      try {
        const u = new URL(base)
        const hostname = u.hostname.toLowerCase()
        if (!ALLOWED_HOSTS.has(hostname)) {
          return NextResponse.json({ error: "Invalid base host" }, { status: 400 })
        }
      } catch {
        return NextResponse.json({ error: "Invalid base URL" }, { status: 400 })
      }
      targetUrl = `${base}${path}`
    }

    const upstream = await fetch(targetUrl, { method })

    const contentType = upstream.headers.get("content-type") || ""
    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream responded ${upstream.status}`, statusText: upstream.statusText },
        { status: 502 },
      )
    }

    // If JSON, pass-through with minimal normalization
    if (contentType.includes("application/json")) {
      const data = await upstream.json()
      return NextResponse.json({ source: "json", raw: data })
    }

    // If XML (alarm feed) - but some feeds are HTML tables with .xml extension
    if (contentType.includes("xml") || targetUrl.toLowerCase().endsWith(".xml")) {
      const xmlOrHtml = await upstream.text()
      if (debug) {
        return NextResponse.json({ source: "debug", contentType, preview: xmlOrHtml.slice(0, 500), length: xmlOrHtml.length })
      }
      if (/<\s*alarm\b/i.test(xmlOrHtml)) {
        const alarms = parseXmlAlarms(xmlOrHtml)
        const items = alarms.map((a, idx) => ({ 
          id: idx, 
          text: a.text, 
          wristbands: a.wristbands,
          status: a.status,
          ackBy: a.ackBy,
          ackTime: a.ackTime,
          timestamp: a.timestamp
        }))
        if (debug) {
          return NextResponse.json({ 
            source: "xml-debug", 
            count: items.length, 
            items: items.slice(0, 5),
            sampleParsed: alarms.slice(0, 3)
          })
        }
        return NextResponse.json({ source: "xml", count: items.length, items })
      }
      // Fallback: parse as HTML table
      const rows = parseHtmlAlarmTable(xmlOrHtml)
      const items = rows.map((r, idx) => ({ 
        id: idx, 
        text: r.text, 
        wristbands: r.wristbands,
        status: r.status,
        ackBy: r.ackBy,
        ackTime: r.ackTime,
        timestamp: r.timestamp
      }))
      if (debug) {
        return NextResponse.json({ source: "html-table-debug", headerSample: xmlOrHtml.slice(0, 200), parsedSample: items.slice(0, 5) })
      }
      return NextResponse.json({ source: "html-table", count: items.length, items })
    }

    // Otherwise parse HTML and heuristically extract service-call like rows
    const html = await upstream.text()
    const text = stripHtml(html)

    // Split by table row-like markers if present; fallback to a single block
    const blocks: string[] = /<tr[\s\S]*?<\/tr>/i.test(html)
      ? (html.match(/<tr[\s\S]*?<\/tr>/gi) || []).map(stripHtml).filter(Boolean)
      : [text]

    const items = blocks
      .map((blockText, idx) => {
        const wristbands = extractWristbandIds(blockText)
        return {
          id: idx,
          text: blockText,
          wristbands,
        }
      })
      // Keep only rows that look relevant
      .filter((it) => it.wristbands.length > 0 || /service|call|guest|room|cabin/i.test(it.text))

    return NextResponse.json({ source: "html", count: items.length, items })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Unknown error" }, { status: 500 })
  }
}



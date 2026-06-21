import { useEffect, useRef, useCallback } from 'react'

const HEARTBEAT_TIMEOUT_MS = 45_000  // server sends every 20s; 45s = 2 missed + margin
const MAX_BACKOFF_MS = 30_000

export function useSSE(url: string, onUpdate: () => void) {
  const backoffMs = useRef(1_000)
  const heartbeatTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const esRef = useRef<EventSource | null>(null)
  const destroyed = useRef(false)

  const resetHeartbeat = useCallback((connect: () => void) => {
    if (heartbeatTimer.current) clearTimeout(heartbeatTimer.current)
    heartbeatTimer.current = setTimeout(() => {
      // No heartbeat received in time — reconnect
      esRef.current?.close()
      if (!destroyed.current) connect()
    }, HEARTBEAT_TIMEOUT_MS)
  }, [])

  useEffect(() => {
    destroyed.current = false

    function connect() {
      if (destroyed.current) return

      const es = new EventSource(url)
      esRef.current = es

      es.onopen = () => {
        backoffMs.current = 1_000  // reset backoff on successful connection
        resetHeartbeat(connect)
      }

      es.onmessage = (e) => {
        resetHeartbeat(connect)  // any message resets the heartbeat timer
        if (e.data === 'update') onUpdate()
      }

      es.onerror = () => {
        es.close()
        if (heartbeatTimer.current) clearTimeout(heartbeatTimer.current)
        if (destroyed.current) return
        // Exponential backoff
        const delay = backoffMs.current
        backoffMs.current = Math.min(backoffMs.current * 2, MAX_BACKOFF_MS)
        setTimeout(connect, delay)
      }
    }

    connect()

    return () => {
      destroyed.current = true
      esRef.current?.close()
      if (heartbeatTimer.current) clearTimeout(heartbeatTimer.current)
    }
  }, [url, onUpdate, resetHeartbeat])
}

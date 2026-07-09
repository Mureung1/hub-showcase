import { useRef, useState } from 'react'
import type { OperationLog, StructureItem } from '../types'

const MAX_SIZE = 6
const MAX_VALUE_LENGTH = 4
const MAX_LOG_ENTRIES = 20

export function useLinearStructure() {
  const [items, setItems] = useState<StructureItem[]>([])
  const [logs, setLogs] = useState<OperationLog[]>([])
  const itemIdRef = useRef(0)
  const logIdRef = useRef(0)

  const pushLog = (message: string, tone: OperationLog['tone']) => {
    setLogs((prev) => [{ id: logIdRef.current++, message, tone }, ...prev].slice(0, MAX_LOG_ENTRIES))
  }

  const validate = (raw: string): string | null => {
    const value = raw.trim()
    if (!value) {
      pushLog('값을 입력해주세요.', 'error')
      return null
    }
    if (value.length > MAX_VALUE_LENGTH) {
      pushLog(`값은 ${MAX_VALUE_LENGTH}자 이내로 입력해주세요.`, 'error')
      return null
    }
    return value
  }

  const addFront = (raw: string) => {
    const value = validate(raw)
    if (value === null) return
    if (items.length >= MAX_SIZE) {
      pushLog('추가 실패 — 가득 찼습니다 (오버플로우).', 'error')
      return
    }
    setItems((prev) => [{ id: itemIdRef.current++, value }, ...prev])
    pushLog(`앞에 ${value} 추가 완료`, 'ok')
  }

  const addRear = (raw: string) => {
    const value = validate(raw)
    if (value === null) return
    if (items.length >= MAX_SIZE) {
      pushLog('추가 실패 — 가득 찼습니다 (오버플로우).', 'error')
      return
    }
    setItems((prev) => [...prev, { id: itemIdRef.current++, value }])
    pushLog(`뒤에 ${value} 추가 완료`, 'ok')
  }

  const removeFront = () => {
    if (items.length === 0) {
      pushLog('제거 실패 — 비어 있습니다 (언더플로우).', 'error')
      return
    }
    const [removed] = items
    setItems((prev) => prev.slice(1))
    pushLog(`앞에서 ${removed.value} 제거`, 'ok')
  }

  const removeRear = () => {
    if (items.length === 0) {
      pushLog('제거 실패 — 비어 있습니다 (언더플로우).', 'error')
      return
    }
    const removed = items[items.length - 1]
    setItems((prev) => prev.slice(0, -1))
    pushLog(`뒤에서 ${removed.value} 제거`, 'ok')
  }

  const peekFront = () => {
    if (items.length === 0) {
      pushLog('Peek 실패 — 비어 있습니다.', 'error')
      return
    }
    pushLog(`맨 앞 값 확인 → ${items[0].value}`, 'neutral')
  }

  const peekRear = () => {
    if (items.length === 0) {
      pushLog('Peek 실패 — 비어 있습니다.', 'error')
      return
    }
    pushLog(`맨 뒤 값 확인 → ${items[items.length - 1].value}`, 'neutral')
  }

  const seed = (values: string[]) => {
    setItems(values.map((value) => ({ id: itemIdRef.current++, value })))
    setLogs([{ id: logIdRef.current++, message: '초기화됨', tone: 'neutral' }])
  }

  const reset = () => {
    setItems([])
    pushLog('초기화됨', 'neutral')
  }

  return {
    items,
    logs,
    maxSize: MAX_SIZE,
    addFront,
    addRear,
    removeFront,
    removeRear,
    peekFront,
    peekRear,
    seed,
    reset,
  }
}

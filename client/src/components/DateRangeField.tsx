import { useState, type ReactNode } from 'react'
import { DayPicker, type DateRange } from 'react-day-picker'
import { format, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import 'react-day-picker/style.css'
import Modal from './Modal.tsx'
import './DateRangeField.css'

type DateRangeFieldProps =
  | {
      mode: 'range'
      startValue: string
      endValue: string
      onChange: (start: string, end: string) => void
    }
  | {
      mode: 'single'
      value: string
      onChange: (value: string) => void
    }

function toDate(value: string): Date | undefined {
  return value ? parseISO(value) : undefined
}

function toDateString(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

function triggerLabel(props: DateRangeFieldProps): { text: string; isEmpty: boolean } {
  if (props.mode === 'single') {
    return props.value ? { text: props.value, isEmpty: false } : { text: '날짜를 선택하세요', isEmpty: true }
  }
  if (props.startValue && props.endValue) {
    return { text: `${props.startValue} ~ ${props.endValue}`, isEmpty: false }
  }
  return { text: '날짜 범위를 선택하세요', isEmpty: true }
}
// study: 실제로 보여줄 캘린더(DayPicker)를 미리 만들어서 picker 변수에 담아둠.
function DateRangeField(props: DateRangeFieldProps) {
  const [open, setOpen] = useState(false)
  const { text, isEmpty } = triggerLabel(props)

  let picker: ReactNode
  if (props.mode === 'single') {
    picker = (
      <DayPicker
        mode="single"
        locale={ko}
        selected={toDate(props.value)}
        onSelect={(date) => props.onChange(date ? toDateString(date) : '')}
      />
    )
  } else {
    const start = toDate(props.startValue)
    const selected: DateRange | undefined = start ? { from: start, to: toDate(props.endValue) } : undefined
    picker = (
      <DayPicker
        mode="range"
        required
        locale={ko}
        selected={selected}
        onSelect={(range) => {
          props.onChange(range?.from ? toDateString(range.from) : '', range?.to ? toDateString(range.to) : '')
        }}
      />
    )
  }

  return (
    <>
      <button
        type="button"
        className={['picker-trigger', isEmpty && 'picker-trigger--empty'].filter(Boolean).join(' ')}
        onClick={() => setOpen(true)}
      >
        {text}
      </button>
      <Modal open={open} onClose={() => setOpen(false)}>
        {picker}
        <button type="button" className="button" onClick={() => setOpen(false)}>
          확인
        </button>
      </Modal>
    </>
  )
}

export default DateRangeField

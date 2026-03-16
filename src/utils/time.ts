export function toTimestamp(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value < 1_000_000_000_000 ? value * 1000 : value
  }

  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return null
    const asNumber = Number(trimmed)
    if (Number.isFinite(asNumber)) {
      return asNumber < 1_000_000_000_000 ? asNumber * 1000 : asNumber
    }
    const parsed = Date.parse(trimmed)
    return Number.isNaN(parsed) ? null : parsed
  }

  if (value instanceof Date) {
    return value.getTime()
  }

  return null
}

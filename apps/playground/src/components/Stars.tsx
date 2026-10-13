/** A read-only star rating, e.g. 4.6 → ★★★★★ with the last one dimmed. */
export function Stars({ value }: { value: number }) {
  const full = Math.round(value)
  return (
    <span className="stars" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} aria-hidden="true" className={n <= full ? 'star on' : 'star'}>
          ★
        </span>
      ))}
    </span>
  )
}

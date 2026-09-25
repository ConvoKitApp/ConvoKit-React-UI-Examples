import { displayName, personas } from './demo'

/** Compact reader identities beside an outgoing message, like the Flutter demo. */
export function ReadReceiptAvatars({ readerIds }: { readerIds: ReadonlySet<string> }) {
  const readers = [...readerIds].sort()
  if (readers.length === 0) return <span className="demo-read-receipt demo-read-receipt--empty" aria-label="Sent" />

  const names = readers.map(displayName)
  return (
    <span className="demo-read-receipt" role="group" aria-label={`Read by ${names.join(', ')}`}>
      {readers.slice(0, 3).map((id) => {
        const persona = personas.find((entry) => entry.id === id)
        const name = displayName(id)
        const initials = persona?.initials ?? name.slice(0, 2).toUpperCase()
        return (
          <span
            className="demo-read-receipt__avatar"
            key={id}
            title={name}
            aria-hidden="true"
            style={{ backgroundColor: persona?.color ?? '#708778' }}
          >
            {initials}
          </span>
        )
      })}
      {readers.length > 3 && <span className="demo-read-receipt__more">+{readers.length - 3}</span>}
    </span>
  )
}

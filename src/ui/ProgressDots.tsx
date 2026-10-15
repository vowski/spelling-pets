export function ProgressDots({ done, total }: { done: number; total: number }) {
  return (
    <div className="dots" aria-label={`${done} of ${total} done`}>
      {Array.from({ length: total }, (_, i) => <span key={i} className={i < done ? 'dot done' : 'dot'} />)}
    </div>
  )
}

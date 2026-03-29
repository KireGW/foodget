export function HabitInsight({ habitInsight }) {
  return (
    <section className="panel habit-panel">
      <div className="panel__header">
        <div>
          <p className="panel__eyebrow">Most expensive food habit</p>
          <h2>{habitInsight.title}</h2>
        </div>
      </div>

      <p className="habit-panel__summary">{habitInsight.summary}</p>

      <div className="habit-panel__grid">
        <article className="habit-panel__feature">
          <span>Item</span>
          <strong>{habitInsight.itemName}</strong>
          <small>{habitInsight.category}</small>
        </article>
        <article>
          <span>Mexico spend</span>
          <strong>{habitInsight.mexicoSpend}</strong>
        </article>
        <article>
          <span>Sweden benchmark</span>
          <strong>{habitInsight.swedenBenchmark}</strong>
        </article>
        <article>
          <span>Cost relationship</span>
          <strong>{habitInsight.gapDirection}</strong>
          <small>{habitInsight.relativeIndex}</small>
        </article>
        <article className="habit-panel__gap">
          <span>Gap</span>
          <strong>{habitInsight.gapAmount}</strong>
        </article>
      </div>
    </section>
  )
}

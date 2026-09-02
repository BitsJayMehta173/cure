import type { Stat } from '../types'

export function StatCard({ label, value }: Stat) {
  return <article className="stat-card"><span className="stat-label">{label}</span><span className="stat-value">{value}</span></article>
}

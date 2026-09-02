export function Panel({ title, items }: { title: string; items: [string, string][] }) {
  return <section className="panel"><h3>{title}</h3>{items.map(([label, value]) => <div className="activity" key={label}><span>{label}</span><span>{value}</span></div>)}</section>
}

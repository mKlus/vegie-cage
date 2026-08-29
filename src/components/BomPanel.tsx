import { type BomLine, bomPlainText, type BomResult } from '../lib/bom'
import { formatM, formatM2, type CageInputs } from '../lib/model'
import { formatAud } from '../lib/prices'
import { warnings, type CageGeometry } from '../lib/geometry'
import { useState } from 'react'

type BomPanelProps = {
  input: CageInputs
  geo: CageGeometry
  bom: BomResult
}

function priceCell(line: BomLine): string {
  return line.inTotal ? formatAud(line.lineAud) : '—'
}

function BomTable({ title, total, lines }: { title: string; total: number; lines: BomLine[] }) {
  return (
    <section className="bom-list">
      <header className="bom-list-head">
        <h3>{title}</h3>
        <strong className="aud">{formatAud(total)}</strong>
      </header>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Exact</th>
            <th>Buy</th>
            <th className="aud">Est.</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.id} className={line.inTotal ? undefined : 'bom-included'}>
              <td>
                <span className="cat">{line.category}</span>
                <strong>{line.item}</strong>
                <small>{line.spec}</small>
                {line.note ? <em className="note">{line.note}</em> : null}
              </td>
              <td>{line.exact}</td>
              <td>{line.buy}</td>
              <td className="aud">{priceCell(line)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

export function BomPanel({ input, geo, bom }: BomPanelProps) {
  const [copied, setCopied] = useState(false)
  const notes = warnings(input, geo)

  async function copy() {
    const text = bomPlainText(input, bom)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="bom">
      {notes.length > 0 ? (
        <ul className="warn-list">
          {notes.map((w) => (
            <li key={w.text} className={w.level}>
              {w.text}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="totals">
        <div>
          <span>Hoop pipe</span>
          <strong>{formatM(bom.totals.hoopPipeM, 1)}</strong>
        </div>
        <div>
          <span>Wall + apron mesh</span>
          <strong>{formatM(bom.totals.meshM, 1)}</strong>
        </div>
        <div>
          <span>Net</span>
          <strong>{formatM2(bom.totals.netM2)}</strong>
        </div>
        <div>
          <span>Each hoop cut</span>
          <strong>{formatM(geo.pipeEachM, 2)}</strong>
        </div>
        <div>
          <span>Beds / soil</span>
          <strong>
            {input.beds.length} · {bom.totals.soilM3.toFixed(1)} m³
          </strong>
        </div>
        <div>
          <span>Growing area</span>
          <strong>{formatM2(bom.totals.growM2)}</strong>
        </div>
        <div className="price">
          <span>Cage est.</span>
          <strong>{formatAud(bom.totals.cageAud)}</strong>
        </div>
        <div className="price">
          <span>Birdies est.</span>
          <strong>{formatAud(bom.totals.bedsAud)}</strong>
        </div>
      </div>

      <div className="bom-toolbar">
        <button type="button" onClick={() => void copy()}>
          {copied ? 'Copied' : 'Copy cut list'}
        </button>
        <button type="button" className="no-print" onClick={() => window.print()}>
          Print
        </button>
      </div>

      <BomTable title="Cage buy list" total={bom.totals.cageAud} lines={bom.lines} />
      <BomTable title="Birdies price list" total={bom.totals.bedsAud} lines={bom.bedLines} />

      <p className="price-note">{bom.priceNote}</p>
    </div>
  )
}

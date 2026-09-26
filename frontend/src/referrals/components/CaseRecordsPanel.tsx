import React, { useEffect, useState } from 'react';
import './referrals.css';
import type { CaseRecords, Ownership } from '../types/referral.types';
import { caseRecordsApi, type RecordTarget } from '../api/referralApi';
import { SmartTextInput } from '../../smart-input/SmartTextInput';
import { suggestApi } from '../../smart-input/suggestApi';

export type CaseSection = 'reports' | 'prescriptions' | 'notes';

interface CaseRecordsPanelProps {
  /** Loads the case file (visit or referral view). Re-run when `reloadKey` changes. */
  load: () => Promise<CaseRecords>;
  /** Where new records go. Adding is shown only when the server says `canAdd`. */
  target: RecordTarget;
  doctorId: number;
  /** One section, or all three with a tab switcher. */
  sections?: CaseSection[];
  /** Hide the viewed visit's own advice from Notes (when the advice is shown elsewhere). */
  hideOwnAdvice?: boolean;
  reloadKey?: unknown;
}

const ROLE_LABEL: Record<Ownership['authorRole'], string> = {
  visit_doctor: 'Visit doctor',
  second_opinion: 'Second opinion',
  imported: 'Imported from handover',
};

/**
 * "You" / "Dr X · Imported from handover · visit 2026-09-29" — shown on every record so
 * ownership is never ambiguous, including on copies.
 */
export const OwnerChip: React.FC<{ owner: Ownership }> = ({ owner }) => (
  <span className={`rf-owner ${owner.mine ? 'mine' : ''} ${owner.authorRole}`}>
    👤 {owner.mine ? 'You' : owner.authorName}
    <span className="rf-owner-meta">
      {' · '}{ROLE_LABEL[owner.authorRole]}
      {(owner.inherited || owner.authorRole === 'imported') && owner.visitDate ? ` · visit ${owner.visitDate}` : ''}
    </span>
  </span>
);

const emptyMed = { medicineName: '', dosage: '', frequency: '', duration: '', instructions: '' };

/**
 * The case file: reports, prescriptions and notes for a visit (plus same-doctor history),
 * each tagged with its owner. Used by the visit's doctor (appointment detail) and by a
 * second-opinion doctor (referral workspace) alike.
 *
 * Records are permanent: they can be added, never edited — including imported handover copies.
 */
export const CaseRecordsPanel: React.FC<CaseRecordsPanelProps> = ({
  load, target, doctorId, sections = ['reports', 'prescriptions', 'notes'], hideOwnAdvice, reloadKey
}) => {
  const [data, setData] = useState<CaseRecords | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<CaseSection>(sections[0]);
  const [report, setReport] = useState({ title: '', textContent: '' });
  const [med, setMed] = useState(emptyMed);
  const [saving, setSaving] = useState(false);

  const refresh = () => {
    load().then(d => { setData(d); setError(''); }).catch(e => setError(e?.message || 'Could not load records.'));
  };
  useEffect(refresh, [reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (fn: () => Promise<unknown>, reset: () => void) => {
    setSaving(true);
    setError('');
    try {
      await fn();
      reset();
      refresh();
    } catch (e: any) {
      setError(e?.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  if (!data) return error ? <div className="rf-error">❌ {error}</div> : <p className="dd-loading">Loading case records…</p>;

  const notes = data.notes.filter(n => !(hideOwnAdvice && n.kind === 'advice' && n.owner.appointmentId === data.appointmentId && !n.owner.referralId));
  const count: Record<CaseSection, number> = { reports: data.reports.length, prescriptions: data.prescriptions.length, notes: notes.length };
  const label: Record<CaseSection, string> = { reports: '📄 Reports', prescriptions: '💊 Prescriptions', notes: '📝 Notes & findings' };
  const shown = sections.length === 1 ? sections[0] : tab;

  return (
    <div>
      {sections.length > 1 && (
        <div className="rf-filters">
          {sections.map(s => (
            <button key={s} className={`rf-filter ${tab === s ? 'active' : ''}`} onClick={() => setTab(s)}>
              {label[s]} ({count[s]})
            </button>
          ))}
        </div>
      )}

      {shown === 'reports' && (
        <>
          {data.canAdd && (
            <div className="dd-advice-panel" style={{ marginBottom: 16 }}>
              <h3>📄 Add Medical Report</h3>
              <form
                onSubmit={e => {
                  e.preventDefault();
                  const saved = { ...report };
                  submit(async () => {
                    await caseRecordsApi.addReport(doctorId, target, { ...saved, reportType: 'text' });
                    // teach this doctor's personal suggestion model (only after a successful save)
                    suggestApi.learn('report_title', saved.title, doctorId);
                    suggestApi.learn('report_body', saved.textContent, doctorId);
                  }, () => setReport({ title: '', textContent: '' }));
                }}
                style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
              >
                <SmartTextInput field="report_title" doctorId={doctorId} placeholder="Report Title (e.g., Echo findings)"
                  value={report.title} onChange={v => setReport(r => ({ ...r, title: v }))}
                  className="dd-advice-textarea" style={{ minHeight: 40 }} required />
                <SmartTextInput field="report_body" doctorId={doctorId} multiline rows={4} placeholder="Report Details / Content"
                  value={report.textContent} onChange={v => setReport(r => ({ ...r, textContent: v }))}
                  className="dd-advice-textarea" required />
                <div className="rf-form-foot">
                  <button type="submit" className="doc-btn-primary" disabled={saving}>
                    {saving ? 'Saving…' : 'Add Report'}
                  </button>
                  <span className="rf-meta">🔒 Reports are permanent — they can't be changed once added.</span>
                </div>
              </form>
            </div>
          )}
          {data.reports.length === 0 ? (
            <div className="dd-empty-state" style={{ padding: '32px 20px' }}>
              <div className="dd-empty-icon">📄</div>
              <h3>No reports in this case yet</h3>
            </div>
          ) : (
            <div className="dd-medicine-list">
              {data.reports.map(r => (
                <div key={r.id} className={`dd-medicine-card ${r.owner.mine ? 'rf-mine' : ''} ${r.owner.authorRole === 'imported' ? 'rf-imported' : ''}`}>
                  <div className="dd-medicine-top">
                    <h4>📄 {r.title}</h4>
                    <span className="dd-dosage">{r.reportDate}</span>
                  </div>
                  {r.textContent && <p className="dd-medicine-note" style={{ whiteSpace: 'pre-wrap' }}>{r.textContent}</p>}
                  {r.fileUrl && <img src={r.fileUrl} alt={r.title} style={{ maxWidth: '100%', borderRadius: 6, marginTop: 6 }} />}
                  <OwnerChip owner={r.owner} />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {shown === 'prescriptions' && (
        <>
          {data.canAdd && (
            <div className="dd-advice-panel" style={{ marginBottom: 16 }}>
              <h3>💊 Add Prescription</h3>
              <form
                onSubmit={e => {
                  e.preventDefault();
                  const saved = { ...med };
                  submit(async () => {
                    await caseRecordsApi.addPrescription(doctorId, target, saved);
                    const ctx = { medicine: saved.medicineName };
                    suggestApi.learn('medicine', saved.medicineName, doctorId);
                    suggestApi.learn('dosage', saved.dosage, doctorId, ctx);
                    suggestApi.learn('frequency', saved.frequency, doctorId, ctx);
                    suggestApi.learn('duration', saved.duration, doctorId, ctx);
                    suggestApi.learn('instructions', saved.instructions, doctorId, ctx);
                  }, () => setMed(emptyMed));
                }}
                style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
              >
                <SmartTextInput field="medicine" doctorId={doctorId} placeholder="Medicine Name (e.g., Dolo 650)"
                  value={med.medicineName} onChange={v => setMed(m => ({ ...m, medicineName: v }))}
                  className="dd-advice-textarea" style={{ minHeight: 40 }} required />
                <div style={{ display: 'flex', gap: 10 }}>
                  <SmartTextInput field="dosage" doctorId={doctorId} context={{ medicine: med.medicineName }}
                    placeholder="Dosage (e.g., 500mg)" value={med.dosage} onChange={v => setMed(m => ({ ...m, dosage: v }))}
                    className="dd-advice-textarea" style={{ minHeight: 40 }} wrapperStyle={{ flex: 1 }} />
                  <SmartTextInput field="frequency" doctorId={doctorId} context={{ medicine: med.medicineName }}
                    placeholder="Frequency (e.g., BD)" value={med.frequency} onChange={v => setMed(m => ({ ...m, frequency: v }))}
                    className="dd-advice-textarea" style={{ minHeight: 40 }} wrapperStyle={{ flex: 1 }} />
                </div>
                <SmartTextInput field="duration" doctorId={doctorId} context={{ medicine: med.medicineName }}
                  placeholder="Duration (e.g., 5 days)" value={med.duration} onChange={v => setMed(m => ({ ...m, duration: v }))}
                  className="dd-advice-textarea" style={{ minHeight: 40 }} />
                <SmartTextInput field="instructions" doctorId={doctorId} context={{ medicine: med.medicineName }} multiline rows={2}
                  placeholder="Instructions (e.g., After food)" value={med.instructions} onChange={v => setMed(m => ({ ...m, instructions: v }))}
                  className="dd-advice-textarea" />
                <div className="rf-form-foot">
                  <button type="submit" className="doc-btn-primary" disabled={saving}>
                    {saving ? 'Saving…' : 'Add Medicine'}
                  </button>
                  <span className="rf-meta">🔒 Prescriptions are permanent — they can't be changed once added.</span>
                </div>
              </form>
            </div>
          )}
          {data.prescriptions.length === 0 ? (
            <div className="dd-empty-state" style={{ padding: '32px 20px' }}>
              <div className="dd-empty-icon">💊</div>
              <h3>No prescriptions in this case yet</h3>
            </div>
          ) : (
            <div className="dd-medicine-list">
              {data.prescriptions.map(m => (
                <div key={m.id} className={`dd-medicine-card ${m.owner.mine ? 'rf-mine' : ''} ${m.owner.authorRole === 'imported' ? 'rf-imported' : ''}`}>
                  <div className="dd-medicine-top">
                    <h4>💊 {m.medicineName}</h4>
                    {m.dosage && <span className="dd-dosage">{m.dosage}</span>}
                  </div>
                  <div className="dd-medicine-meta">
                    {m.frequency && <div className="dd-meta-box"><span className="label">Frequency</span><span className="value">{m.frequency}</span></div>}
                    {m.duration && <div className="dd-meta-box"><span className="label">Duration</span><span className="value">{m.duration}</span></div>}
                    <div className="dd-meta-box"><span className="label">Prescribed</span><span className="value">{m.prescribedDate}</span></div>
                  </div>
                  {m.instructions && <p className="dd-medicine-note">📝 {m.instructions}</p>}
                  <OwnerChip owner={m.owner} />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {shown === 'notes' && (
        notes.length === 0 ? (
          <p className="rf-meta">No earlier advice or second-opinion findings in this case.</p>
        ) : (
          <div className="rf-list">
            {notes.map((n, i) => (
              <div key={i} className={`rf-quote ${n.kind === 'findings' ? 'findings' : ''}`}>
                <strong>{n.kind === 'findings' ? '🩺 Second-opinion findings' : '📝 General advice'}</strong>
                <div style={{ margin: '4px 0 6px' }}>{n.text}</div>
                <OwnerChip owner={n.owner} />
              </div>
            ))}
          </div>
        )
      )}

      {error && <div className="rf-error" style={{ marginTop: 10 }}>❌ {error}</div>}
    </div>
  );
};

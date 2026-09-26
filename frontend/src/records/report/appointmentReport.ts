import { jsPDF } from 'jspdf';

// ─── Data (mirrors backend com.medroute.dto.AppointmentReportView) ──────────

export interface AppointmentReportData {
  visit: {
    id: number; date: string; status: string; displayStatus: string | null;
    tokenNumber: number | null; tokenCode: string | null; expectedTime: string | null;
  };
  patient: { fullName: string; age: number | null; gender: string | null; bloodGroup: string | null; mobile: string | null };
  doctor: { name: string; qualification: string | null; department: string | null; yearsOfExperience: number | null; avgMinutesPerPatient: number | null } | null;
  hospital: { name: string; address: string | null; state: string | null; type: string | null; opdHours: string | null; rating: number | null; accreditation: string[] } | null;
  referredFrom: { doctorName: string; department: string | null; hospitalName: string | null; referredOn: string | null } | null;
  generalAdvice: string | null;
  reports: { title: string; reportType: string; textContent: string | null; fileUrl: string | null; reportDate: string; authorName: string | null }[];
  prescriptions: { medicineName: string; dosage: string | null; frequency: string | null; duration: string | null; instructions: string | null; prescribedDate: string; authorName: string | null }[];
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export async function fetchAppointmentReport(appointmentId: number, userId: number): Promise<AppointmentReportData> {
  const res = await fetch(`${API}/api/appointment-report/${appointmentId}?userId=${userId}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Could not load the appointment report.');
  }
  return res.json();
}

// ─── PDF layout ─────────────────────────────────────────────────────────────

const PAGE_W = 210;
const PAGE_H = 297;
const M = 16;                 // page margin (mm)
const W = PAGE_W - M * 2;     // content width
const TEAL: [number, number, number] = [0, 96, 120];
const MUTED: [number, number, number] = [110, 120, 130];
const TEXT: [number, number, number] = [28, 42, 56];

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'Confirmed', referred: 'Referred', feedback_received: 'Feedback received',
  completed: 'Completed', cancelled: 'Cancelled',
};

const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return '-';
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
const orDash = (v: unknown) => (v === null || v === undefined || v === '' ? '-' : String(v));
const cap = (s: string | null | undefined) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '-');

/** Small layout engine: tracks the cursor and adds pages as content flows. */
class Layout {
  doc: jsPDF;
  y = M;

  constructor(doc: jsPDF) { this.doc = doc; }

  ensure(h: number) {
    if (this.y + h > PAGE_H - M - 8) {
      this.doc.addPage();
      this.y = M;
    }
  }

  section(title: string) {
    this.ensure(14);
    this.y += 4;
    this.doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(...TEAL);
    this.doc.text(title.toUpperCase(), M, this.y);
    this.y += 1.8;
    this.doc.setDrawColor(...TEAL).setLineWidth(0.4).line(M, this.y, M + W, this.y);
    this.y += 5;
  }

  /** Two-column label/value grid. */
  fields(rows: [string, string][], cols = 2) {
    const colW = W / cols;
    for (let i = 0; i < rows.length; i += cols) {
      const chunk = rows.slice(i, i + cols);
      const wrapped = chunk.map(([, v]) => this.doc.setFont('helvetica', 'normal').setFontSize(10).splitTextToSize(v, colW - 4) as string[]);
      const h = 4.5 + Math.max(...wrapped.map(w => w.length)) * 4.6;
      this.ensure(h);
      chunk.forEach(([label], j) => {
        const x = M + j * colW;
        this.doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...MUTED);
        this.doc.text(label.toUpperCase(), x, this.y);
        this.doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(...TEXT);
        this.doc.text(wrapped[j], x, this.y + 4.5);
      });
      this.y += h + 1.5;
    }
  }

  paragraph(text: string, opts: { size?: number; color?: [number, number, number]; bold?: boolean; indent?: number } = {}) {
    const size = opts.size ?? 10;
    const indent = opts.indent ?? 0;
    this.doc.setFont('helvetica', opts.bold ? 'bold' : 'normal').setFontSize(size).setTextColor(...(opts.color ?? TEXT));
    const lines = this.doc.splitTextToSize(text, W - indent) as string[];
    const lh = size * 0.46;
    for (const line of lines) {
      this.ensure(lh);
      this.doc.text(line, M + indent, this.y);
      this.y += lh;
    }
  }

  gap(h = 2) { this.y += h; }
}

/** Builds the PDF for one appointment and triggers the browser download. */
export function downloadAppointmentReportPdf(r: AppointmentReportData) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const L = new Layout(doc);

  // ── Header band ──
  doc.setFillColor(...TEAL).rect(0, 0, PAGE_W, 30, 'F');
  doc.setTextColor(255, 255, 255).setFont('helvetica', 'bold').setFontSize(18);
  doc.text('SujhavSewa', M, 13);
  doc.setFont('helvetica', 'normal').setFontSize(11);
  doc.text('Appointment Report', M, 21);
  doc.setFontSize(9);
  doc.text(`Visit date: ${fmtDate(r.visit.date)}`, PAGE_W - M, 13, { align: 'right' });
  doc.text(`Status: ${STATUS_LABEL[r.visit.displayStatus ?? ''] ?? cap(r.visit.status)}`, PAGE_W - M, 19, { align: 'right' });
  if (r.visit.tokenCode) doc.text(`Ref: ${r.visit.tokenCode}`, PAGE_W - M, 25, { align: 'right' });
  L.y = 38;

  // ── Patient ──
  L.section('Patient');
  L.fields([
    ['Name', orDash(r.patient.fullName)],
    ['Age / Gender', `${orDash(r.patient.age)} yrs / ${cap(r.patient.gender)}`],
    ['Blood group', orDash(r.patient.bloodGroup)],
    ['Mobile', orDash(r.patient.mobile)],
  ]);

  // ── Appointment ──
  L.section('Appointment');
  L.fields([
    ['Date', fmtDate(r.visit.date)],
    ['Status', STATUS_LABEL[r.visit.displayStatus ?? ''] ?? cap(r.visit.status)],
    ['Token number', orDash(r.visit.tokenNumber)],
    ['Expected time', orDash(r.visit.expectedTime)],
  ]);
  if (r.referredFrom) {
    L.paragraph(
      `Referred by ${r.referredFrom.doctorName}`
      + [r.referredFrom.department, r.referredFrom.hospitalName].filter(Boolean).map(s => `, ${s}`).join('')
      + (r.referredFrom.referredOn ? ` on ${fmtDate(r.referredFrom.referredOn)}` : '') + '.',
      { size: 9, color: MUTED });
  }

  // ── Doctor ──
  if (r.doctor) {
    L.section('Doctor');
    L.fields([
      ['Name', orDash(r.doctor.name)],
      ['Qualification', orDash(r.doctor.qualification)],
      ['Department', orDash(r.doctor.department)],
      ['Experience', r.doctor.yearsOfExperience != null ? `${r.doctor.yearsOfExperience} years` : '-'],
    ]);
  }

  // ── Hospital ──
  if (r.hospital) {
    L.section('Hospital');
    L.fields([
      ['Name', orDash(r.hospital.name)],
      ['Type', cap(r.hospital.type)],
      ['Address', [r.hospital.address, r.hospital.state].filter(Boolean).join(', ') || '-'],
      ['OPD hours', orDash(r.hospital.opdHours)],
      ['Accreditation', r.hospital.accreditation.length ? r.hospital.accreditation.join(', ') : '-'],
      ['Rating', r.hospital.rating != null ? `${r.hospital.rating.toFixed(1)} / 5` : '-'],
    ]);
  }

  // ── Advice ──
  L.section('General advice');
  if (r.generalAdvice) {
    L.paragraph(r.generalAdvice);
    if (r.doctor) L.paragraph(`- ${r.doctor.name}`, { size: 8.5, color: MUTED });
  } else {
    L.paragraph('No advice recorded for this visit.', { color: MUTED });
  }

  // ── Reports ──
  L.section(`Medical reports (${r.reports.length})`);
  if (r.reports.length === 0) {
    L.paragraph('No reports recorded for this visit.', { color: MUTED });
  }
  r.reports.forEach((rep, i) => {
    if (i > 0) L.gap(3);
    L.ensure(12);
    L.paragraph(`${i + 1}. ${rep.title}`, { bold: true });
    L.paragraph(`${fmtDate(rep.reportDate)}${rep.authorName ? `  |  Recorded by ${rep.authorName}` : ''}`, { size: 8.5, color: MUTED });
    L.gap(1);
    if (rep.textContent) L.paragraph(rep.textContent, { indent: 4 });
    if (rep.fileUrl) L.paragraph(`Attached image: ${rep.fileUrl}`, { size: 8.5, color: MUTED, indent: 4 });
  });

  // ── Prescriptions ──
  L.section(`Prescriptions (${r.prescriptions.length})`);
  if (r.prescriptions.length === 0) {
    L.paragraph('No medicines prescribed for this visit.', { color: MUTED });
  } else {
    const cols = [
      { h: 'Medicine', w: 44 }, { h: 'Dosage', w: 22 }, { h: 'Frequency', w: 32 },
      { h: 'Duration', w: 22 }, { h: 'Instructions / Prescribed by', w: W - 120 },
    ];
    const header = () => {
      L.ensure(9);
      doc.setFillColor(232, 242, 245).rect(M, L.y - 4.5, W, 7, 'F');
      doc.setFont('helvetica', 'bold').setFontSize(8.5).setTextColor(...TEAL);
      let x = M + 1.5;
      cols.forEach(c => { doc.text(c.h, x, L.y); x += c.w; });
      L.y += 5;
    };
    header();
    r.prescriptions.forEach(m => {
      const cells = [
        m.medicineName, orDash(m.dosage), orDash(m.frequency), orDash(m.duration),
        [m.instructions, m.authorName ? `by ${m.authorName}` : null].filter(Boolean).join(' - ') || '-',
      ];
      doc.setFont('helvetica', 'normal').setFontSize(9);
      const wrapped = cells.map((c, i) => doc.splitTextToSize(c, cols[i].w - 3) as string[]);
      const h = Math.max(...wrapped.map(w => w.length)) * 4.2 + 2;
      if (L.y + h > PAGE_H - M - 8) { doc.addPage(); L.y = M; header(); }
      let x = M + 1.5;
      doc.setTextColor(...TEXT);
      wrapped.forEach((lines, i) => { doc.text(lines, x, L.y); x += cols[i].w; });
      L.y += h;
      doc.setDrawColor(225, 232, 236).setLineWidth(0.2).line(M, L.y - 3, M + W, L.y - 3);
    });
  }

  // ── Footer on every page ──
  const pages = doc.getNumberOfPages();
  const generated = new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...MUTED);
    doc.text(`Generated on ${generated} from SujhavSewa. This report reflects records at the time of download.`, M, PAGE_H - 8);
    doc.text(`Page ${p} of ${pages}`, PAGE_W - M, PAGE_H - 8, { align: 'right' });
  }

  const safeName = r.patient.fullName.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'patient';
  doc.save(`Appointment_Report_${safeName}_${r.visit.date}.pdf`);
}

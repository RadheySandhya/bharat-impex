import React, { useRef, useState } from 'react';
import Papa from 'papaparse';
import { Upload, Download, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { Modal } from './Modal';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

// CSV header → field (case / spacing insensitive)
const HEADER_MAP = {
  party_name: ['party name', 'party', 'name', 'party_name', 'supplier', 'customer', 'company', 'firm name', 'account name'],
  party_type: ['type', 'party type', 'party_type', 'category'],
  contact_person: ['contact person', 'contact', 'contact_person', 'person'],
  phone: ['phone', 'mobile', 'phone no', 'mobile no', 'contact no', 'phone number', 'mobile number'],
  email: ['email', 'e-mail', 'email id', 'mail'],
  gstin: ['gstin', 'gst', 'gst no', 'gst number', 'gstin/uin', 'gstin no'],
  address: ['address', 'full address', 'addr', 'city'],
};

const STATUS = {
  NEW: { label: 'Will be created', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200', Icon: CheckCircle2 },
  DUPLICATE: { label: 'Duplicate — skipped', cls: 'bg-amber-50 text-amber-900 border-amber-200', Icon: AlertTriangle },
  DUPLICATE_IN_FILE: { label: 'Repeated — skipped', cls: 'bg-amber-50 text-amber-900 border-amber-200', Icon: AlertTriangle },
  INVALID: { label: 'Error — skipped', cls: 'bg-rose-50 text-rose-800 border-rose-200', Icon: XCircle },
};

function mapRows(data) {
  if (!data.length) return [];
  const headers = Object.keys(data[0]);
  const fieldFor = {};
  headers.forEach((h) => {
    const k = h.toLowerCase().replace(/[_\s]+/g, ' ').trim();
    Object.entries(HEADER_MAP).forEach(([field, aliases]) => {
      if (!fieldFor[field] && aliases.includes(k)) fieldFor[field] = h;
    });
  });
  return data
    .map((r) => Object.fromEntries(Object.keys(HEADER_MAP).map((f) => [f, fieldFor[f] ? String(r[fieldFor[f]] ?? '').trim() : ''])))
    .filter((r) => Object.values(r).some((v) => v !== ''));
}

function downloadTemplate() {
  const csv = [
    'Party Name,Type,Contact Person,Phone,Email,GSTIN,Address',
    'Shree Brass Industries,Supplier,Ramesh Gupta,9876543210,sales@shreebrass.in,06ABCDE1234F1Z5,"Plot 12, Bhiwadi, Rajasthan"',
    'Aqua Sanitary Traders,Customer,Anil Kumar,9811122233,,07PQRSX5678K1Z2,"Mayapuri Industrial Area, Delhi"',
  ].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'Party_Master_Import_Template.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Bulk-create parties from CSV: preview with duplicate warnings, then create only the new ones. */
export function PartyImportModal({ isOpen, onClose, onImported }) {
  const fileRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState([]);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState('ALL');
  const { success, error } = useToast();

  const reset = () => {
    setFileName(''); setRows([]); setPreview(null); setFilter('ALL');
    if (fileRef.current) fileRef.current.value = '';
  };
  const close = () => { reset(); onClose(); };

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setPreview(null);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      complete: async (res) => {
        const mapped = mapRows(res.data || []);
        if (!mapped.length) {
          error('No rows found. Use the template: the first row must be the column names (Party Name, Type, Phone, GSTIN…).');
          return;
        }
        if (!mapped.some((r) => r.party_name)) {
          error('No "Party Name" column found in the CSV.');
          return;
        }
        setRows(mapped);
        setBusy(true);
        try {
          const r = await api.inOut.bulkImportParties(mapped, 'preview');
          setPreview(r.data);
        } catch (err) {
          error(err.message || 'Could not check the file.');
        } finally {
          setBusy(false);
        }
      },
      error: (err) => error('Could not read the CSV: ' + err.message),
    });
  };

  const commit = async () => {
    setBusy(true);
    try {
      const r = await api.inOut.bulkImportParties(rows, 'commit');
      success(r.message || 'Parties created.');
      onImported?.();
      close();
    } catch (err) {
      error(err.message || 'Import failed.');
    } finally {
      setBusy(false);
    }
  };

  const s = preview?.summary;
  const shown = (preview?.rows || []).filter((r) =>
    filter === 'ALL' ? true : filter === 'SKIP' ? r.status !== 'NEW' : r.status === 'NEW');

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title="Import Parties from CSV"
      maxWidth="max-w-4xl"
      footer={
        <>
          <button type="button" onClick={close} className="px-4 py-2 rounded-xl bg-black/[0.05] text-[13px] font-medium text-slate-700">Cancel</button>
          <button
            type="button"
            onClick={commit}
            disabled={busy || !s || s.new === 0}
            className="px-4 py-2 rounded-xl bg-[#007AFF] hover:bg-[#0A6CF0] disabled:opacity-40 text-[13px] font-semibold text-white"
          >
            {busy && preview ? 'Creating…' : s ? `Create ${s.new} part${s.new === 1 ? 'y' : 'ies'}` : 'Create parties'}
          </button>
        </>
      }
    >
      <div className="space-y-4 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-[#007AFF] text-white text-[13px] font-semibold cursor-pointer">
            <Upload className="w-4 h-4" aria-hidden="true" />
            {fileName ? 'Choose another file' : 'Choose CSV file'}
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
          </label>
          <button type="button" onClick={downloadTemplate} className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-black/[0.05] text-[#007AFF] text-[13px] font-medium">
            <Download className="w-4 h-4" aria-hidden="true" /> Download template
          </button>
          {fileName && <span className="text-[13px] text-slate-500 truncate max-w-[240px]">{fileName}</span>}
        </div>

        {!preview && !busy && (
          <p className="text-[13px] text-slate-500">
            Columns: <strong className="text-slate-700">Party Name</strong> (required), Type (Supplier / Customer / Both), Contact Person, Phone, Email, GSTIN, Address.
            Parties that already exist (same name or same GSTIN) are flagged and skipped; everything else is created automatically.
          </p>
        )}
        {busy && !preview && <p className="text-[13px] text-slate-500">Checking for duplicates…</p>}

        {s && (
          <>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3">
                <div className="text-2xl font-bold text-emerald-800 tabular-nums">{s.new}</div>
                <div className="text-[12px] text-emerald-900">new — will be created</div>
              </div>
              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3">
                <div className="text-2xl font-bold text-amber-800 tabular-nums">{s.duplicate}</div>
                <div className="text-[12px] text-amber-900">duplicates — skipped</div>
              </div>
              <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3">
                <div className="text-2xl font-bold text-rose-800 tabular-nums">{s.invalid}</div>
                <div className="text-[12px] text-rose-900">errors — skipped</div>
              </div>
            </div>

            {s.duplicate > 0 && (
              <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-[13px] text-amber-900">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
                <span>{s.duplicate} part{s.duplicate === 1 ? 'y is' : 'ies are'} already in Party Master or repeated in the file. They will not be created again.</span>
              </div>
            )}

            <div className="flex items-center gap-1 bg-black/[0.04] p-1 rounded-xl w-fit text-[12px] font-medium">
              {[['ALL', `All (${s.total})`], ['NEW', `New (${s.new})`], ['SKIP', `Skipped (${s.duplicate + s.invalid})`]].map(([v, l]) => (
                <button key={v} type="button" onClick={() => setFilter(v)} className={`px-3 py-1 rounded-lg ${filter === v ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600'}`}>{l}</button>
              ))}
            </div>

            <div className="border border-slate-200 rounded-xl overflow-auto max-h-[45vh]">
              <table className="w-full text-[13px]">
                <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 text-left sticky top-0">
                  <tr>
                    <th className="p-2.5">Line</th>
                    <th className="p-2.5">Party Name</th>
                    <th className="p-2.5">Type</th>
                    <th className="p-2.5">Phone</th>
                    <th className="p-2.5">GSTIN</th>
                    <th className="p-2.5">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shown.map((r) => {
                    const st = STATUS[r.status] || STATUS.NEW;
                    return (
                      <tr key={r.row} className={r.status === 'NEW' ? '' : 'bg-slate-50/60'}>
                        <td className="p-2.5 text-slate-400 tabular-nums">{r.row}</td>
                        <td className="p-2.5 font-medium text-slate-900">{r.party_name || <span className="text-rose-600">(empty)</span>}</td>
                        <td className="p-2.5 text-slate-600">{r.party_type}</td>
                        <td className="p-2.5 text-slate-600">{r.phone || '—'}</td>
                        <td className="p-2.5 font-mono text-slate-600">{r.gstin || '—'}</td>
                        <td className="p-2.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${st.cls}`}>
                            <st.Icon className="w-3 h-3" aria-hidden="true" /> {st.label}
                          </span>
                          {r.message && <div className="text-[11px] text-slate-500 mt-0.5">{r.message}</div>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

export default PartyImportModal;

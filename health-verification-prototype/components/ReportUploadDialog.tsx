'use client';

import { FileText, Loader2, Upload, X } from 'lucide-react';
import { useState } from 'react';
import type {
  DiseaseReport,
  ExtractedReportMetadata
} from '@/lib/types';
import { createBrowserSupabase } from '@/lib/supabase-browser';

type UploadResponse = {
  report: DiseaseReport;
  extracted: ExtractedReportMetadata;
  message: string;
};

export function ReportUploadDialog({
  open,
  onClose,
  onUploaded
}: {
  open: boolean;
  onClose: () => void;
  onUploaded: (result: UploadResponse) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<UploadResponse | null>(null);

  if (!open) return null;

  function close() {
    if (busy) return;
    setFile(null);
    setError('');
    setResult(null);
    onClose();
  }

  async function upload() {
    if (!file) return;
    setBusy(true);
    setError('');
    let uploadedPath = '';
    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) throw new Error('Report uploads require the configured Supabase deployment.');
      if (file.size > 10 * 1024 * 1024) throw new Error('Report must be 10 MB or smaller.');

      const supabase = createBrowserSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Your session expired. Sign in again.');

      const extension = file.type === 'application/pdf' ? 'pdf' : 'jpg';
      uploadedPath = `${user.id}/uploads/${crypto.randomUUID()}.${extension}`;
      const { error: storageError } = await supabase.storage.from('reports').upload(uploadedPath, file, {
        contentType: file.type === 'image/jpg' ? 'image/jpeg' : file.type,
        upsert: false
      });
      if (storageError) throw storageError;

      const response = await fetch('/api/reports/upload', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ path: uploadedPath, original_name: file.name, content_type: file.type })
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Report upload failed.');
      setResult(json);
      onUploaded(json);
    } catch (e: any) {
      if (uploadedPath) {
        try { await createBrowserSupabase().storage.from('reports').remove([uploadedPath]); } catch {}
      }
      setError(e.message || 'Report upload failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Upload report">
      <div className="w-full max-w-xl rounded-[28px] bg-white p-5 shadow-2xl sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.18em] text-moss">Add report</p>
            <h2 className="mt-1 text-2xl font-semibold">Upload a lab report</h2>
            <p className="mt-2 text-sm leading-6 text-black/50">
              PDF and JPG/JPEG are supported up to 10 MB. Mitjayn extracts
              only the report name, report date and lab. Profile details are
              never changed from an uploaded report.
              </p>
          </div>
          <button onClick={close} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-black/5" aria-label="Close"><X size={18}/></button>
        </div>

        {!result ? <>
          <label className="mt-6 block cursor-pointer rounded-3xl border border-dashed border-black/15 bg-sand p-8 text-center hover:border-black/30">
            <Upload className="mx-auto text-moss" size={26}/>
            <p className="mt-3 font-semibold">{file ? file.name : 'Choose PDF or JPG report'}</p>
            <p className="mt-1 text-xs text-black/45">{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'Click to browse'}</p>
            <input
              type="file"
              accept="application/pdf,image/jpeg,.pdf,.jpg,.jpeg"
              className="hidden"
              onChange={e => { setFile(e.target.files?.[0] || null); setError(''); }}
            />
          </label>
          <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
            Uploaded reports appear in your profile immediately, but they stay <b>pending verification</b> until verified through the trusted lab flow. They do not become a verified health-card result just because a user uploaded them.
          </div>
          {error && <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          <div className="mt-5 flex justify-end gap-3">
            <button onClick={close} className="btn-secondary">Cancel</button>
            <button onClick={upload} disabled={!file || busy} className="btn-primary disabled:cursor-not-allowed disabled:opacity-50">
              {busy ? <><Loader2 size={17} className="animate-spin"/> Reading report…</> : <><Upload size={17}/> Upload report</>}
            </button>
          </div>
        </> : <>
          <div className="mt-6 rounded-3xl bg-mint p-5">
            <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-white"><FileText size={19}/></span><div><p className="font-semibold">Report added</p><p className="text-xs text-moss">Pending lab verification</p></div></div>
            <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
              <Item
                label="Report name"
                value={result.extracted.disease_name}
              />

              <Item
                label="Report date"
                value={result.extracted.report_date}
              />

              <Item
                label="Lab"
                value={result.extracted.lab_name}
              />
            </dl>
          </div>
          <p className="mt-4 text-xs leading-5 text-black/45">
            No patient name, age, gender, DOB, mobile number or result
            status is extracted from user-uploaded reports.
          </p>
          <div className="mt-5 flex justify-end"><button onClick={close} className="btn-primary">Done</button></div>
        </>}
      </div>
    </div>
  );
}

function Item({ label, value }: { label: string; value?: string | null }) {
  return <div><dt className="text-xs text-black/40">{label}</dt><dd className="mt-0.5 font-semibold capitalize">{value || 'Not detected'}</dd></div>;
}

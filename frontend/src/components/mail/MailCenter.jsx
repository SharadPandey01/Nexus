import { useState, useEffect, useRef } from 'react';
import { UploadCloud, FileSpreadsheet, Send, Filter, Eye, Loader2 } from 'lucide-react';
import { getParticipants, uploadParticipants, personalizeEmails, sendBatch } from '../../services/api';

const MailCenter = () => {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [sending, setSending] = useState(false);
  const [template, setTemplate] = useState('Dear {{name}},\n\nWe are excited to welcome you to TechSummit 2026. As a registered {{role}}, your access badge is ready.\n\nReminder: Your first session is at {{first_session_time}} in {{first_room}}.\n\nBest,\nOrganizing Committee');
  const [previews, setPreviews] = useState([]);
  const [previewIdx, setPreviewIdx] = useState(0);
  const fileRef = useRef(null);

  useEffect(() => {
    getParticipants()
      .then(setParticipants)
      .catch(() => setParticipants([]))
      .finally(() => setLoading(false));
  }, []);

  // Auto-generate preview when template or participants change
  useEffect(() => {
    if (participants.length > 0 && template) {
      const timer = setTimeout(() => {
        personalizeEmails(template, 'all')
          .then(r => { setPreviews(r.previews || []); setPreviewIdx(0); })
          .catch(() => {});
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [template, participants.length]);

  const handleFileUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadParticipants(file);
      setUploadResult(result);
      setParticipants(result.participants || []);
    } catch (e) {
      console.error('Upload failed:', e);
    }
    setUploading(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleSend = async () => {
    setSending(true);
    try { await sendBatch(); } catch (e) { console.error(e); }
    setSending(false);
  };

  const validCount = participants.filter(p => p.status === 'valid').length;
  const invalidCount = participants.filter(p => p.status === 'invalid').length;
  const preview = previews[previewIdx];

  return (
    <div className="space-y-6 h-full pb-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white drop-shadow-sm mb-2">Mail Center</h2>
          <p className="text-text-secondary">Upload attendee data. Hermes handles validation, segmentation, and distribution.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSend}
            disabled={sending || validCount === 0}
            className="flex items-center gap-2 px-4 py-2 bg-agents-hermes/10 text-agents-hermes border border-agents-hermes/30 rounded-lg text-sm font-medium hover:bg-agents-hermes/20 transition-colors shadow-[0_0_10px_rgba(52,211,153,0.1)] disabled:opacity-50"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {sending ? 'Sending...' : 'Batch Send'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Upload Zone */}
          <div
            className="bg-card border border-gray-800 border-dashed rounded-xl p-8 text-center hover:border-agents-hermes/50 transition-colors cursor-pointer group"
            onClick={() => fileRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
          >
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={e => handleFileUpload(e.target.files[0])} />
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-agents-hermes/10 transition-colors">
              {uploading ? <Loader2 size={32} className="text-agents-hermes animate-spin" /> : <UploadCloud size={32} className="text-gray-400 group-hover:text-agents-hermes transition-colors" />}
            </div>
            <h3 className="text-lg font-medium text-white mb-2">{uploading ? 'Processing...' : 'Upload Registration Data'}</h3>
            <p className="text-sm text-text-secondary mb-4 max-w-sm mx-auto">Drag and drop your CSV or Excel file here, or click to browse. Hermes will automatically extract and validate emails.</p>
            {(uploadResult || participants.length > 0) && (
              <div className="flex items-center justify-center text-xs text-gray-500 font-mono bg-gray-900 border border-gray-800 rounded px-3 py-1.5 w-max mx-auto">
                <FileSpreadsheet size={14} className="mr-2" />
                {uploadResult ? `${uploadResult.total_parsed} parsed` : `${participants.length} loaded`}
                <span className="ml-3 text-success font-bold flex items-center"><span className="w-2 h-2 bg-success rounded-full mr-1.5 inline-block"></span>Parsed ({validCount} valid)</span>
                {invalidCount > 0 && <span className="ml-2 text-error text-xs">{invalidCount} invalid</span>}
              </div>
            )}
          </div>

          {/* Data Table */}
          <div className="bg-card border border-gray-800 rounded-xl shadow-sm overflow-hidden min-h-[300px] flex flex-col">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/40">
              <h3 className="font-semibold text-white flex items-center text-sm">
                Validated Participants <span className="ml-2 bg-gray-800 px-2 py-0.5 rounded-full text-xs text-gray-400">{participants.length}</span>
              </h3>
              <button className="text-gray-400 hover:text-white flex items-center text-xs font-medium border border-gray-700 px-2 py-1 rounded bg-background">
                <Filter size={14} className="mr-1.5" /> Filter Segments
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-text-secondary uppercase bg-background border-b border-gray-800">
                  <tr>
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3">Email</th>
                    <th className="px-6 py-3">Role</th>
                    <th className="px-6 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {loading ? (
                    [1,2,3].map(i => (
                      <tr key={i} className="animate-pulse"><td className="px-6 py-3"><div className="h-4 bg-gray-700 rounded w-32"/></td><td className="px-6 py-3"><div className="h-4 bg-gray-700 rounded w-48"/></td><td className="px-6 py-3"><div className="h-4 bg-gray-700 rounded w-20"/></td><td className="px-6 py-3"><div className="h-4 bg-gray-700 rounded w-12 mx-auto"/></td></tr>
                    ))
                  ) : (
                    participants.slice(0, 20).map(p => (
                      <tr key={p.id} className={p.status === 'invalid' ? 'bg-error/5 hover:bg-error/10' : 'bg-card hover:bg-gray-800/30'}>
                        <td className="px-6 py-3 font-medium text-white">{p.name}</td>
                        <td className={`px-6 py-3 ${p.status === 'invalid' ? 'text-error line-through decoration-error/50' : 'text-gray-400'}`}>{p.email}</td>
                        <td className="px-6 py-3">
                          <span className={`text-[10px] px-2 py-1 rounded-full uppercase font-semibold border ${p.role === 'speaker' ? 'bg-primary/20 text-primary border-primary/30' : 'bg-gray-800 text-gray-300 border-gray-700'}`}>{p.role}</span>
                        </td>
                        <td className="px-6 py-3 text-center">
                          {p.status === 'valid'
                            ? <span className="text-success font-bold">✓</span>
                            : <span className="text-error text-xs font-bold border border-error/50 px-2 py-0.5 rounded cursor-help" title="Email validation failed">Invalid</span>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Template & Preview */}
        <div className="space-y-6 flex flex-col h-full">
           <div className="bg-card border border-gray-800 rounded-xl shadow-sm flex-1 flex flex-col">
              <div className="p-4 border-b border-gray-800 bg-gray-900/40">
                 <h3 className="font-semibold text-white text-sm">Email Template</h3>
              </div>
              <div className="p-4 flex-1">
                 <textarea 
                   className="w-full h-48 bg-background border border-gray-700 rounded-lg p-3 text-sm text-gray-300 focus:ring-1 focus:ring-primary focus:border-primary focus:outline-none resize-none"
                   value={template}
                   onChange={e => setTemplate(e.target.value)}
                 ></textarea>
              </div>
           </div>

           <div className="bg-agents-hermes/5 border border-agents-hermes/20 rounded-xl shadow-sm flex-1 flex flex-col">
              <div className="p-4 border-b border-agents-hermes/20 bg-agents-hermes/10 flex justify-between items-center text-agents-hermes">
                 <h3 className="font-semibold text-sm flex items-center"><Eye size={16} className="mr-2"/> Live Preview</h3>
                 <span className="text-xs">Preview {previewIdx + 1} of {previews.length || validCount || '—'}</span>
              </div>
              <div className="p-5 flex-1 text-sm text-gray-300 whitespace-pre-wrap font-serif italic bg-background/50 rounded-b-xl border-t-0">
                {preview ? (
                  <div dangerouslySetInnerHTML={{
                    __html: preview.body.replace(/\{\{(\w+)\}\}/g, '<strong class="text-white bg-agents-hermes/20 px-1 rounded not-italic">$1</strong>')
                  }} />
                ) : (
                  <span className="text-gray-500">Upload participants and write a template to see previews.</span>
                )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default MailCenter;

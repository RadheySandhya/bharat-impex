import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Boxes,
  TrendingUp,
  Layers,
  CheckCircle2,
  X,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import {
  downloadRMPurchaseTemplate,
  downloadFGSalesTemplate,
  downloadSKUPipelineTemplate,
  downloadMasterCatalog,
  downloadBulkStockTemplate
} from '../../utils/csvTemplates';
import { api } from '../../services/api';

export function CSVTemplateDownloadModal({ isOpen, onClose, defaultType = 'all' }) {
  const [downloadedType, setDownloadedType] = useState(null);
  const [rms, setRms] = useState([]);
  const [fgs, setFgs] = useState([]);
  const [processes, setProcesses] = useState([]);

  useEffect(() => {
    if (isOpen) {
      // Attempt to load current live RMs, FGs, and Processes to keep templates 100% synchronized
      api.rawMaterials.getAll().then(res => {
        if (res?.data) setRms(res.data);
      }).catch(() => { });

      api.finishedGoods.getAll().then(res => {
        if (res?.data) setFgs(res.data);
      }).catch(() => { });

      api.processes.getAll().then(res => {
        if (res?.data) setProcesses(res.data);
      }).catch(() => { });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDownload = (type) => {
    setDownloadedType(type);
    if (type === 'RM_PURCHASE') {
      downloadRMPurchaseTemplate(rms);
    } else if (type === 'FG_SALES') {
      downloadFGSalesTemplate(fgs);
    } else if (type === 'SKU_PIPELINE') {
      downloadSKUPipelineTemplate(null, processes);
    } else if (type === 'MASTER_CATALOG') {
      downloadMasterCatalog(rms, fgs);
    } else if (type === 'BULK_STOCK') {
      downloadBulkStockTemplate(rms, fgs);
    }

    setTimeout(() => {
      setDownloadedType(null);
    }, 3000);
  };

  const templates = [
    {
      id: 'BULK_STOCK',
      title: 'Bulk Stock Setup & Master Update (RM & FG)',
      description: 'Format to upload opening or current stock in bulk. Leave ID blank to automatically create new items & assign permanent codes!',
      icon: Boxes,
      badge: 'Auto-ID Engine',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
      actionText: 'Download Bulk Stock Template'
    },
    {
      id: 'RM_PURCHASE',
      title: 'Child Part (RM) Purchase Template',
      description: 'Pre-filled with all active Child Parts (Brass Rods, Copper, Cartridges, Screws, O-Rings, Boxes). Ready for Tally purchase upload.',
      icon: Boxes,
      badge: 'RM Pre-Filled',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
      actionText: 'Download Child Part Template'
    },
    {
      id: 'FG_SALES',
      title: 'Finished Goods (FG) Sales & Dispatch Template',
      description: 'Pre-filled with all Finished Goods & Faucet models (Basin Taps, Sink Mixers, Angle Valves, Seltos, Britney, Crista, Casper).',
      icon: TrendingUp,
      badge: 'FG Pre-Filled',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      actionText: 'Download FG Template'
    },
    {
      id: 'SKU_PIPELINE',
      title: 'SKU Tracking Sheet Multi-Stage Pipeline',
      description: 'Pre-filled with all faucet SKUs with Cat No, Avg Weight, and blank columns for each configured manufacturing stage.',
      icon: FileSpreadsheet,
      badge: 'Pipeline Ready',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      actionText: 'Download SKU Pipeline CSV'
    },
    {
      id: 'MASTER_CATALOG',
      title: 'Complete Master Catalog (Both Child Parts + FG)',
      description: 'Master reference CSV sheet containing all Child Parts and Finished Goods with internal codes, units, and standard prices.',
      icon: Layers,
      badge: 'Complete Catalog',
      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      actionText: 'Download Master Catalog'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-900 shadow-xs">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Download Pre-Filled CSV Formats</h3>
              <p className="text-xs text-slate-500 font-medium">
                Items are already filled in — just enter quantities/rates and upload directly!
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 font-bold text-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Templates List */}
        <div className="space-y-3">
          {templates.map((tpl) => {
            const Icon = tpl.icon;
            const isDownloaded = downloadedType === tpl.id;

            return (
              <div
                key={tpl.id}
                className="p-4 rounded-2xl border border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0 mt-0.5">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm">
                        {tpl.title}
                      </h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${tpl.badgeColor}`}>
                        {tpl.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      {tpl.description}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleDownload(tpl.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 transition-all shadow-xs ${isDownloaded
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                >
                  {isDownloaded ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Downloaded!</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>{tpl.actionText}</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer tip */}
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70 text-[11px] text-slate-600 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Open in Microsoft Excel or Google Sheets, edit values, and re-upload seamlessly.</span>
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-white border border-slate-300 font-bold text-slate-700 hover:bg-slate-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

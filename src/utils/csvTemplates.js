// ============================================================
// BHARAT IMPEX — PRE-FILLED CSV TEMPLATE EXPORTER
// ============================================================

export const DEFAULT_RAW_MATERIALS = [
  { item_name: 'BRASS ROD 25MM', code: 'RM-000001', unit: 'KG', default_rate: 580.00, supplier: 'Rajesh Metal Foundry' },
  { item_name: 'COPPER SHEET 2MM', code: 'RM-000002', unit: 'KG', default_rate: 720.00, supplier: 'Rajesh Metal Foundry' },
  { item_name: 'CERAMIC CARTRIDGE 35MM', code: 'RM-000003', unit: 'PCS', default_rate: 85.00, supplier: 'Apex Cartridges Ltd' },
  { item_name: 'ZINC LEVER HANDLE', code: 'RM-000004', unit: 'PCS', default_rate: 45.00, supplier: 'Apex Cartridges Ltd' },
  { item_name: 'SS SCREW M4X10', code: 'RM-000005', unit: 'PCS', default_rate: 1.50, supplier: 'Standard Fasteners Co' },
  { item_name: 'EPDM O-RING 22MM', code: 'RM-000006', unit: 'PCS', default_rate: 2.50, supplier: 'Seals & O-Rings India' },
  { item_name: 'BRASS AERATOR M24 NEOPERL', code: 'RM-000007', unit: 'PCS', default_rate: 28.00, supplier: 'Apex Cartridges Ltd' },
  { item_name: 'DUPLEX PRINTED PRODUCT BOX A1', code: 'RM-000008', unit: 'PCS', default_rate: 18.00, supplier: 'PackWell Printers' },
  { item_name: 'BRASS INGOT IS 319 GRADE 1', code: 'RM-000009', unit: 'KG', default_rate: 565.00, supplier: 'Gujarat Alloys & Metals' },
  { item_name: 'NICKEL ANODE CATHODE 99.9%', code: 'RM-000010', unit: 'KG', default_rate: 1850.00, supplier: 'Plating Chemicals Corp' },
  { item_name: 'CHROMIC ACID FLAKES 99.8%', code: 'RM-000011', unit: 'KG', default_rate: 420.00, supplier: 'Plating Chemicals Corp' },
  { item_name: 'SILICONE GREASE FOOD GRADE', code: 'RM-000012', unit: 'KG', default_rate: 950.00, supplier: 'Standard Fasteners Co' }
];

export const DEFAULT_FINISHED_GOODS = [
  { item_name: 'BASIN TAP MODEL A CHROME', code: 'FG-000001', unit: 'PCS', default_rate: 1250.00, customer: 'Modern Bath Fittings Mumbai' },
  { item_name: 'KITCHEN SINK MIXER MODEL B', code: 'FG-000002', unit: 'PCS', default_rate: 2100.00, customer: 'Elite Kitchen Emporium Delhi' },
  { item_name: 'ANGLE VALVE 2 IN 1 HEAVY', code: 'FG-000003', unit: 'PCS', default_rate: 650.00, customer: 'National Hardware Ahmedabad' },
  { item_name: 'CASTED C/S/C 3/4" BODY, SELTOS', code: 'FG-000004', unit: 'PCS', default_rate: 480.00, customer: 'Bharat Sanitary Distributors' },
  { item_name: 'CASTED C/S/C 1/2" BRITNEY', code: 'FG-000005', unit: 'PCS', default_rate: 440.00, customer: 'Bharat Sanitary Distributors' },
  { item_name: 'CASTED BIB COCK 1/2" BODY, SELTOS', code: 'FG-000006', unit: 'PCS', default_rate: 520.00, customer: 'Modern Bath Fittings Mumbai' },
  { item_name: 'CASTED C/S/C 3/4" BRITNEY', code: 'FG-000007', unit: 'PCS', default_rate: 460.00, customer: 'National Hardware Ahmedabad' },
  { item_name: 'CASTED BIB COCK BODY, CRISTA', code: 'FG-000008', unit: 'PCS', default_rate: 550.00, customer: 'Elite Kitchen Emporium Delhi' },
  { item_name: 'CASTED LONG BODY BODY, CRISTA', code: 'FG-000009', unit: 'PCS', default_rate: 680.00, customer: 'Modern Bath Fittings Mumbai' },
  { item_name: 'CASTED A/C BODY, SPIKE', code: 'FG-000010', unit: 'PCS', default_rate: 590.00, customer: 'Bharat Sanitary Distributors' },
  { item_name: 'CASTED PILLAR COCK BODY, CRISTA', code: 'FG-000011', unit: 'PCS', default_rate: 620.00, customer: 'National Hardware Ahmedabad' },
  { item_name: 'CASTED SINK MIXER BODY, CASPER', code: 'FG-000012', unit: 'PCS', default_rate: 1850.00, customer: 'Elite Kitchen Emporium Delhi' },
  { item_name: 'CASTED T/W/M BODY, SELTOS', code: 'FG-000013', unit: 'PCS', default_rate: 1950.00, customer: 'Modern Bath Fittings Mumbai' },
  { item_name: 'CASTED 2 IN 1 A/C BODY (2 KNOB), SPIKE', code: 'FG-000014', unit: 'PCS', default_rate: 890.00, customer: 'Bharat Sanitary Distributors' },
  { item_name: 'CASTED BIB COCK BODY, CASPER', code: 'FG-000015', unit: 'PCS', default_rate: 540.00, customer: 'National Hardware Ahmedabad' },
  { item_name: 'CASTED WALL MIXTURE SPOUT, DELTA', code: 'FG-000016', unit: 'PCS', default_rate: 980.00, customer: 'Elite Kitchen Emporium Delhi' },
  { item_name: 'CASTED 2IN1 BIB COCK 2K BODY CASPER', code: 'FG-000017', unit: 'PCS', default_rate: 920.00, customer: 'Modern Bath Fittings Mumbai' },
  { item_name: 'CASTED L/B BODY, SELTOS', code: 'FG-000018', unit: 'PCS', default_rate: 610.00, customer: 'Bharat Sanitary Distributors' },
  { item_name: 'CASTED LONG BODY, OSCAR', code: 'FG-000019', unit: 'PCS', default_rate: 640.00, customer: 'National Hardware Ahmedabad' },
  { item_name: 'CASTED 3 IN 1 WALL MIXTURE SPOUT, FACIA', code: 'FG-000020', unit: 'PCS', default_rate: 1450.00, customer: 'Elite Kitchen Emporium Delhi' },
  { item_name: 'CASTED P/C 1/2" BODY, CASPER', code: 'FG-000021', unit: 'PCS', default_rate: 490.00, customer: 'Modern Bath Fittings Mumbai' }
];

export const DEFAULT_SKU_PIPELINE = [
  { item_name: 'CASTED C/S/C 3/4" BODY, SELTOS', cat_no: '305', batch_no: '305', avg_weight: 0.320 },
  { item_name: 'CASTED C/S/C 1/2" BRITNEY', cat_no: '79', batch_no: '79', avg_weight: 0.280 },
  { item_name: 'CASTED BIB COCK 1/2" BODY, SELTOS', cat_no: '319', batch_no: '319', avg_weight: 0.345 },
  { item_name: 'CASTED C/S/C 3/4" BRITNEY', cat_no: '410', batch_no: '410', avg_weight: 0.195 },
  { item_name: 'CASTED BIB COCK BODY, CRISTA', cat_no: 'FB3', batch_no: 'FB3', avg_weight: 0.315 },
  { item_name: 'CASTED LONG BODY BODY, CRISTA', cat_no: 'FB3', batch_no: 'FB3', avg_weight: 0.375 },
  { item_name: 'CASTED A/C BODY, SPIKE', cat_no: '410', batch_no: '410', avg_weight: 0.175 },
  { item_name: 'CASTED PILLAR COCK BODY, CRISTA', cat_no: 'FB3', batch_no: 'FB3', avg_weight: 0.490 },
  { item_name: 'CASTED SINK MIXER BODY, CASPER', cat_no: '380', batch_no: '380', avg_weight: 0.540 },
  { item_name: 'CASTED T/W/M BODY, SELTOS', cat_no: '319', batch_no: '319', avg_weight: 0.905 },
  { item_name: 'CASTED P/C BODY SPIKE', cat_no: '479', batch_no: '479', avg_weight: 0.300 },
  { item_name: 'CASTED SINK MIXTURE, BODY LIGHT', cat_no: '111', batch_no: '111', avg_weight: 0.480 },
  { item_name: 'CASTED C/S/C 1/2" BODY, SELTOS', cat_no: '132', batch_no: '132', avg_weight: 0.340 },
  { item_name: 'CASTED 2 IN 1 A/C BODY (2 KNOB), SPIKE', cat_no: '478', batch_no: '478', avg_weight: 0.430 },
  { item_name: 'CASTED BIB COCK BODY, CASPER', cat_no: '436', batch_no: '436', avg_weight: 0.285 },
  { item_name: 'CASTED P/C BODY ,SELTOS', cat_no: '475', batch_no: '475', avg_weight: 0.504 },
  { item_name: 'CASTED PILLAR COCK BRITNEY', cat_no: '383', batch_no: '383', avg_weight: 0.270 },
  { item_name: 'CASTED BIB COCK SELTOS', cat_no: '416', batch_no: '416', avg_weight: 0.300 },
  { item_name: 'CASTED WALL MIXTURE SPOUT, DELTA', cat_no: '4288', batch_no: '4288', avg_weight: 0.355 },
  { item_name: 'CASTED 2IN1 BIB COCK 2K BODY CASPER', cat_no: '430A', batch_no: '430A', avg_weight: 0.455 },
  { item_name: 'CASTED L/B BODY, SELTOS', cat_no: '470', batch_no: '470', avg_weight: 0.382 },
  { item_name: 'CASTED L/B BODY (HEAVY)', cat_no: '154', batch_no: '154', avg_weight: 1.381 },
  { item_name: 'CASTED LONG BODY, OSCAR', cat_no: '3895', batch_no: '3895', avg_weight: 0.275 },
  { item_name: 'CASTED 3 IN 1 WALL MIXTURE SPOUT, FACIA', cat_no: '78', batch_no: '78', avg_weight: 0.715 },
  { item_name: 'CASTED WALL MIXTURE SPOUT,COMET', cat_no: '4928', batch_no: '4928', avg_weight: 0.420 },
  { item_name: 'CASTED 3IN1 WALL MIXER SPOUT BODY, CASPER', cat_no: '49', batch_no: '49', avg_weight: 0.410 },
  { item_name: 'CASTED WALL MIXTURE SPOUT, FACIA', cat_no: '48', batch_no: '48', avg_weight: 0.540 },
  { item_name: 'CASTED SINGLE LEVER BASIN MIXER, BODY CASPER', cat_no: '05', batch_no: '05', avg_weight: 1.050 },
  { item_name: 'CASTED P/C 1/2" BODY, CASPER', cat_no: '442', batch_no: '442', avg_weight: 0.345 },
  { item_name: 'CASTED WALL MIXER SPOUT BODY, CASPER', cat_no: '3876', batch_no: '3876', avg_weight: 0.340 }
];

// Helper to trigger browser download
export function triggerDownload(content, filename) {
  const safeFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  // Add UTF-8 Byte Order Mark (\uFEFF) so Microsoft Excel opens seamlessly with proper columns
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = safeFilename;
  link.setAttribute('download', safeFilename);
  link.style.display = 'none';
  document.body.appendChild(link);
  
  link.click();
  
  // Delay revocation to ensure Chromium/Chrome download engine completes file handoff with proper .csv extension
  setTimeout(() => {
    if (document.body.contains(link)) {
      document.body.removeChild(link);
    }
    URL.revokeObjectURL(url);
  }, 2000);
}

// 1. Download Pre-filled RM Purchase Template
export function downloadRMPurchaseTemplate(items = null) {
  const list = (items && items.length > 0) ? items : DEFAULT_RAW_MATERIALS;
  const today = new Date().toISOString().slice(0, 10);
  
  const headers = ['Date', 'Invoice No', 'Supplier Name', 'Item Name', 'Quantity', 'Unit', 'Rate'];
  const rows = list.map((rm, idx) => {
    const invNo = `PUR-INV-${String(idx + 1).padStart(3, '0')}`;
    const supplier = rm.supplier || rm.supplier_name || 'Rajesh Metal Foundry';
    const name = (rm.material_name || rm.item_name || 'CHILD PART').toUpperCase();
    const unit = rm.unit_code || rm.unit || 'KG';
    const rate = rm.standard_rate || rm.default_rate || 500.00;
    // Default sample quantity to 100 for easy testing
    const qty = 100;
    return `${today},${invNo},"${supplier}","${name}",${qty},${unit},${Number(rate).toFixed(2)}`;
  });

  const csv = [headers.join(','), ...rows].join('\n');
  triggerDownload(csv, `Bharat_Impex_RM_Purchase_Template_${today}.csv`);
}

// 2. Download Pre-filled FG Sales Template
export function downloadFGSalesTemplate(items = null) {
  const list = (items && items.length > 0) ? items : DEFAULT_FINISHED_GOODS;
  const today = new Date().toISOString().slice(0, 10);
  
  const headers = ['Date', 'Invoice No', 'Customer Name', 'Item Name', 'Quantity', 'Unit', 'Rate'];
  const rows = list.map((fg, idx) => {
    const invNo = `SL-INV-${String(idx + 501).padStart(3, '0')}`;
    const customer = fg.customer || fg.customer_name || 'Modern Bath Fittings Mumbai';
    const name = (fg.product_name || fg.item_name || 'FINISHED GOOD').toUpperCase();
    const unit = fg.unit_code || fg.unit || 'PCS';
    const rate = fg.selling_price || fg.default_rate || 1200.00;
    const qty = 50;
    return `${today},${invNo},"${customer}","${name}",${qty},${unit},${Number(rate).toFixed(2)}`;
  });

  const csv = [headers.join(','), ...rows].join('\n');
  triggerDownload(csv, `Bharat_Impex_FG_Sales_Template_${today}.csv`);
}

// 3. Download Pre-filled SKU Tracking Sheet Pipeline
export function downloadSKUPipelineTemplate(items = null, stages = null) {
  const list = (items && items.length > 0) ? items : DEFAULT_SKU_PIPELINE;
  const today = new Date().toLocaleDateString('en-GB');
  
  let headers = [];
  let buildStageCols = null;

  if (stages && stages.length > 0) {
    const stageColsHeaders = stages.flatMap((s) => {
      const sName = s.full_name || s.process_name || s.name;
      return [`${sName} PRD Date`, `${sName} Prod Qty`, `${sName} Rejection`];
    });

    const initialName = stages[0]?.full_name || stages[0]?.process_name || 'Stage 1';
    headers = [
      `Date of ${initialName}`,
      'Batch No',
      'Cat No',
      'Item Name',
      `Qty Recd ${initialName}`,
      'Average Weight (Kg)',
      ...stageColsHeaders,
      'Ready Stock Qty',
      'Total Rejection',
      'Status'
    ];

    buildStageCols = () => stages.flatMap(() => [today, 100, 0]);
  } else {
    headers = [
      'Date of Casting',
      'Batch No',
      'Cat No',
      'Item Name',
      'Qty Recd from casting',
      'Average Weight (Kg)',
      'Casting Prod Qty',
      'Casting Rejection',
      'Machining PRD Date',
      'Machining Prod Qty',
      'Machining Rejection',
      'LP PRD Date',
      'LP Prod Qty',
      'LP Rejection',
      'CP Date Form',
      'CP Prod Qty',
      'CP Rejection',
      'Assembly Date Form',
      'Assembly Recd Qty',
      'Assembly Dispatch Qty',
      'Ready Stock Qty',
      'Total Rejection',
      'Status'
    ];

    buildStageCols = () => [
      100, 0,
      today, 100, 0,
      today, 100, 0,
      today, 100, 0,
      today, 100, 100
    ];
  }

  const rows = list.map((item, idx) => {
    const batch = item.batch_no || String(300 + idx);
    const cat = item.cat_no || batch;
    const name = item.item_name;
    const avgW = Number(item.avg_weight || 0.35).toFixed(3);
    const qty = 100;
    const stageCols = buildStageCols();

    return [
      today,
      batch,
      cat,
      `"${name}"`,
      qty,
      avgW,
      ...stageCols,
      qty,
      0,
      'Ready'
    ].join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');
  triggerDownload(csv, `Bharat_Impex_SKU_Tracking_Pipeline_Template.csv`);
}

// 4. Download Combined Master Catalog (All RM + All FG)
export function downloadMasterCatalog(rms = null, fgs = null) {
  const rmList = (rms && rms.length > 0) ? rms : DEFAULT_RAW_MATERIALS;
  const fgList = (fgs && fgs.length > 0) ? fgs : DEFAULT_FINISHED_GOODS;
  const today = new Date().toISOString().slice(0, 10);

  const headers = ['Type', 'Code', 'Item Name', 'Unit', 'Standard Rate / Price', 'Category'];
  
  const rmRows = rmList.map(rm => 
    `CHILD PART,${rm.code || rm.rm_code},"${rm.material_name || rm.item_name}",${rm.unit_code || rm.unit},${rm.standard_rate || rm.default_rate || 0},"Metals / Valves / Hardware"`
  );

  const fgRows = fgList.map(fg => 
    `FINISHED GOOD,${fg.code || fg.fg_code},"${fg.product_name || fg.item_name}",${fg.unit_code || fg.unit},${fg.selling_price || fg.default_rate || 0},"Faucets & Sanitary Ware"`
  );

  const csv = [headers.join(','), ...rmRows, ...fgRows].join('\n');
  triggerDownload(csv, `Bharat_Impex_Master_RM_and_FG_Catalog_${today}.csv`);
}

// 5. Download Bulk Stock Setup & Initialization Template (with Min/Max Levels & Auto-ID support)
export function downloadBulkStockTemplate(rms = null, fgs = null) {
  const rmList = (rms && rms.length > 0) ? rms : DEFAULT_RAW_MATERIALS;
  const fgList = (fgs && fgs.length > 0) ? fgs : DEFAULT_FINISHED_GOODS;
  const today = new Date().toISOString().slice(0, 10);

  const escapeCsv = (str) => `"${String(str ?? '').replace(/"/g, '""')}"`;

  const headers = [
    'ID',
    'Type',
    'Code',
    'Item Name',
    'Current Stock Quantity',
    'Unit',
    'Rate',
    'Min Level (Reorder)',
    'Max Level (Max Stock)',
    'Category'
  ];

  // Existing Child Parts
  const rmRows = rmList.map((rm, idx) => {
    const id = rm.id || (idx + 1);
    const code = rm.code || rm.rm_code || `RM-${String(idx + 1).padStart(6, '0')}`;
    const name = escapeCsv(rm.material_name || rm.item_name);
    const qty = rm.current_stock || 0;
    const unit = rm.unit_code || rm.unit || 'PCS';
    const rate = rm.standard_rate || rm.default_rate || 500;
    const minLevel = rm.reorder_level || rm.minimum_stock || 100;
    const maxLevel = rm.maximum_stock || (minLevel * 3) || 500;
    const cat = escapeCsv(rm.category_name || rm.category || 'Child Part');
    return `${id},RM,${code},${name},${qty},${unit},${Number(rate).toFixed(2)},${minLevel},${maxLevel},${cat}`;
  });

  // Existing Finished Goods
  const fgRows = fgList.map((fg, idx) => {
    const id = fg.id || (idx + 1);
    const code = fg.code || fg.fg_code || `FG-${String(idx + 1).padStart(6, '0')}`;
    const name = escapeCsv(fg.product_name || fg.item_name);
    const qty = fg.current_stock || 0;
    const unit = fg.unit_code || fg.unit || 'PCS';
    const rate = fg.selling_price || fg.default_rate || 1200;
    const minLevel = fg.reorder_level || fg.minimum_stock || 50;
    const maxLevel = fg.maximum_stock || (minLevel * 3) || 250;
    const cat = escapeCsv(fg.category_name || fg.category || 'Finished Good');
    return `${id},FG,${code},${name},${qty},${unit},${Number(rate).toFixed(2)},${minLevel},${maxLevel},${cat}`;
  });

  // Sample blank-ID rows for new items
  const sampleNewRows = [
    `,RM,,SAMPLE NEW BRASS COMPONENT,200,PCS,450.00,100,500,"Child Part"`,
    `,FG,,SAMPLE NEW FAUCET MODEL,80,PCS,1100.00,50,300,"Finished Good"`
  ];

  const csv = [headers.join(','), ...rmRows, ...fgRows, ...sampleNewRows].join('\n');
  triggerDownload(csv, `Bharat_Impex_Bulk_Stock_Setup_Format_${today}.csv`);
}

// 6. Download Child Part Master CSV Template / Export
export function downloadRawMaterialTemplate(rms = null) {
  const rmList = (rms && rms.length > 0) ? rms : DEFAULT_RAW_MATERIALS;
  const today = new Date().toISOString().slice(0, 10);
  const escapeCsv = (str) => `"${String(str ?? '').replace(/"/g, '""')}"`;

  const headers = [
    'Code',
    'Child Part Name',
    'Category',
    'Unit',
    'Standard Rate',
    'Min Level (Reorder)',
    'Max Level (Max Stock)',
    'Description'
  ];

  const rows = rmList.map((rm, idx) => {
    const code = rm.rm_code || rm.code || `RM-${String(idx + 1).padStart(6, '0')}`;
    const name = escapeCsv(rm.material_name || rm.item_name);
    const cat = escapeCsv(rm.category_name || rm.category || 'Metals & Brass Alloys');
    const unit = rm.unit_code || rm.unit || 'KG';
    const rate = rm.standard_rate || 500;
    const minLevel = rm.reorder_level || rm.minimum_stock || 100;
    const maxLevel = rm.maximum_stock || 500;
    const desc = escapeCsv(rm.description || '');
    return `${code},${name},${cat},${unit},${Number(rate).toFixed(2)},${minLevel},${maxLevel},${desc}`;
  });

  const sampleRows = [
    `RM-NEW001,"BRASS FORGING ROD 32MM","Metals & Brass Alloys",KG,580.00,200,800,"High tensile brass rod"`,
    `RM-NEW002,"EPDM RUBBER GASKET 1/2 INCH","Fasteners & Seals",PCS,4.50,500,2000,"Heat resistant O-ring"`
  ];

  const csv = [headers.join(','), ...rows, ...sampleRows].join('\n');
  triggerDownload(csv, `Bharat_Impex_Child_Parts_Master_${today}.csv`);
}

// 7. Download Finished Goods Master CSV Template / Export
export function downloadFinishedGoodsTemplate(fgs = null) {
  const fgList = (fgs && fgs.length > 0) ? fgs : DEFAULT_FINISHED_GOODS;
  const today = new Date().toISOString().slice(0, 10);
  const escapeCsv = (str) => `"${String(str ?? '').replace(/"/g, '""')}"`;

  const headers = [
    'SKU Code',
    'Product Name',
    'Category',
    'Unit',
    'Selling Price',
    'Min Level (Reorder)',
    'Max Level (Max Stock)',
    'Description'
  ];

  const rows = fgList.map((fg, idx) => {
    const code = fg.fg_code || fg.code || `FG-${String(idx + 1).padStart(6, '0')}`;
    const name = escapeCsv(fg.product_name || fg.item_name);
    const cat = escapeCsv(fg.category_name || fg.category || 'Faucets & Sanitary Ware');
    const unit = fg.unit_code || fg.unit || 'PCS';
    const rate = fg.selling_price || 1200;
    const minLevel = fg.reorder_level || fg.minimum_stock || 50;
    const maxLevel = fg.maximum_stock || 300;
    const desc = escapeCsv(fg.description || '');
    return `${code},${name},${cat},${unit},${Number(rate).toFixed(2)},${minLevel},${maxLevel},${desc}`;
  });

  const sampleRows = [
    `FG-NEW001,"CONCEALED BASIN MIXER ROSE GOLD","Premium Basin Taps",PCS,3200.00,30,150,"Luxury series single lever"`,
    `FG-NEW002,"WALL HUNG DIVERTER 40MM HI-FLOW","Diverters",PCS,2850.00,40,200,"Dual flow ceramic cartridge"`
  ];

  const csv = [headers.join(','), ...rows, ...sampleRows].join('\n');
  triggerDownload(csv, `Bharat_Impex_Finished_Goods_Master_${today}.csv`);
}

// 8. Download Sub-SKU & OEM Brand Mapping Template / Export
export function downloadSubSKUTemplate(subSkusList = null, fgList = []) {
  const today = new Date().toISOString().slice(0, 10);
  const escapeCsv = (str) => `"${String(str ?? '').replace(/"/g, '""')}"`;

  const headers = [
    'Parent SKU Code',
    'Parent Product Name',
    'Brand Name (OEM)',
    'Sub-SKU Code',
    'Billed Product Name (Sub-SKU)',
    'Client Selling Price',
    'Description'
  ];

  const rows = (subSkusList || []).map((s) => {
    const parentCode = s.parent_fg_code || 'FG-000001';
    const parentName = escapeCsv(s.parent_product_name || '');
    const brand = escapeCsv(s.brand_name || 'Somany');
    const code = s.sub_sku_code || 'SOM-TAP-01';
    const name = escapeCsv(s.sub_sku_name || '');
    const price = Number(s.selling_price || 0).toFixed(2);
    const desc = escapeCsv(s.description || '');
    return `${parentCode},${parentName},${brand},${code},${name},${price},${desc}`;
  });

  const sampleRows = [
    `FG-000001,"Brass Basin Tap Model A - Chrome","Somany",SOM-TAP-01,"Somany Brass Basin Tap Model A",1350.00,"OEM for Somany"`,
    `FG-000001,"Brass Basin Tap Model A - Chrome","Prince Pipe",PP-TAP-01,"Prince Pipe Chrome Basin Tap",1300.00,"Private label for Prince Pipe"`,
    `FG-000001,"Brass Basin Tap Model A - Chrome","Zen Bath Fittings",ZEN-TAP-01,"Zen Bath Elegance Basin Tap",1280.00,"OEM for Zen Bath Fittings"`
  ];

  const contentRows = rows.length > 0 ? rows : sampleRows;
  const csv = [headers.join(','), ...contentRows].join('\n');
  triggerDownload(csv, `Bharat_Impex_Sub_SKU_Brand_Mappings_${today}.csv`);
}



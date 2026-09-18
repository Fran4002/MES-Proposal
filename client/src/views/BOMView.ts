import { api } from '../services/api.ts';
import type {
  BOM,
  InventoryItem,
  WorkCenter,
  BOMComponent,
  BOMSecondaryOutput,
} from '../types.ts';
import { Modal } from '../components/Modal.ts';
import { Toast } from '../components/Toast.ts';

export async function renderBOMView(container: HTMLElement) {
  let boms: BOM[] = [];
  let inventoryItems: InventoryItem[] = [];
  let workCenters: WorkCenter[] = [];
  let currentStatus = 'ALL';
  let currentSearch = '';
  let selectedBOMId: string | null = null;

  container.innerHTML = `
    <div class="view-header">
      <div>
        <h2 class="view-title">Bill of Materials (BOM) & Recipes</h2>
        <p class="view-subtitle">Manage production recipes, multi-output co-products/by-products, and consumed input components.</p>
      </div>
      <div class="header-actions">
        <button id="btn-add-bom" class="btn btn-primary">
          <span class="btn-icon">+</span> Create New BOM
        </button>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="toolbar">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input type="text" id="bom-search" placeholder="Search by BOM code, recipe name, or item..." />
      </div>
      <div class="filter-group">
        <label for="filter-bom-status">Status:</label>
        <select id="filter-bom-status" class="form-select">
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="DRAFT">Draft</option>
          <option value="OBSOLETE">Obsolete</option>
        </select>
      </div>
    </div>

    <!-- Main BOM Grid / Layout -->
    <div class="bom-layout">
      <!-- Left / Top: BOM List -->
      <div class="bom-list-column">
        <div class="table-card">
          <div class="table-responsive">
            <table class="data-table" id="bom-table">
              <thead>
                <tr>
                  <th>BOM Code</th>
                  <th>Name & Version</th>
                  <th>Primary Output</th>
                  <th>Co/By-Products</th>
                  <th>Inputs</th>
                  <th>Work Center</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="bom-tbody">
                <tr>
                  <td colspan="8" class="text-center py-4">Loading Bill of Materials...</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Detail / Tree Inspector Drawer -->
      <div class="bom-detail-panel" id="bom-detail-panel">
        <div class="detail-placeholder">
          <div class="placeholder-icon">📑</div>
          <h4>Select a BOM to inspect recipe breakdown</h4>
          <p class="text-muted text-sm">View full product outputs, input line items, scrap rates, and material cost roll-up.</p>
        </div>
      </div>
    </div>
  `;

  // Load all necessary references and BOMs
  async function loadInitialData() {
    try {
      const [invRes, wcRes] = await Promise.all([
        api.getInventory({ status: 'ACTIVE' }),
        api.getWorkCenters(),
      ]);
      inventoryItems = invRes.data || [];
      workCenters = wcRes.data || [];
      await loadBOMs();
    } catch (err: unknown) {
      console.error('Error loading base data:', err);
    }
  }

  async function loadBOMs() {
    try {
      const res = await api.getBOMs({
        status: currentStatus,
        search: currentSearch,
      });
      boms = res.data || [];
      renderTable();
      if (selectedBOMId) {
        const active = boms.find((b) => b._id === selectedBOMId);
        if (active) renderDetailPanel(active);
        else selectedBOMId = null;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error loading BOMs';
      Toast.error(msg);
      document.getElementById('bom-tbody')!.innerHTML = `
        <tr>
          <td colspan="8" class="text-center text-error py-4">Failed to load BOMs: ${msg}</td>
        </tr>
      `;
    }
  }

  function renderTable() {
    const tbody = document.getElementById('bom-tbody')!;
    if (boms.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center py-6 empty-state">
            <p>No Bill of Materials found.</p>
            <button class="btn btn-sm btn-outline mt-2" id="empty-clear-bom-filters">Reset Filters</button>
          </td>
        </tr>
      `;
      document.getElementById('empty-clear-bom-filters')?.addEventListener('click', () => {
        (document.getElementById('bom-search') as HTMLInputElement).value = '';
        (document.getElementById('filter-bom-status') as HTMLSelectElement).value = 'ALL';
        currentSearch = '';
        currentStatus = 'ALL';
        loadBOMs();
      });
      return;
    }

    tbody.innerHTML = boms
      .map((bom) => {
        const prodItem = typeof bom.primaryProduct?.item === 'object' ? bom.primaryProduct.item : null;
        const prodName = prodItem ? prodItem.name : 'Unknown Product';
        const prodCode = prodItem ? prodItem.itemCode : '-';
        const prodQty = bom.primaryProduct?.quantity || 1;
        const prodUom = bom.primaryProduct?.unitOfMeasure || 'pcs';

        const secondaryCount = bom.secondaryOutputs?.length || 0;
        const componentsCount = bom.components?.length || 0;

        const wc = typeof bom.preferredWorkCenter === 'object' ? bom.preferredWorkCenter : null;
        const isSelected = bom._id === selectedBOMId;

        return `
          <tr class="clickable-row ${isSelected ? 'row-selected' : ''}" data-id="${bom._id}">
            <td class="font-mono font-bold text-primary">${escapeHtml(bom.bomCode)}</td>
            <td>
              <div class="font-semibold">${escapeHtml(bom.name)}</div>
              <div class="text-muted text-xs">Rev: <span class="font-mono font-bold">${escapeHtml(bom.version)}</span></div>
            </td>
            <td>
              <div class="output-prod-tag font-semibold">${escapeHtml(prodName)}</div>
              <div class="font-mono text-xs text-muted"><code>${escapeHtml(prodCode)}</code> (${prodQty} ${escapeHtml(prodUom)})</div>
            </td>
            <td>
              ${
                secondaryCount > 0
                  ? `<span class="badge badge-byproduct font-bold" title="${secondaryCount} Co/By-Product(s) Produced">+${secondaryCount} Co/By-Prod</span>`
                  : `<span class="text-muted text-xs">None (Single)</span>`
              }
            </td>
            <td>
              <span class="badge badge-secondary">${componentsCount} parts</span>
            </td>
            <td>
              ${
                wc
                  ? `<span class="wc-pill">⚙️ ${escapeHtml(wc.code)}</span>`
                  : `<span class="text-muted text-xs">Unassigned</span>`
              }
            </td>
            <td>
              <span class="badge ${bom.status === 'ACTIVE' ? 'badge-success' : bom.status === 'DRAFT' ? 'badge-warning' : 'badge-danger'}">
                ${bom.status}
              </span>
            </td>
            <td>
              <div class="action-buttons">
                <button class="btn-icon-action btn-inspect-bom" title="Inspect Recipe Tree" data-id="${bom._id}">🔍</button>
                <button class="btn-icon-action btn-edit-bom" title="Edit BOM" data-id="${bom._id}">✏️</button>
                <button class="btn-icon-action btn-delete-bom" title="Delete BOM" data-id="${bom._id}">🗑️</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join('');

    // Attach row selection for detail panel
    tbody.querySelectorAll('.clickable-row').forEach((row) => {
      row.addEventListener('click', (e) => {
        // Prevent trigger if clicking edit/delete buttons
        if ((e.target as HTMLElement).closest('.action-buttons')) return;
        const id = (row as HTMLElement).dataset.id!;
        selectedBOMId = id;
        renderTable();
        const active = boms.find((b) => b._id === id);
        if (active) renderDetailPanel(active);
      });
    });

    tbody.querySelectorAll('.btn-inspect-bom').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = (e.currentTarget as HTMLElement).dataset.id!;
        selectedBOMId = id;
        renderTable();
        const active = boms.find((b) => b._id === id);
        if (active) renderDetailPanel(active);
      });
    });

    tbody.querySelectorAll('.btn-edit-bom').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = (e.currentTarget as HTMLElement).dataset.id!;
        const bom = boms.find((b) => b._id === id);
        if (bom) openBOMModal(bom);
      });
    });

    tbody.querySelectorAll('.btn-delete-bom').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = (e.currentTarget as HTMLElement).dataset.id!;
        const bom = boms.find((b) => b._id === id);
        if (bom) openDeleteModal(bom);
      });
    });
  }

  // Render Recipe Breakdown / Cost Roll-Up in the Detail Panel
  function renderDetailPanel(bom: BOM) {
    const panel = document.getElementById('bom-detail-panel')!;
    const prodItem = typeof bom.primaryProduct?.item === 'object' ? bom.primaryProduct.item : null;
    const wc = typeof bom.preferredWorkCenter === 'object' ? bom.preferredWorkCenter : null;

    // Calculate total rolled-up material cost
    let totalMaterialCost = 0;
    const componentRows = (bom.components || []).map((comp) => {
      const item = typeof comp.item === 'object' ? comp.item : null;
      const unitCost = item?.unitCost || 0;
      const effectiveQty = comp.quantity * (1 + (comp.scrapFactor || 0) / 100);
      const rowCost = effectiveQty * unitCost;
      totalMaterialCost += rowCost;

      return `
        <tr>
          <td>
            <div class="font-semibold">${escapeHtml(item?.name || 'Unknown')}</div>
            <div class="text-muted text-xs font-mono"><code>${escapeHtml(item?.itemCode || '-')}</code> (${item?.category || 'ITEM'})</div>
          </td>
          <td class="text-right font-mono">${comp.quantity} ${escapeHtml(comp.unitOfMeasure || 'pcs')}</td>
          <td class="text-right font-mono text-warning">${comp.scrapFactor ? `+${comp.scrapFactor}%` : '0%'}</td>
          <td class="text-right font-mono">$${unitCost.toFixed(2)}</td>
          <td class="text-right font-mono font-bold">$${rowCost.toFixed(2)}</td>
        </tr>
      `;
    });

    panel.innerHTML = `
      <div class="detail-card">
        <div class="detail-header">
          <div>
            <div class="detail-badge">${bom.status} • Rev ${escapeHtml(bom.version)}</div>
            <h3 class="detail-title">${escapeHtml(bom.name)}</h3>
            <span class="font-mono text-sm text-primary">BOM Code: ${escapeHtml(bom.bomCode)}</span>
          </div>
          <button class="btn btn-sm btn-outline" id="btn-quick-edit">Edit Recipe</button>
        </div>

        ${bom.description ? `<p class="detail-desc text-muted">${escapeHtml(bom.description)}</p>` : ''}

        <!-- Outputs Section (Primary + Co/By-Products) -->
        <div class="detail-section">
          <h4 class="section-subtitle">
            <span>📦 Produced Materials (Outputs)</span>
            <span class="badge ${bom.secondaryOutputs?.length ? 'badge-byproduct' : 'badge-secondary'}">
              ${1 + (bom.secondaryOutputs?.length || 0)} Total Outputs
            </span>
          </h4>
          
          <div class="outputs-list">
            <!-- Primary Product Card -->
            <div class="output-item primary">
              <div class="output-type-tag primary">★ Primary Product</div>
              <div class="output-item-info">
                <strong>${escapeHtml(prodItem?.name || 'Primary Product')}</strong>
                <span class="font-mono text-xs"><code>${escapeHtml(prodItem?.itemCode || '-')}</code></span>
              </div>
              <div class="output-qty font-mono font-bold">
                ${bom.primaryProduct?.quantity || 1} ${escapeHtml(bom.primaryProduct?.unitOfMeasure || 'pcs')}
              </div>
            </div>

            <!-- Co-Products & By-Products -->
            ${(bom.secondaryOutputs || [])
              .map((sec) => {
                const item = typeof sec.item === 'object' ? sec.item : null;
                const isCo = sec.type === 'CO_PRODUCT';
                return `
                  <div class="output-item ${isCo ? 'coproduct' : 'byproduct'}">
                    <div class="output-type-tag ${isCo ? 'coproduct' : 'byproduct'}">
                      ${isCo ? '✦ Co-Product' : '♻ By-Product'}
                    </div>
                    <div class="output-item-info">
                      <strong>${escapeHtml(item?.name || 'Item')}</strong>
                      <span class="font-mono text-xs"><code>${escapeHtml(item?.itemCode || '-')}</code></span>
                      ${sec.notes ? `<span class="text-xs text-muted">(${escapeHtml(sec.notes)})</span>` : ''}
                    </div>
                    <div class="output-qty font-mono font-bold">
                      ${sec.quantity} ${escapeHtml(sec.unitOfMeasure || 'pcs')}
                    </div>
                  </div>
                `;
              })
              .join('')}
          </div>
        </div>

        <!-- Consumed Inputs (Components) Table -->
        <div class="detail-section">
          <h4 class="section-subtitle">
            <span>📥 Consumed Materials (Inputs)</span>
            <span class="text-sm font-mono font-bold text-success">Total Material Cost: $${totalMaterialCost.toFixed(2)}</span>
          </h4>
          
          <div class="table-responsive">
            <table class="data-table small-table">
              <thead>
                <tr>
                  <th>Component / Part</th>
                  <th class="text-right">Qty</th>
                  <th class="text-right">Scrap %</th>
                  <th class="text-right">Unit Price</th>
                  <th class="text-right">Extended Cost</th>
                </tr>
              </thead>
              <tbody>
                ${componentRows.join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Production Metadata -->
        <div class="detail-meta-grid">
          <div class="meta-box">
            <span class="meta-label">Designated Work Center</span>
            <span class="meta-val">${wc ? `⚙️ ${escapeHtml(wc.code)} (${escapeHtml(wc.name)})` : 'None / Flexible'}</span>
          </div>
          <div class="meta-box">
            <span class="meta-label">Est. Material Roll-Up</span>
            <span class="meta-val font-bold text-success">$${totalMaterialCost.toFixed(2)} / unit</span>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-quick-edit')?.addEventListener('click', () => {
      openBOMModal(bom);
    });
  }

  // BOM Create / Edit Modal with dynamic component and secondary output builders
  function openBOMModal(bom?: BOM) {
    const isEdit = Boolean(bom);
    const title = isEdit ? `Edit BOM: ${bom?.bomCode}` : 'Create New Bill of Materials (BOM)';

    // Initial secondary outputs and components state
    let formComponents: BOMComponent[] = bom?.components ? JSON.parse(JSON.stringify(bom.components)) : [];
    let formSecondaryOutputs: BOMSecondaryOutput[] = bom?.secondaryOutputs ? JSON.parse(JSON.stringify(bom.secondaryOutputs)) : [];

    // If creating, add 1 empty component by default
    if (!isEdit && formComponents.length === 0) {
      formComponents.push({
        item: inventoryItems[0]?._id || '',
        quantity: 1,
        unitOfMeasure: inventoryItems[0]?.unitOfMeasure || 'pcs',
        scrapFactor: 0,
        notes: '',
      });
    }

    const selectedPrimaryItemId =
      typeof bom?.primaryProduct?.item === 'object'
        ? bom.primaryProduct.item._id
        : bom?.primaryProduct?.item || inventoryItems[0]?._id;

    const modalBody = `
      <form id="bom-edit-form">
        <!-- Top Section: Core Metadata -->
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label" for="form-bomCode">BOM Code *</label>
            <input type="text" id="form-bomCode" class="form-control" required value="${bom ? escapeHtml(bom.bomCode) : ''}" placeholder="e.g. BOM-DRONE-01" ${isEdit ? 'readonly' : ''} />
          </div>

          <div class="form-group">
            <label class="form-label" for="form-bomName">Recipe / Assembly Name *</label>
            <input type="text" id="form-bomName" class="form-control" required value="${bom ? escapeHtml(bom.name) : ''}" placeholder="e.g. Quadcopter Drone Final Assembly" />
          </div>

          <div class="form-group">
            <label class="form-label" for="form-bomVersion">Revision / Version</label>
            <input type="text" id="form-bomVersion" class="form-control" value="${bom ? escapeHtml(bom.version) : '1.0'}" placeholder="1.0" />
          </div>

          <div class="form-group">
            <label class="form-label" for="form-bomStatus">Status</label>
            <select id="form-bomStatus" class="form-select">
              <option value="ACTIVE" ${bom?.status === 'ACTIVE' || !bom ? 'selected' : ''}>Active</option>
              <option value="DRAFT" ${bom?.status === 'DRAFT' ? 'selected' : ''}>Draft</option>
              <option value="OBSOLETE" ${bom?.status === 'OBSOLETE' ? 'selected' : ''}>Obsolete</option>
            </select>
          </div>

          <div class="form-group full-width">
            <label class="form-label" for="form-bomDesc">Description & Engineering Notes</label>
            <textarea id="form-bomDesc" class="form-control" rows="2" placeholder="Manufacturing routing instructions, specs...">${bom?.description ? escapeHtml(bom.description) : ''}</textarea>
          </div>
        </div>

        <!-- Section 1: Primary Output Product -->
        <div class="builder-box mt-4">
          <div class="builder-header">
            <h4>1. Primary Output (Finished Good or Subassembly)</h4>
            <span class="text-xs text-muted">The main item produced by this BOM</span>
          </div>
          <div class="form-grid">
            <div class="form-group full-width">
              <label class="form-label" for="form-primaryItem">Select Produced Item *</label>
              <select id="form-primaryItem" class="form-select" required>
                ${inventoryItems
                  .map((item) => {
                    const selected = item._id === selectedPrimaryItemId ? 'selected' : '';
                    return `<option value="${item._id}" data-uom="${escapeHtml(item.unitOfMeasure)}" ${selected}>${escapeHtml(item.itemCode)} — ${escapeHtml(item.name)} (${item.category})</option>`;
                  })
                  .join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="form-primaryQty">Batch Yield Quantity *</label>
              <input type="number" step="any" min="0.0001" id="form-primaryQty" class="form-control" value="${bom?.primaryProduct?.quantity || 1}" />
            </div>
            <div class="form-group">
              <label class="form-label" for="form-primaryUom">Unit of Measure</label>
              <input type="text" id="form-primaryUom" class="form-control" value="${bom?.primaryProduct?.unitOfMeasure || inventoryItems[0]?.unitOfMeasure || 'pcs'}" />
            </div>
          </div>
        </div>

        <!-- Section 2: Secondary Outputs (Co-Products & By-Products) -->
        <div class="builder-box mt-4">
          <div class="builder-header">
            <div>
              <h4>2. Secondary Outputs (Co-Products & By-Products)</h4>
              <p class="text-xs text-muted">Define additional materials produced concurrently (e.g., recyclable metal scrap, chemical co-products, or secondary fuels).</p>
            </div>
            <button type="button" id="btn-add-secondary-output" class="btn btn-sm btn-outline">+ Add Output</button>
          </div>
          <div id="secondary-outputs-container" class="builder-rows-container">
            <!-- Dynamic Secondary Output Rows Inserted Here -->
          </div>
        </div>

        <!-- Section 3: Consumed Components (Inputs) -->
        <div class="builder-box mt-4">
          <div class="builder-header">
            <div>
              <h4>3. Consumed Materials (Inputs / Components) *</h4>
              <p class="text-xs text-muted">List all raw materials, sub-assemblies, and hardware required to produce the above outputs.</p>
            </div>
            <button type="button" id="btn-add-component-row" class="btn btn-sm btn-outline">+ Add Component</button>
          </div>
          <div id="components-container" class="builder-rows-container">
            <!-- Dynamic Component Rows Inserted Here -->
          </div>
        </div>

        <!-- Section 4: Routing & Work Center -->
        <div class="builder-box mt-4">
          <div class="builder-header">
            <h4>4. Operational Routing</h4>
          </div>
          <div class="form-group full-width">
            <label class="form-label" for="form-preferredWc">Preferred Work Center</label>
            <select id="form-preferredWc" class="form-select">
              <option value="">-- None / General Station --</option>
              ${workCenters
                .map((wc) => {
                  const preferredId =
                    typeof bom?.preferredWorkCenter === 'object'
                      ? bom.preferredWorkCenter?._id
                      : bom?.preferredWorkCenter;
                  const selected = wc._id === preferredId ? 'selected' : '';
                  return `<option value="${wc._id}" ${selected}>${escapeHtml(wc.code)} — ${escapeHtml(wc.name)} (${wc.department} - $${wc.hourlyRate}/hr)</option>`;
                })
                .join('')}
            </select>
          </div>
        </div>
      </form>
    `;

    const modalEl = Modal.open({
      title,
      bodyHtml: modalBody,
      size: 'xl',
      confirmText: isEdit ? 'Save BOM' : 'Create BOM',
      onConfirm: async () => {
        // Validation and payload assembly
        const bomCode = (document.getElementById('form-bomCode') as HTMLInputElement).value.trim().toUpperCase();
        const name = (document.getElementById('form-bomName') as HTMLInputElement).value.trim();
        const version = (document.getElementById('form-bomVersion') as HTMLInputElement).value.trim() || '1.0';
        const status = (document.getElementById('form-bomStatus') as HTMLSelectElement).value;
        const description = (document.getElementById('form-bomDesc') as HTMLTextAreaElement).value.trim();
        const primaryItem = (document.getElementById('form-primaryItem') as HTMLSelectElement).value;
        const primaryQty = parseFloat((document.getElementById('form-primaryQty') as HTMLInputElement).value) || 1;
        const primaryUom = (document.getElementById('form-primaryUom') as HTMLInputElement).value.trim() || 'pcs';
        const preferredWorkCenter = (document.getElementById('form-preferredWc') as HTMLSelectElement).value || null;

        if (!bomCode || !name) {
          Toast.error('Please specify BOM Code and Name.');
          return false;
        }

        if (!primaryItem) {
          Toast.error('Please choose a primary produced item.');
          return false;
        }

        // Collect Secondary Outputs
        const secondaryRows = document.querySelectorAll('.secondary-output-row');
        const secondaryOutputsPayload: Array<{
          item: string;
          type: 'CO_PRODUCT' | 'BY_PRODUCT';
          quantity: number;
          unitOfMeasure: string;
          costAllocationPercent: number;
          notes: string;
        }> = [];

        secondaryRows.forEach((row) => {
          const itemSelect = row.querySelector('.sec-item-select') as HTMLSelectElement;
          const typeSelect = row.querySelector('.sec-type-select') as HTMLSelectElement;
          const qtyInput = row.querySelector('.sec-qty-input') as HTMLInputElement;
          const uomInput = row.querySelector('.sec-uom-input') as HTMLInputElement;
          const costAllocInput = row.querySelector('.sec-cost-input') as HTMLInputElement;
          const notesInput = row.querySelector('.sec-notes-input') as HTMLInputElement;

          if (itemSelect && itemSelect.value) {
            secondaryOutputsPayload.push({
              item: itemSelect.value,
              type: typeSelect.value as 'CO_PRODUCT' | 'BY_PRODUCT',
              quantity: parseFloat(qtyInput.value) || 1,
              unitOfMeasure: uomInput.value.trim() || 'pcs',
              costAllocationPercent: parseFloat(costAllocInput.value) || 0,
              notes: notesInput.value.trim(),
            });
          }
        });

        // Collect Components
        const compRows = document.querySelectorAll('.component-row');
        const componentsPayload: Array<{
          item: string;
          quantity: number;
          unitOfMeasure: string;
          scrapFactor: number;
          notes: string;
        }> = [];

        compRows.forEach((row) => {
          const itemSelect = row.querySelector('.comp-item-select') as HTMLSelectElement;
          const qtyInput = row.querySelector('.comp-qty-input') as HTMLInputElement;
          const uomInput = row.querySelector('.comp-uom-input') as HTMLInputElement;
          const scrapInput = row.querySelector('.comp-scrap-input') as HTMLInputElement;
          const notesInput = row.querySelector('.comp-notes-input') as HTMLInputElement;

          if (itemSelect && itemSelect.value) {
            componentsPayload.push({
              item: itemSelect.value,
              quantity: parseFloat(qtyInput.value) || 1,
              unitOfMeasure: uomInput.value.trim() || 'pcs',
              scrapFactor: parseFloat(scrapInput.value) || 0,
              notes: notesInput.value.trim(),
            });
          }
        });

        if (componentsPayload.length === 0) {
          Toast.error('At least one consumed component is required in the BOM.');
          return false;
        }

        const payload: Partial<BOM> = {
          bomCode,
          name,
          version,
          status: status as 'DRAFT' | 'ACTIVE' | 'OBSOLETE',
          description,
          primaryProduct: {
            item: primaryItem,
            quantity: primaryQty,
            unitOfMeasure: primaryUom,
          },
          secondaryOutputs: secondaryOutputsPayload,
          components: componentsPayload,
          preferredWorkCenter,
        };

        try {
          if (isEdit && bom) {
            await api.updateBOM(bom._id, payload);
            Toast.success(`BOM "${bomCode}" updated successfully.`);
          } else {
            await api.createBOM(payload);
            Toast.success(`BOM "${bomCode}" created successfully.`);
          }
          await loadBOMs();
          return true;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Failed to save BOM';
          Toast.error(msg);
          return false;
        }
      },
    });

    // Auto update UOM on primary item change
    const primaryItemSelect = modalEl.querySelector('#form-primaryItem') as HTMLSelectElement;
    primaryItemSelect?.addEventListener('change', () => {
      const selectedOption = primaryItemSelect.options[primaryItemSelect.selectedIndex];
      const uom = selectedOption?.dataset.uom;
      if (uom) {
        (modalEl.querySelector('#form-primaryUom') as HTMLInputElement).value = uom;
      }
    });

    // Dynamic Secondary Outputs Renderer
    const secContainer = modalEl.querySelector('#secondary-outputs-container')!;
    function renderSecondaryOutputsRows() {
      if (formSecondaryOutputs.length === 0) {
        secContainer.innerHTML = `
          <div class="empty-builder-notice">
            No secondary outputs configured (Single-product output). Click "+ Add Output" above to add Co-Products or By-Products.
          </div>
        `;
        return;
      }

      secContainer.innerHTML = formSecondaryOutputs
        .map((sec, idx) => {
          const selectedItemId = typeof sec.item === 'object' ? sec.item._id : sec.item;
          return `
            <div class="builder-row secondary-output-row" data-idx="${idx}">
              <div class="row-field flex-2">
                <label class="row-label">Output Item</label>
                <select class="form-select sec-item-select" required>
                  ${inventoryItems
                    .map((item) => {
                      const sel = item._id === selectedItemId ? 'selected' : '';
                      return `<option value="${item._id}" data-uom="${escapeHtml(item.unitOfMeasure)}" ${sel}>${escapeHtml(item.itemCode)} — ${escapeHtml(item.name)}</option>`;
                    })
                    .join('')}
                </select>
              </div>

              <div class="row-field flex-1">
                <label class="row-label">Output Type</label>
                <select class="form-select sec-type-select">
                  <option value="BY_PRODUCT" ${sec.type === 'BY_PRODUCT' ? 'selected' : ''}>By-Product (e.g. Swarf/Scrap)</option>
                  <option value="CO_PRODUCT" ${sec.type === 'CO_PRODUCT' ? 'selected' : ''}>Co-Product (Joint Value)</option>
                </select>
              </div>

              <div class="row-field flex-1">
                <label class="row-label">Yield Qty</label>
                <input type="number" step="any" min="0.0001" class="form-control sec-qty-input" value="${sec.quantity || 1}" />
              </div>

              <div class="row-field flex-1">
                <label class="row-label">UOM</label>
                <input type="text" class="form-control sec-uom-input" value="${sec.unitOfMeasure || 'pcs'}" />
              </div>

              <div class="row-field flex-1">
                <label class="row-label">Cost Alloc %</label>
                <input type="number" step="1" min="0" max="100" class="form-control sec-cost-input" value="${sec.costAllocationPercent || 0}" />
              </div>

              <div class="row-field flex-2">
                <label class="row-label">Notes</label>
                <input type="text" class="form-control sec-notes-input" placeholder="Origin, recovery bin..." value="${escapeHtml(sec.notes || '')}" />
              </div>

              <div class="row-actions">
                <button type="button" class="btn-remove-row btn-remove-sec" title="Remove Output" data-idx="${idx}">✕</button>
              </div>
            </div>
          `;
        })
        .join('');

      // Wire remove buttons
      secContainer.querySelectorAll('.btn-remove-sec').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const idx = parseInt((e.currentTarget as HTMLElement).dataset.idx!, 10);
          formSecondaryOutputs.splice(idx, 1);
          renderSecondaryOutputsRows();
        });
      });

      // Wire item select UOM auto-fill
      secContainer.querySelectorAll('.sec-item-select').forEach((select) => {
        select.addEventListener('change', (e) => {
          const sel = e.target as HTMLSelectElement;
          const uom = sel.options[sel.selectedIndex]?.dataset.uom;
          const row = sel.closest('.secondary-output-row')!;
          const uomInput = row.querySelector('.sec-uom-input') as HTMLInputElement;
          if (uom && uomInput) uomInput.value = uom;
        });
      });
    }

    modalEl.querySelector('#btn-add-secondary-output')?.addEventListener('click', () => {
      formSecondaryOutputs.push({
        item: inventoryItems[0]?._id || '',
        type: 'BY_PRODUCT',
        quantity: 1,
        unitOfMeasure: inventoryItems[0]?.unitOfMeasure || 'pcs',
        costAllocationPercent: 0,
        notes: '',
      });
      renderSecondaryOutputsRows();
    });

    renderSecondaryOutputsRows();

    // Dynamic Consumed Components Renderer
    const compContainer = modalEl.querySelector('#components-container')!;
    function renderComponentRows() {
      if (formComponents.length === 0) {
        compContainer.innerHTML = `
          <div class="empty-builder-notice">
            No input components added. Click "+ Add Component" above.
          </div>
        `;
        return;
      }

      compContainer.innerHTML = formComponents
        .map((comp, idx) => {
          const selectedItemId = typeof comp.item === 'object' ? comp.item._id : comp.item;
          return `
            <div class="builder-row component-row" data-idx="${idx}">
              <div class="row-field flex-3">
                <label class="row-label">Component / Material *</label>
                <select class="form-select comp-item-select" required>
                  ${inventoryItems
                    .map((item) => {
                      const sel = item._id === selectedItemId ? 'selected' : '';
                      return `<option value="${item._id}" data-uom="${escapeHtml(item.unitOfMeasure)}" ${sel}>${escapeHtml(item.itemCode)} — ${escapeHtml(item.name)} ($${item.unitCost}/${item.unitOfMeasure})</option>`;
                    })
                    .join('')}
                </select>
              </div>

              <div class="row-field flex-1">
                <label class="row-label">Required Qty *</label>
                <input type="number" step="any" min="0.0001" class="form-control comp-qty-input" value="${comp.quantity || 1}" required />
              </div>

              <div class="row-field flex-1">
                <label class="row-label">UOM</label>
                <input type="text" class="form-control comp-uom-input" value="${comp.unitOfMeasure || 'pcs'}" />
              </div>

              <div class="row-field flex-1">
                <label class="row-label">Scrap %</label>
                <input type="number" step="any" min="0" max="100" class="form-control comp-scrap-input" value="${comp.scrapFactor || 0}" />
              </div>

              <div class="row-field flex-2">
                <label class="row-label">Assembly Notes</label>
                <input type="text" class="form-control comp-notes-input" placeholder="Placement, torque, cut length..." value="${escapeHtml(comp.notes || '')}" />
              </div>

              <div class="row-actions">
                <button type="button" class="btn-remove-row btn-remove-comp" title="Remove Component" data-idx="${idx}">✕</button>
              </div>
            </div>
          `;
        })
        .join('');

      // Wire remove buttons
      compContainer.querySelectorAll('.btn-remove-comp').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const idx = parseInt((e.currentTarget as HTMLElement).dataset.idx!, 10);
          formComponents.splice(idx, 1);
          renderComponentRows();
        });
      });

      // Wire item select UOM auto-fill
      compContainer.querySelectorAll('.comp-item-select').forEach((select) => {
        select.addEventListener('change', (e) => {
          const sel = e.target as HTMLSelectElement;
          const uom = sel.options[sel.selectedIndex]?.dataset.uom;
          const row = sel.closest('.component-row')!;
          const uomInput = row.querySelector('.comp-uom-input') as HTMLInputElement;
          if (uom && uomInput) uomInput.value = uom;
        });
      });
    }

    modalEl.querySelector('#btn-add-component-row')?.addEventListener('click', () => {
      formComponents.push({
        item: inventoryItems[0]?._id || '',
        quantity: 1,
        unitOfMeasure: inventoryItems[0]?.unitOfMeasure || 'pcs',
        scrapFactor: 0,
        notes: '',
      });
      renderComponentRows();
    });

    renderComponentRows();
  }

  // Delete BOM Confirmation
  function openDeleteModal(bom: BOM) {
    Modal.open({
      title: `Delete Bill of Materials: ${bom.bomCode}`,
      bodyHtml: `
        <div class="delete-warning">
          <p>Are you sure you want to delete Bill of Materials <strong>${escapeHtml(bom.name)}</strong> (<code>${escapeHtml(bom.bomCode)}</code>)?</p>
          <p class="text-muted text-sm mt-2">This will remove the recipe definition. Existing inventory records will not be deleted.</p>
        </div>
      `,
      confirmText: 'Yes, Delete BOM',
      confirmClass: 'btn btn-danger',
      onConfirm: async () => {
        try {
          await api.deleteBOM(bom._id);
          Toast.success(`BOM "${bom.bomCode}" deleted.`);
          if (selectedBOMId === bom._id) {
            selectedBOMId = null;
            document.getElementById('bom-detail-panel')!.innerHTML = `
              <div class="detail-placeholder">
                <div class="placeholder-icon">📑</div>
                <h4>Select a BOM to inspect recipe breakdown</h4>
              </div>
            `;
          }
          await loadBOMs();
          return true;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Failed to delete BOM';
          Toast.error(msg);
          return false;
        }
      },
    });
  }

  // Event Listeners
  document.getElementById('btn-add-bom')?.addEventListener('click', () => openBOMModal());

  let debounceTimer: ReturnType<typeof setTimeout>;
  document.getElementById('bom-search')?.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      currentSearch = (e.target as HTMLInputElement).value.trim();
      loadBOMs();
    }, 300);
  });

  document.getElementById('filter-bom-status')?.addEventListener('change', (e) => {
    currentStatus = (e.target as HTMLSelectElement).value;
    loadBOMs();
  });

  await loadInitialData();
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


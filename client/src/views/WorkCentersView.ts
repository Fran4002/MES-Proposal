import { api } from '../services/api.ts';
import type { WorkCenter, WorkCenterStatus, WorkCenterType } from '../types.ts';
import { Modal } from '../components/Modal.ts';
import { Toast } from '../components/Toast.ts';

export async function renderWorkCentersView(container: HTMLElement) {
  let workCenters: WorkCenter[] = [];
  let currentStatus = 'ALL';
  let currentType = 'ALL';
  let currentSearch = '';

  container.innerHTML = `
    <div class="view-header">
      <div>
        <h2 class="view-title">Work Centers Management</h2>
        <p class="view-subtitle">Physical workstations, automated machinery, assembly lines, and inspection cells.</p>
      </div>
      <div class="header-actions">
        <button id="btn-add-wc" class="btn btn-primary">
          <span class="btn-icon">+</span> Add Work Center
        </button>
      </div>
    </div>

    <!-- Filters & Search Toolbar -->
    <div class="toolbar">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input type="text" id="wc-search" placeholder="Search by code, workstation name, or department..." />
      </div>
      <div class="filter-group">
        <label for="filter-wc-status">Status:</label>
        <select id="filter-wc-status" class="form-select">
          <option value="ALL">All Statuses</option>
          <option value="AVAILABLE">Available</option>
          <option value="RUNNING">Running</option>
          <option value="MAINTENANCE">Maintenance</option>
          <option value="OFFLINE">Offline</option>
        </select>
      </div>
      <div class="filter-group">
        <label for="filter-wc-type">Type:</label>
        <select id="filter-wc-type" class="form-select">
          <option value="ALL">All Types</option>
          <option value="MACHINE">Machine / CNC</option>
          <option value="MANUAL_ASSEMBLY">Manual Assembly</option>
          <option value="QUALITY_CONTROL">Quality / QC</option>
          <option value="PACKAGING">Packaging</option>
          <option value="SURFACE_FINISH">Surface Finish</option>
        </select>
      </div>
    </div>

    <!-- Work Centers Table Container -->
    <div class="table-card">
      <div class="table-responsive">
        <table class="data-table" id="wc-table">
          <thead>
            <tr>
              <th>WC Code</th>
              <th>Name & Description</th>
              <th>Department</th>
              <th>Type</th>
              <th>Capacity (Units/Hr)</th>
              <th>Hourly Rate ($/Hr)</th>
              <th>Operational Status</th>
              <th>Active Job</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="wc-tbody">
            <tr>
              <td colspan="9" class="text-center py-4">Loading work centers...</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  async function loadWorkCenters() {
    try {
      const res = await api.getWorkCenters({
        status: currentStatus,
        type: currentType,
        search: currentSearch,
      });
      workCenters = res.data || [];
      renderTable();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error loading work centers';
      Toast.error(msg);
      document.getElementById('wc-tbody')!.innerHTML = `
        <tr>
          <td colspan="9" class="text-center text-error py-4">Failed to load work centers: ${msg}</td>
        </tr>
      `;
    }
  }

  function renderTable() {
    const tbody = document.getElementById('wc-tbody')!;
    if (workCenters.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" class="text-center py-6 empty-state">
            <p>No work centers found matching criteria.</p>
            <button class="btn btn-sm btn-outline mt-2" id="empty-clear-wc-filters">Reset Filters</button>
          </td>
        </tr>
      `;
      document.getElementById('empty-clear-wc-filters')?.addEventListener('click', () => {
        (document.getElementById('wc-search') as HTMLInputElement).value = '';
        (document.getElementById('filter-wc-status') as HTMLSelectElement).value = 'ALL';
        (document.getElementById('filter-wc-type') as HTMLSelectElement).value = 'ALL';
        currentSearch = '';
        currentStatus = 'ALL';
        currentType = 'ALL';
        loadWorkCenters();
      });
      return;
    }

    tbody.innerHTML = workCenters
      .map((wc) => {
        const statusBadge = getStatusBadge(wc.status);
        const typeBadge = formatType(wc.type);

        return `
          <tr data-id="${wc._id}">
            <td class="font-mono font-bold">${escapeHtml(wc.code)}</td>
            <td>
              <div class="font-semibold">${escapeHtml(wc.name)}</div>
              ${wc.description ? `<div class="text-muted text-sm">${escapeHtml(wc.description)}</div>` : ''}
            </td>
            <td><span class="department-tag">${escapeHtml(wc.department)}</span></td>
            <td><span class="badge badge-secondary">${typeBadge}</span></td>
            <td class="font-mono">${wc.capacityPerHour} <span class="text-muted text-xs">units/hr</span></td>
            <td class="font-mono font-bold">$${wc.hourlyRate.toFixed(2)}/hr</td>
            <td>${statusBadge}</td>
            <td>
              ${
                wc.currentJob
                  ? `<span class="current-job-tag">⚙️ ${escapeHtml(wc.currentJob)}</span>`
                  : `<span class="text-muted text-xs">Idle</span>`
              }
            </td>
            <td>
              <div class="action-buttons">
                <button class="btn-icon-action btn-edit-wc" title="Edit Work Center" data-id="${wc._id}">✏️</button>
                <button class="btn-icon-action btn-delete-wc" title="Delete Work Center" data-id="${wc._id}">🗑️</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join('');

    // Attach row events
    tbody.querySelectorAll('.btn-edit-wc').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).dataset.id!;
        const wc = workCenters.find((w) => w._id === id);
        if (wc) openWorkCenterModal(wc);
      });
    });

    tbody.querySelectorAll('.btn-delete-wc').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).dataset.id!;
        const wc = workCenters.find((w) => w._id === id);
        if (wc) openDeleteModal(wc);
      });
    });
  }

  // Add / Edit Modal
  function openWorkCenterModal(wc?: WorkCenter) {
    const isEdit = Boolean(wc);
    const title = isEdit ? `Edit Work Center: ${wc?.code}` : 'Create New Work Center';

    const formHtml = `
      <form id="wc-form" class="form-grid">
        <div class="form-group">
          <label class="form-label" for="form-wc-code">Work Center Code *</label>
          <input type="text" id="form-wc-code" class="form-control" required value="${wc ? escapeHtml(wc.code) : ''}" placeholder="e.g. WC-CNC-01" ${isEdit ? 'readonly' : ''} />
          <small class="form-hint">Unique station code used for routing operations in MES.</small>
        </div>

        <div class="form-group">
          <label class="form-label" for="form-wc-name">Work Center Name *</label>
          <input type="text" id="form-wc-name" class="form-control" required value="${wc ? escapeHtml(wc.name) : ''}" placeholder="e.g. 5-Axis Precision CNC Mill" />
        </div>

        <div class="form-group full-width">
          <label class="form-label" for="form-wc-desc">Description & Capabilities</label>
          <textarea id="form-wc-desc" class="form-control" rows="2" placeholder="Tolerances, machine model, operator certifications...">${wc?.description ? escapeHtml(wc.description) : ''}</textarea>
        </div>

        <div class="form-group">
          <label class="form-label" for="form-wc-dept">Department *</label>
          <input type="text" id="form-wc-dept" class="form-control" required value="${wc ? escapeHtml(wc.department) : 'Production'}" placeholder="e.g. Machining, Assembly, Electronics" />
        </div>

        <div class="form-group">
          <label class="form-label" for="form-wc-type">Type *</label>
          <select id="form-wc-type" class="form-select" required>
            <option value="MACHINE" ${wc?.type === 'MACHINE' ? 'selected' : ''}>Machine / Automated</option>
            <option value="MANUAL_ASSEMBLY" ${wc?.type === 'MANUAL_ASSEMBLY' ? 'selected' : ''}>Manual Assembly</option>
            <option value="QUALITY_CONTROL" ${wc?.type === 'QUALITY_CONTROL' ? 'selected' : ''}>Quality Control / Inspection</option>
            <option value="PACKAGING" ${wc?.type === 'PACKAGING' ? 'selected' : ''}>Packaging & Shipping</option>
            <option value="SURFACE_FINISH" ${wc?.type === 'SURFACE_FINISH' ? 'selected' : ''}>Surface Finishing / Coating</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label" for="form-wc-cap">Capacity (Units / Hour)</label>
          <input type="number" step="any" min="0" id="form-wc-cap" class="form-control" value="${wc ? wc.capacityPerHour : 10}" />
          <small class="form-hint">Nominal line throughput rating.</small>
        </div>

        <div class="form-group">
          <label class="form-label" for="form-wc-rate">Hourly Rate ($ / Hour)</label>
          <input type="number" step="0.01" min="0" id="form-wc-rate" class="form-control" value="${wc ? wc.hourlyRate : 50.0}" />
          <small class="form-hint">Machine depreciation + labor standard rate.</small>
        </div>

        <div class="form-group">
          <label class="form-label" for="form-wc-status">Operational Status</label>
          <select id="form-wc-status" class="form-select">
            <option value="AVAILABLE" ${wc?.status === 'AVAILABLE' || !wc ? 'selected' : ''}>Available (Ready)</option>
            <option value="RUNNING" ${wc?.status === 'RUNNING' ? 'selected' : ''}>Running (Active Job)</option>
            <option value="MAINTENANCE" ${wc?.status === 'MAINTENANCE' ? 'selected' : ''}>Maintenance / Repair</option>
            <option value="OFFLINE" ${wc?.status === 'OFFLINE' ? 'selected' : ''}>Offline</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label" for="form-wc-job">Current Active Job / Order</label>
          <input type="text" id="form-wc-job" class="form-control" value="${wc?.currentJob ? escapeHtml(wc.currentJob) : ''}" placeholder="e.g. WO-2026-0042" />
        </div>
      </form>
    `;

    Modal.open({
      title,
      bodyHtml: formHtml,
      size: 'lg',
      confirmText: isEdit ? 'Save Changes' : 'Create Work Center',
      onConfirm: async () => {
        const codeInput = document.getElementById('form-wc-code') as HTMLInputElement;
        const nameInput = document.getElementById('form-wc-name') as HTMLInputElement;
        const descInput = document.getElementById('form-wc-desc') as HTMLTextAreaElement;
        const deptInput = document.getElementById('form-wc-dept') as HTMLInputElement;
        const typeSelect = document.getElementById('form-wc-type') as HTMLSelectElement;
        const capInput = document.getElementById('form-wc-cap') as HTMLInputElement;
        const rateInput = document.getElementById('form-wc-rate') as HTMLInputElement;
        const statusSelect = document.getElementById('form-wc-status') as HTMLSelectElement;
        const jobInput = document.getElementById('form-wc-job') as HTMLInputElement;

        const code = codeInput.value.trim().toUpperCase();
        const name = nameInput.value.trim();
        const description = descInput.value.trim();
        const department = deptInput.value.trim();
        const type = typeSelect.value as WorkCenterType;
        const capacityPerHour = parseFloat(capInput.value) || 0;
        const hourlyRate = parseFloat(rateInput.value) || 0;
        const status = statusSelect.value as WorkCenterStatus;
        const currentJob = jobInput.value.trim();

        if (!code || !name || !department) {
          Toast.error('Please fill in Work Center Code, Name, and Department.');
          return false;
        }

        const payload: Partial<WorkCenter> = {
          code,
          name,
          description,
          department,
          type,
          capacityPerHour,
          hourlyRate,
          status,
          currentJob,
        };

        try {
          if (isEdit && wc) {
            await api.updateWorkCenter(wc._id, payload);
            Toast.success(`Work Center "${code}" updated successfully.`);
          } else {
            await api.createWorkCenter(payload);
            Toast.success(`Work Center "${code}" created successfully.`);
          }
          await loadWorkCenters();
          return true;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Operation failed';
          Toast.error(msg);
          return false;
        }
      },
    });
  }

  // Delete Confirmation Modal
  function openDeleteModal(wc: WorkCenter) {
    Modal.open({
      title: `Delete Work Center: ${wc.code}`,
      bodyHtml: `
        <div class="delete-warning">
          <p>Are you sure you want to delete workstation <strong>${escapeHtml(wc.name)}</strong> (<code>${escapeHtml(wc.code)}</code>)?</p>
          <p class="text-muted text-sm mt-2">If this work center is designated as the primary or preferred work center in any BOM, deletion will be safely rejected.</p>
        </div>
      `,
      confirmText: 'Yes, Delete Work Center',
      confirmClass: 'btn btn-danger',
      onConfirm: async () => {
        try {
          await api.deleteWorkCenter(wc._id);
          Toast.success(`Work Center "${wc.code}" deleted.`);
          await loadWorkCenters();
          return true;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Failed to delete work center';
          Toast.error(msg);
          return false;
        }
      },
    });
  }

  // Event Listeners
  document.getElementById('btn-add-wc')?.addEventListener('click', () => openWorkCenterModal());

  let debounceTimer: ReturnType<typeof setTimeout>;
  document.getElementById('wc-search')?.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      currentSearch = (e.target as HTMLInputElement).value.trim();
      loadWorkCenters();
    }, 300);
  });

  document.getElementById('filter-wc-status')?.addEventListener('change', (e) => {
    currentStatus = (e.target as HTMLSelectElement).value;
    loadWorkCenters();
  });

  document.getElementById('filter-wc-type')?.addEventListener('change', (e) => {
    currentType = (e.target as HTMLSelectElement).value;
    loadWorkCenters();
  });

  await loadWorkCenters();
}

function getStatusBadge(status: WorkCenterStatus): string {
  switch (status) {
    case 'AVAILABLE':
      return `<span class="badge badge-success">● Available</span>`;
    case 'RUNNING':
      return `<span class="badge badge-running">▶ Running</span>`;
    case 'MAINTENANCE':
      return `<span class="badge badge-warning">⚙ Maintenance</span>`;
    case 'OFFLINE':
      return `<span class="badge badge-danger">■ Offline</span>`;
    default:
      return `<span class="badge badge-secondary">${status}</span>`;
  }
}

function formatType(type: WorkCenterType): string {
  switch (type) {
    case 'MACHINE':
      return 'Machine';
    case 'MANUAL_ASSEMBLY':
      return 'Manual Assembly';
    case 'QUALITY_CONTROL':
      return 'Quality Control';
    case 'PACKAGING':
      return 'Packaging';
    case 'SURFACE_FINISH':
      return 'Surface Finish';
    default:
      return type;
  }
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


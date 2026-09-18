import { api } from '../services/api.ts';
import type { InventoryItem, InventoryCategory, InventoryStatus } from '../types.ts';
import { Modal } from '../components/Modal.ts';
import { Toast } from '../components/Toast.ts';

export async function renderInventoryView(container: HTMLElement) {
  let items: InventoryItem[] = [];
  let currentCategory = 'ALL';
  let currentStatus = 'ALL';
  let currentSearch = '';

  container.innerHTML = `
    <div class="view-header">
      <div>
        <h2 class="view-title">Inventory Management</h2>
        <p class="view-subtitle">Catalog of raw materials, sub-assemblies, consumables, finished goods, and by-products.</p>
      </div>
      <div class="header-actions">
        <button id="btn-add-item" class="btn btn-primary">
          <span class="btn-icon">+</span> Add New Item
        </button>
      </div>
    </div>

    <!-- Filters & Search Toolbar -->
    <div class="toolbar">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input type="text" id="inventory-search" placeholder="Search by SKU, item name, or location..." />
      </div>
      <div class="filter-group">
        <label for="filter-category">Category:</label>
        <select id="filter-category" class="form-select">
          <option value="ALL">All Categories</option>
          <option value="RAW_MATERIAL">Raw Material</option>
          <option value="SUB_ASSEMBLY">Sub-Assembly</option>
          <option value="FINISHED_GOOD">Finished Good</option>
          <option value="CONSUMABLE">Consumable</option>
          <option value="BY_PRODUCT">By-Product</option>
        </select>
      </div>
      <div class="filter-group">
        <label for="filter-status">Status:</label>
        <select id="filter-status" class="form-select">
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="DISCONTINUED">Discontinued</option>
        </select>
      </div>
    </div>

    <!-- Inventory Table Container -->
    <div class="table-card">
      <div class="table-responsive">
        <table class="data-table" id="inventory-table">
          <thead>
            <tr>
              <th>SKU / Code</th>
              <th>Name & Description</th>
              <th>Category</th>
              <th>Quantity on Hand</th>
              <th>Min Stock</th>
              <th>Unit Cost</th>
              <th>Location</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="inventory-tbody">
            <tr>
              <td colspan="9" class="text-center py-4">Loading inventory records...</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Fetch and display inventory items
  async function loadItems() {
    try {
      const res = await api.getInventory({
        category: currentCategory,
        status: currentStatus,
        search: currentSearch,
      });
      items = res.data || [];
      renderTable();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error loading inventory';
      Toast.error(msg);
      document.getElementById('inventory-tbody')!.innerHTML = `
        <tr>
          <td colspan="9" class="text-center text-error py-4">Failed to load inventory data: ${msg}</td>
        </tr>
      `;
    }
  }

  function renderTable() {
    const tbody = document.getElementById('inventory-tbody')!;
    if (items.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" class="text-center py-6 empty-state">
            <p>No inventory items match the current filters.</p>
            <button class="btn btn-sm btn-outline mt-2" id="empty-clear-filters">Reset Filters</button>
          </td>
        </tr>
      `;
      document.getElementById('empty-clear-filters')?.addEventListener('click', () => {
        (document.getElementById('inventory-search') as HTMLInputElement).value = '';
        (document.getElementById('filter-category') as HTMLSelectElement).value = 'ALL';
        (document.getElementById('filter-status') as HTMLSelectElement).value = 'ALL';
        currentSearch = '';
        currentCategory = 'ALL';
        currentStatus = 'ALL';
        loadItems();
      });
      return;
    }

    tbody.innerHTML = items
      .map((item) => {
        const isLow = item.quantityOnHand <= item.minStockLevel;
        const categoryBadgeClass = getCategoryBadgeClass(item.category);
        const statusBadgeClass = getStatusBadgeClass(item.status);

        return `
          <tr data-id="${item._id}">
            <td class="font-mono font-bold">${escapeHtml(item.itemCode)}</td>
            <td>
              <div class="item-name font-semibold">${escapeHtml(item.name)}</div>
              ${item.description ? `<div class="item-desc text-muted">${escapeHtml(item.description)}</div>` : ''}
            </td>
            <td><span class="badge ${categoryBadgeClass}">${formatCategory(item.category)}</span></td>
            <td>
              <div class="stock-display">
                <span class="stock-qty ${isLow ? 'text-warning font-bold' : ''}">${item.quantityOnHand} ${escapeHtml(item.unitOfMeasure)}</span>
                ${isLow ? '<span class="badge badge-warning text-xs">Low Stock</span>' : ''}
              </div>
            </td>
            <td>${item.minStockLevel} ${escapeHtml(item.unitOfMeasure)}</td>
            <td>$${item.unitCost.toFixed(2)}</td>
            <td><span class="location-tag">${escapeHtml(item.location || 'Warehouse')}</span></td>
            <td><span class="badge ${statusBadgeClass}">${item.status}</span></td>
            <td>
              <div class="action-buttons">
                <button class="btn-icon-action btn-edit" title="Edit Item" data-id="${item._id}">✏️</button>
                <button class="btn-icon-action btn-delete" title="Delete Item" data-id="${item._id}">🗑️</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join('');

    // Attach row action listeners
    tbody.querySelectorAll('.btn-edit').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).dataset.id!;
        const item = items.find((i) => i._id === id);
        if (item) openItemModal(item);
      });
    });

    tbody.querySelectorAll('.btn-delete').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).dataset.id!;
        const item = items.find((i) => i._id === id);
        if (item) openDeleteModal(item);
      });
    });
  }

  // Open Add/Edit Item Modal
  function openItemModal(item?: InventoryItem) {
    const isEdit = Boolean(item);
    const title = isEdit ? `Edit Inventory Item: ${item?.itemCode}` : 'Create New Inventory Item';

    const formHtml = `
      <form id="inventory-form" class="form-grid">
        <div class="form-group">
          <label class="form-label" for="form-itemCode">Item Code / SKU *</label>
          <input type="text" id="form-itemCode" class="form-control" required value="${item ? escapeHtml(item.itemCode) : ''}" placeholder="e.g. RAW-ALUM-001" ${isEdit ? 'readonly' : ''} />
          <small class="form-hint">Unique identifier for tracking across BOMs and Work Orders.</small>
        </div>

        <div class="form-group">
          <label class="form-label" for="form-name">Item Name *</label>
          <input type="text" id="form-name" class="form-control" required value="${item ? escapeHtml(item.name) : ''}" placeholder="e.g. 6061 Aluminum Billet" />
        </div>

        <div class="form-group full-width">
          <label class="form-label" for="form-description">Description</label>
          <textarea id="form-description" class="form-control" rows="2" placeholder="Specifications, alloy grade, supplier notes...">${item?.description ? escapeHtml(item.description) : ''}</textarea>
        </div>

        <div class="form-group">
          <label class="form-label" for="form-category">Category *</label>
          <select id="form-category" class="form-select" required>
            <option value="RAW_MATERIAL" ${item?.category === 'RAW_MATERIAL' ? 'selected' : ''}>Raw Material (RM)</option>
            <option value="SUB_ASSEMBLY" ${item?.category === 'SUB_ASSEMBLY' ? 'selected' : ''}>Sub-Assembly (SA)</option>
            <option value="FINISHED_GOOD" ${item?.category === 'FINISHED_GOOD' ? 'selected' : ''}>Finished Good (FG)</option>
            <option value="CONSUMABLE" ${item?.category === 'CONSUMABLE' ? 'selected' : ''}>Consumable / Tooling</option>
            <option value="BY_PRODUCT" ${item?.category === 'BY_PRODUCT' ? 'selected' : ''}>By-Product (Co/By-Product)</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label" for="form-uom">Unit of Measure (UOM) *</label>
          <input type="text" id="form-uom" class="form-control" required value="${item?.unitOfMeasure ? escapeHtml(item.unitOfMeasure) : 'pcs'}" placeholder="pcs, kg, m, L..." />
        </div>

        <div class="form-group">
          <label class="form-label" for="form-qty">Quantity on Hand</label>
          <input type="number" step="any" min="0" id="form-qty" class="form-control" value="${item ? item.quantityOnHand : 0}" />
        </div>

        <div class="form-group">
          <label class="form-label" for="form-minStock">Min Stock Level (Alert Threshold)</label>
          <input type="number" step="any" min="0" id="form-minStock" class="form-control" value="${item ? item.minStockLevel : 10}" />
        </div>

        <div class="form-group">
          <label class="form-label" for="form-cost">Unit Cost ($)</label>
          <input type="number" step="0.01" min="0" id="form-cost" class="form-control" value="${item ? item.unitCost : 0.0}" />
        </div>

        <div class="form-group">
          <label class="form-label" for="form-location">Warehouse Location / Bin</label>
          <input type="text" id="form-location" class="form-control" value="${item?.location ? escapeHtml(item.location) : 'Warehouse A'}" placeholder="e.g. Rack 02 - Shelf B" />
        </div>

        <div class="form-group">
          <label class="form-label" for="form-status">Status</label>
          <select id="form-status" class="form-select">
            <option value="ACTIVE" ${item?.status === 'ACTIVE' || !item ? 'selected' : ''}>Active</option>
            <option value="INACTIVE" ${item?.status === 'INACTIVE' ? 'selected' : ''}>Inactive</option>
            <option value="DISCONTINUED" ${item?.status === 'DISCONTINUED' ? 'selected' : ''}>Discontinued</option>
          </select>
        </div>
      </form>
    `;

    Modal.open({
      title,
      bodyHtml: formHtml,
      size: 'lg',
      confirmText: isEdit ? 'Save Changes' : 'Create Item',
      onConfirm: async () => {
        const itemCodeInput = document.getElementById('form-itemCode') as HTMLInputElement;
        const nameInput = document.getElementById('form-name') as HTMLInputElement;
        const descInput = document.getElementById('form-description') as HTMLTextAreaElement;
        const categorySelect = document.getElementById('form-category') as HTMLSelectElement;
        const uomInput = document.getElementById('form-uom') as HTMLInputElement;
        const qtyInput = document.getElementById('form-qty') as HTMLInputElement;
        const minStockInput = document.getElementById('form-minStock') as HTMLInputElement;
        const costInput = document.getElementById('form-cost') as HTMLInputElement;
        const locationInput = document.getElementById('form-location') as HTMLInputElement;
        const statusSelect = document.getElementById('form-status') as HTMLSelectElement;

        const itemCode = itemCodeInput.value.trim().toUpperCase();
        const name = nameInput.value.trim();
        const description = descInput.value.trim();
        const category = categorySelect.value as InventoryCategory;
        const unitOfMeasure = uomInput.value.trim() || 'pcs';
        const quantityOnHand = parseFloat(qtyInput.value) || 0;
        const minStockLevel = parseFloat(minStockInput.value) || 0;
        const unitCost = parseFloat(costInput.value) || 0;
        const location = locationInput.value.trim();
        const status = statusSelect.value as InventoryStatus;

        if (!itemCode || !name) {
          Toast.error('Please fill in Item Code and Name.');
          return false;
        }

        const payload: Partial<InventoryItem> = {
          itemCode,
          name,
          description,
          category,
          unitOfMeasure,
          quantityOnHand,
          minStockLevel,
          unitCost,
          location,
          status,
        };

        try {
          if (isEdit && item) {
            await api.updateInventoryItem(item._id, payload);
            Toast.success(`Item "${itemCode}" updated successfully.`);
          } else {
            await api.createInventoryItem(payload);
            Toast.success(`Item "${itemCode}" created successfully.`);
          }
          await loadItems();
          return true;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Operation failed';
          Toast.error(msg);
          return false;
        }
      },
    });
  }

  // Open Delete Confirmation Modal
  function openDeleteModal(item: InventoryItem) {
    Modal.open({
      title: `Delete Item: ${item.itemCode}`,
      bodyHtml: `
        <div class="delete-warning">
          <p>Are you sure you want to delete inventory item <strong>${escapeHtml(item.name)}</strong> (<code>${escapeHtml(item.itemCode)}</code>)?</p>
          <p class="text-muted text-sm mt-2">Note: If this item is currently referenced in any Bill of Materials, deletion will be blocked to maintain data integrity.</p>
        </div>
      `,
      confirmText: 'Yes, Delete Item',
      confirmClass: 'btn btn-danger',
      onConfirm: async () => {
        try {
          await api.deleteInventoryItem(item._id);
          Toast.success(`Item "${item.itemCode}" was deleted.`);
          await loadItems();
          return true;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Failed to delete item';
          Toast.error(msg);
          return false;
        }
      },
    });
  }

  // Bind Toolbar Event Listeners
  document.getElementById('btn-add-item')?.addEventListener('click', () => openItemModal());

  let debounceTimer: ReturnType<typeof setTimeout>;
  document.getElementById('inventory-search')?.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      currentSearch = (e.target as HTMLInputElement).value.trim();
      loadItems();
    }, 300);
  });

  document.getElementById('filter-category')?.addEventListener('change', (e) => {
    currentCategory = (e.target as HTMLSelectElement).value;
    loadItems();
  });

  document.getElementById('filter-status')?.addEventListener('change', (e) => {
    currentStatus = (e.target as HTMLSelectElement).value;
    loadItems();
  });

  await loadItems();
}

function getCategoryBadgeClass(cat: InventoryCategory): string {
  switch (cat) {
    case 'RAW_MATERIAL':
      return 'badge-raw';
    case 'SUB_ASSEMBLY':
      return 'badge-subasm';
    case 'FINISHED_GOOD':
      return 'badge-product';
    case 'CONSUMABLE':
      return 'badge-consumable';
    case 'BY_PRODUCT':
      return 'badge-byproduct';
    default:
      return 'badge-secondary';
  }
}

function formatCategory(cat: InventoryCategory): string {
  return cat.replace('_', ' ');
}

function getStatusBadgeClass(status: InventoryStatus): string {
  switch (status) {
    case 'ACTIVE':
      return 'badge-success';
    case 'INACTIVE':
      return 'badge-secondary';
    case 'DISCONTINUED':
      return 'badge-danger';
    default:
      return 'badge-secondary';
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


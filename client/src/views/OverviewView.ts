import { api } from '../services/api.ts';
import { Toast } from '../components/Toast.ts';

export async function renderOverviewView(container: HTMLElement, onTabSwitch: (tab: string) => void) {
  container.innerHTML = `
    <div class="view-header">
      <div>
        <h2 class="view-title">MES Overview & Executive Architecture</h2>
        <p class="view-subtitle">Understand shop-floor execution, Bill of Materials with Co/By-Products, and Work Centers.</p>
      </div>
      <div class="header-actions">
        <button id="btn-seed-data" class="btn btn-primary">
          <span class="btn-icon">⚡</span> Seed Demo Factory Data
        </button>
      </div>
    </div>

    <!-- Live KPI Metrics -->
    <div class="kpi-grid" id="kpi-container">
      <div class="kpi-card">
        <div class="kpi-label">Total Inventory Items</div>
        <div class="kpi-value" id="kpi-inventory">Loading...</div>
        <div class="kpi-hint">Parts, Materials, Finished Goods</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Low Stock Alerts</div>
        <div class="kpi-value warning" id="kpi-low-stock">Loading...</div>
        <div class="kpi-hint">Items below reorder point</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Active Work Centers</div>
        <div class="kpi-value highlight" id="kpi-work-centers">Loading...</div>
        <div class="kpi-hint">Production lines & workstations</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Bills of Materials (BOM)</div>
        <div class="kpi-value" id="kpi-boms">Loading...</div>
        <div class="kpi-hint">Multi-output recipes & assemblies</div>
      </div>
    </div>

    <!-- Educational Concepts Flow -->
    <div class="concept-section">
      <h3 class="section-heading">Manufacturing Execution System (MES) Hierarchy</h3>
      <div class="architecture-flow">
        <div class="arch-box arch-erp">
          <div class="arch-badge">Enterprise Layer (ERP)</div>
          <h4>Demand & Planning</h4>
          <p>Sales orders, high-level master scheduling, accounting, and supply chain procurement.</p>
          <div class="arch-arrow">↓ Work Orders Released</div>
        </div>

        <div class="arch-box arch-mes">
          <div class="arch-badge highlight">Shop Floor Control (MES)</div>
          <h4>Execution & Traceability</h4>
          <div class="mes-features-list">
            <div class="mes-pill" id="pill-inv">📦 <strong>Inventory:</strong> Raw materials, WIP, by-products, real-time stock</div>
            <div class="mes-pill" id="pill-wc">⚙️ <strong>Work Centers:</strong> Machine capacity, routing, hourly cost, OEE</div>
            <div class="mes-pill" id="pill-bom">📑 <strong>BOMs:</strong> Recipes, scrap allowances, co-products, genealogy</div>
            <div class="mes-pill" id="pill-plan">🗺️ <strong>Production Plan:</strong> Directed graph of work center inputs, outputs, and bottlenecks</div>
          </div>
          <div class="arch-arrow">↓ Dispatches Machine Commands</div>
        </div>

        <div class="arch-box arch-floor">
          <div class="arch-badge">Physical Layer (OT / Shop Floor)</div>
          <h4>Machines, Robots, & Operators</h4>
          <p>CNC mills, SMT placement lines, assembly benches, sensors, barcode scanners.</p>
        </div>
      </div>
    </div>

    <!-- Deep Dive Cards: BOM, Work Centers, and Production Plan -->
    <div class="deep-dive-grid">
      <div class="card card-accent">
        <div class="card-header">
          <h3>📑 Bill of Materials (BOM) & Co-Products</h3>
        </div>
        <div class="card-body">
          <p>A <strong>Bill of Materials (BOM)</strong> is the structured engineering recipe listing all consumed inputs and produced outputs.</p>
          <ul class="concept-list">
            <li><strong>Single vs. Multi-Output:</strong> In addition to the primary finished product, processes often generate <em>Co-Products</em> (joint valuable outputs) and <em>By-Products</em> (such as recyclable metal swarf or chips).</li>
            <li><strong>Material Explosion & Backflushing:</strong> The MES automatically reserves parts and deducts inventory as operations complete.</li>
            <li><strong>Scrap Factors:</strong> Real operations account for cutting and fabrication loss via defined scrap allowances ($2\%-5\%$).</li>
          </ul>
          <button class="btn btn-outline" id="nav-to-bom">Go to BOM Management →</button>
        </div>
      </div>

      <div class="card card-accent">
        <div class="card-header">
          <h3>⚙️ Work Centers & Routing</h3>
        </div>
        <div class="card-body">
          <p>A <strong>Work Center</strong> is a distinct machine, line, or assembly bench on the factory floor where tasks are executed.</p>
          <ul class="concept-list">
            <li><strong>Capacity & Bottleneck Control:</strong> Defines standard output rate (units/hr) to balance line flow and prevent line starvation.</li>
            <li><strong>Cost Roll-Up:</strong> Captures hourly machine and labor depreciation rates ($/hr) to calculate true manufacturing variance.</li>
            <li><strong>Real-time State:</strong> Tracks availability (<code>AVAILABLE</code>, <code>RUNNING</code>, <code>MAINTENANCE</code>, <code>OFFLINE</code>).</li>
          </ul>
          <button class="btn btn-outline" id="nav-to-wc">Go to Work Centers →</button>
        </div>
      </div>

      <div class="card card-accent">
        <div class="card-header">
          <h3>🗺️ Production Plan & Material Lineage</h3>
        </div>
        <div class="card-body">
          <p>The <strong>Production Plan Graph</strong> visualizes how work centers interlock across the factory floor, with outputs from upstream centers feeding downstream operations.</p>
          <ul class="concept-list">
            <li><strong>Upstream Output ➔ Downstream Input:</strong> Follow subassembly flows, CNC parts, and PCBA boards through assembly, QA, and packaging.</li>
            <li><strong>Bottleneck Identification:</strong> Automatically flags throughput bottlenecks and cycle time constraints based on batch size.</li>
            <li><strong>Interactive Visual Topology:</strong> Pan, zoom, drag work center nodes, and inspect real-time material transfers.</li>
          </ul>
          <button class="btn btn-outline" id="nav-to-plan">Go to Production Plan Graph →</button>
        </div>
      </div>
    </div>
  `;

  // Fetch KPI data
  async function loadKPIs() {
    try {
      const [invRes, wcRes, bomRes] = await Promise.all([
        api.getInventory(),
        api.getWorkCenters(),
        api.getBOMs(),
      ]);

      const items = invRes.data || [];
      const workCenters = wcRes.data || [];
      const boms = bomRes.data || [];

      const lowStockCount = items.filter((i) => i.quantityOnHand <= i.minStockLevel).length;
      const activeWCCount = workCenters.filter((wc) => wc.status === 'RUNNING' || wc.status === 'AVAILABLE').length;

      document.getElementById('kpi-inventory')!.textContent = items.length.toString();
      document.getElementById('kpi-low-stock')!.textContent = lowStockCount.toString();
      document.getElementById('kpi-work-centers')!.textContent = `${activeWCCount} / ${workCenters.length}`;
      document.getElementById('kpi-boms')!.textContent = boms.length.toString();
    } catch (err: unknown) {
      console.warn('Failed to load KPIs:', err);
      document.getElementById('kpi-inventory')!.textContent = '-';
      document.getElementById('kpi-low-stock')!.textContent = '-';
      document.getElementById('kpi-work-centers')!.textContent = '-';
      document.getElementById('kpi-boms')!.textContent = '-';
    }
  }

  // Bind navigation buttons
  document.getElementById('nav-to-bom')?.addEventListener('click', () => onTabSwitch('boms'));
  document.getElementById('nav-to-wc')?.addEventListener('click', () => onTabSwitch('work-centers'));
  document.getElementById('nav-to-plan')?.addEventListener('click', () => onTabSwitch('production-plan'));
  document.getElementById('pill-inv')?.addEventListener('click', () => onTabSwitch('inventory'));
  document.getElementById('pill-wc')?.addEventListener('click', () => onTabSwitch('work-centers'));
  document.getElementById('pill-bom')?.addEventListener('click', () => onTabSwitch('boms'));
  document.getElementById('pill-plan')?.addEventListener('click', () => onTabSwitch('production-plan'));

  // Bind Seed Data Button
  const seedBtn = document.getElementById('btn-seed-data');
  seedBtn?.addEventListener('click', async () => {
    seedBtn.setAttribute('disabled', 'true');
    seedBtn.innerHTML = '<span class="spinner"></span> Seeding Database...';

    try {
      const res = await api.seedDatabase();
      Toast.success(res.message || 'Demo factory data successfully loaded!');
      await loadKPIs();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to seed database';
      Toast.error(msg);
    } finally {
      seedBtn.removeAttribute('disabled');
      seedBtn.innerHTML = '<span class="btn-icon">⚡</span> Seed Demo Factory Data';
    }
  });

  await loadKPIs();
}


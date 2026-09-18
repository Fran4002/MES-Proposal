import './style.css';
import { api } from './services/api.ts';
import { Toast } from './components/Toast.ts';
import { renderOverviewView } from './views/OverviewView.ts';
import { renderInventoryView } from './views/InventoryView.ts';
import { renderWorkCentersView } from './views/WorkCentersView.ts';
import { renderBOMView } from './views/BOMView.ts';
import { renderProductionPlanView } from './views/ProductionPlanView.ts';

type TabId = 'overview' | 'inventory' | 'work-centers' | 'boms' | 'production-plan';

class App {
  private currentTab: TabId = 'overview';
  private appEl: HTMLElement;

  constructor() {
    this.appEl = document.querySelector<HTMLElement>('#app')!;
    this.initLayout();
    this.initTabRouter();
    this.checkBackendHealth();
  }

  private initLayout() {
    this.appEl.innerHTML = `
      <div class="mes-layout">
        <!-- Top Application Navigation Bar -->
        <header class="mes-navbar">
          <div class="navbar-brand">
            <div class="brand-logo">⚙️</div>
            <div class="brand-details">
              <span class="brand-title">AeroStrike MES</span>
              <span class="brand-subtitle">Manufacturing Execution System</span>
            </div>
          </div>

          <nav class="navbar-nav">
            <button class="nav-tab active" data-tab="overview">
              <span class="tab-icon">📊</span> Overview & Concepts
            </button>
            <button class="nav-tab" data-tab="inventory">
              <span class="tab-icon">📦</span> Inventory
            </button>
            <button class="nav-tab" data-tab="work-centers">
              <span class="tab-icon">⚙️</span> Work Centers
            </button>
            <button class="nav-tab" data-tab="boms">
              <span class="tab-icon">📑</span> Bill of Materials
            </button>
            <button class="nav-tab" data-tab="production-plan">
              <span class="tab-icon">🗺️</span> Production Plan
            </button>
          </nav>

          <div class="navbar-meta">
            <div class="server-status" id="server-status-pill">
              <span class="status-dot"></span>
              <span class="status-label">Checking Server...</span>
            </div>
            <button class="btn btn-sm btn-seed" id="quick-seed-btn" title="Populate realistic drone factory data">
              ⚡ Seed Demo Data
            </button>
          </div>
        </header>

        <!-- Main Workspace Container -->
        <main class="mes-main" id="mes-view-container">
          <div class="loading-view">Loading MES modules...</div>
        </main>
      </div>
    `;

    // Quick seed button
    document.getElementById('quick-seed-btn')?.addEventListener('click', async () => {
      const btn = document.getElementById('quick-seed-btn') as HTMLButtonElement;
      btn.setAttribute('disabled', 'true');
      btn.textContent = '⚡ Seeding...';

      try {
        const res = await api.seedDatabase();
        Toast.success(res.message || 'Demo data loaded successfully!');
        this.switchTab(this.currentTab);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to seed database';
        Toast.error(msg);
      } finally {
        btn.removeAttribute('disabled');
        btn.textContent = '⚡ Seed Demo Data';
      }
    });
  }

  private initTabRouter() {
    const tabs = document.querySelectorAll<HTMLButtonElement>('.nav-tab');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab as TabId;
        if (targetTab && targetTab !== this.currentTab) {
          this.switchTab(targetTab);
        }
      });
    });

    // Check hash route or default to overview
    const hash = window.location.hash.replace('#', '') as TabId;
    if (['overview', 'inventory', 'work-centers', 'boms', 'production-plan'].includes(hash)) {
      this.switchTab(hash);
    } else {
      this.switchTab('overview');
    }
  }

  public switchTab(tab: TabId) {
    this.currentTab = tab;
    window.location.hash = tab;

    // Update active tab styles
    document.querySelectorAll<HTMLButtonElement>('.nav-tab').forEach((el) => {
      if (el.dataset.tab === tab) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    const viewContainer = document.getElementById('mes-view-container')!;
    viewContainer.innerHTML = '<div class="view-loading-spinner"><div class="spinner"></div></div>';

    switch (tab) {
      case 'overview':
        renderOverviewView(viewContainer, (newTab) => this.switchTab(newTab as TabId));
        break;
      case 'inventory':
        renderInventoryView(viewContainer);
        break;
      case 'work-centers':
        renderWorkCentersView(viewContainer);
        break;
      case 'boms':
        renderBOMView(viewContainer);
        break;
      case 'production-plan':
        renderProductionPlanView(viewContainer);
        break;
    }
  }

  private async checkBackendHealth() {
    const pill = document.getElementById('server-status-pill');
    if (!pill) return;

    try {
      await api.checkHealth();
      pill.className = 'server-status online';
      pill.querySelector('.status-label')!.textContent = 'Server Connected';
    } catch {
      pill.className = 'server-status offline';
      pill.querySelector('.status-label')!.textContent = 'Server Offline';
    }
  }
}

// Bootstrap application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  new App();
});

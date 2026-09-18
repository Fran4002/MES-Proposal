import { api } from '../services/api.ts';
import type {
  BOM,
  WorkCenter,
  InventoryItem,
  ProductionGraphNode,
  ProductionGraphEdge,
  ProductionMaterialTransfer,
  ProductionPlanMetrics,
} from '../types.ts';
import { Toast } from '../components/Toast.ts';

export async function renderProductionPlanView(container: HTMLElement) {
  let boms: BOM[] = [];
  let workCenters: WorkCenter[] = [];
  let inventoryItems: InventoryItem[] = [];

  // Simulation & Filter States
  let batchSize = 10;
  let selectedProductFilter = 'ALL';
  let viewMode: 'graph' | 'sequence' = 'graph';
  let selectedNodeId: string | null = null;
  let selectedEdgeId: string | null = null;

  // Zoom & Pan State for SVG Canvas
  let zoomLevel = 1;
  let panX = 40;
  let panY = 40;
  let isPanning = false;
  let startMouseX = 0;
  let startMouseY = 0;

  // Dragging Node State
  let draggingNodeId: string | null = null;
  let dragOffset = { x: 0, y: 0 };

  // Computed Graph Data
  let graphNodes: ProductionGraphNode[] = [];
  let graphEdges: ProductionGraphEdge[] = [];
  let metrics: ProductionPlanMetrics = {
    totalStations: 0,
    totalInterCenterFlows: 0,
    simulatedBatchSize: batchSize,
    bottleneckWc: null,
    maxLeadTimeHours: 0,
    totalCostEstimate: 0,
  };

  container.innerHTML = `
    <div class="view-header">
      <div>
        <h2 class="view-title">Production Plan & Material Lineage</h2>
        <p class="view-subtitle">Interactive flow graph tracking how work center outputs become inputs for downstream operations.</p>
      </div>
      <div class="header-actions">
        <div class="btn-group">
          <button id="btn-view-graph" class="btn btn-sm btn-primary active">🕸️ Graph View</button>
          <button id="btn-view-sequence" class="btn btn-sm btn-outline">📋 Sequence Plan</button>
        </div>
      </div>
    </div>

    <!-- Production KPI & Bottleneck Header Banner -->
    <div class="production-summary-banner" id="plan-metrics-banner">
      <div class="metric-pill">
        <span class="pill-label">Active Work Centers</span>
        <strong class="pill-value" id="metric-stations">-</strong>
      </div>
      <div class="metric-pill">
        <span class="pill-label">Inter-Station Transfers</span>
        <strong class="pill-value" id="metric-flows">-</strong>
      </div>
      <div class="metric-pill alert" id="metric-bottleneck-pill">
        <span class="pill-label">Factory Bottleneck</span>
        <strong class="pill-value warning" id="metric-bottleneck">-</strong>
      </div>
      <div class="metric-pill">
        <span class="pill-label">Batch Lead Time</span>
        <strong class="pill-value highlight" id="metric-lead-time">-</strong>
      </div>
      <div class="metric-pill">
        <span class="pill-label">Estimated Machine Cost</span>
        <strong class="pill-value" id="metric-total-cost">-</strong>
      </div>
    </div>

    <!-- Interactive Simulation & Filter Controls -->
    <div class="toolbar plan-toolbar">
      <div class="toolbar-left">
        <div class="filter-group">
          <label for="plan-filter-product">Production Target:</label>
          <select id="plan-filter-product" class="form-select">
            <option value="ALL">All Factory Lineages (Global Flow)</option>
          </select>
        </div>

        <div class="simulator-control">
          <label for="plan-batch-input">Simulate Batch:</label>
          <div class="batch-input-wrapper">
            <button class="btn btn-sm btn-icon-only" id="batch-dec-btn" title="Decrease batch">-</button>
            <input type="number" id="plan-batch-input" min="1" max="1000" value="${batchSize}" />
            <button class="btn btn-sm btn-icon-only" id="batch-inc-btn" title="Increase batch">+</button>
            <span class="batch-unit">units</span>
          </div>
          <div class="batch-presets">
            <button class="btn-chip" data-batch="5">5</button>
            <button class="btn-chip active" data-batch="10">10</button>
            <button class="btn-chip" data-batch="25">25</button>
            <button class="btn-chip" data-batch="50">50</button>
          </div>
        </div>
      </div>

      <div class="toolbar-right">
        <!-- Canvas Zoom Controls -->
        <div class="zoom-controls">
          <button class="btn btn-sm btn-outline" id="btn-zoom-in" title="Zoom In">🔍+</button>
          <button class="btn btn-sm btn-outline" id="btn-zoom-out" title="Zoom Out">🔍-</button>
          <button class="btn btn-sm btn-outline" id="btn-zoom-reset" title="Reset View">⟲ Reset</button>
          <button class="btn btn-sm btn-outline" id="btn-zoom-fit" title="Auto-Center">↔ Fit</button>
        </div>
      </div>
    </div>

    <!-- Main Workspace: Graph Canvas & Inspector Drawer -->
    <div class="plan-workspace">
      <!-- Network Graph Container -->
      <div class="plan-graph-container" id="plan-graph-container">
        <!-- Legend Overlay -->
        <div class="graph-legend-overlay">
          <div class="legend-item"><span class="legend-dot color-machine"></span> Machine / CNC</div>
          <div class="legend-item"><span class="legend-dot color-assembly"></span> Assembly Bench</div>
          <div class="legend-item"><span class="legend-dot color-qc"></span> Quality Control</div>
          <div class="legend-item"><span class="legend-dot color-packaging"></span> Packaging</div>
          <div class="legend-item"><span class="legend-line line-primary"></span> Primary Output Transfer</div>
          <div class="legend-item"><span class="legend-line line-byproduct"></span> By-Product Lineage</div>
        </div>

        <svg id="production-graph-svg" class="production-graph-svg" width="100%" height="100%">
          <defs>
            <!-- Marker Arrowheads -->
            <marker id="arrow-primary" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8" />
            </marker>
            <marker id="arrow-byproduct" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#f59e0b" />
            </marker>
            <marker id="arrow-highlight" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
            </marker>

            <!-- Grid Pattern -->
            <pattern id="graph-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.2" fill="#334155" opacity="0.4" />
            </pattern>

            <!-- Glow Filters -->
            <filter id="node-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#0284c7" flood-opacity="0.25" />
            </filter>
            <filter id="bottleneck-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#ef4444" flood-opacity="0.4" />
            </filter>
          </defs>

          <!-- Infinite Grid Background -->
          <rect width="100%" height="100%" fill="url(#graph-grid)" id="graph-bg-rect" />

          <!-- Dynamic Graph Pan/Zoom Layer -->
          <g id="graph-pan-layer">
            <g id="edges-layer"></g>
            <g id="nodes-layer"></g>
          </g>
        </svg>

        <!-- Panning & Dragging Guide Hint -->
        <div class="canvas-help-hint">
          <span>💡 Click & drag canvas to pan • Scroll to zoom • Drag cards to rearrange • Click any Work Center to inspect</span>
        </div>
      </div>

      <!-- Sequence View Container (hidden by default) -->
      <div class="plan-sequence-container" id="plan-sequence-container" style="display: none;">
        <div class="table-card">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Stage #</th>
                  <th>Work Center</th>
                  <th>Active Process (BOM)</th>
                  <th>Inbound Components (Inputs)</th>
                  <th>Source Center / Supplier</th>
                  <th>Outbound Outputs</th>
                  <th>Destination Work Center</th>
                  <th>Capacity</th>
                  <th>Batch Duration (${batchSize} units)</th>
                </tr>
              </thead>
              <tbody id="sequence-tbody">
                <tr><td colspan="9" class="text-center py-4">Calculating production sequence...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Detail / Inspector Sidebar Drawer -->
      <aside class="plan-inspector-drawer" id="plan-inspector-drawer">
        <div class="inspector-placeholder" id="inspector-placeholder">
          <div class="placeholder-icon">🗺️</div>
          <h4>Work Center & Lineage Inspector</h4>
          <p class="text-muted text-sm">Select any Work Center or transfer line in the graph to view its real-time input requirements, output lineage, and bottleneck capacity.</p>
        </div>
        <div class="inspector-content" id="inspector-content" style="display: none;">
          <!-- Dynamically populated via renderInspector() -->
        </div>
      </aside>
    </div>
  `;

  // ----------------------------------------------------
  // Data Fetching & Graph Model Computation
  // ----------------------------------------------------
  async function loadData() {
    try {
      const [bomsRes, wcRes, invRes] = await Promise.all([
        api.getBOMs(),
        api.getWorkCenters(),
        api.getInventory(),
      ]);

      boms = bomsRes.data || [];
      workCenters = wcRes.data || [];
      inventoryItems = invRes.data || [];

      populateFilterDropdown();
      computeGraph();
      renderCurrentView();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load production data';
      Toast.error(msg);
    }
  }

  function populateFilterDropdown() {
    const select = document.getElementById('plan-filter-product') as HTMLSelectElement;
    if (!select) return;

    select.innerHTML = '<option value="ALL">All Factory Lineages (Global Flow)</option>';

    // Find all finished goods and subassemblies produced by BOMs
    boms.forEach((bom) => {
      const prodItem = typeof bom.primaryProduct.item === 'object' ? bom.primaryProduct.item : null;
      if (prodItem) {
        const opt = document.createElement('option');
        opt.value = bom._id;
        opt.textContent = `${bom.bomCode} — ${bom.name} (${prodItem.name})`;
        select.appendChild(opt);
      }
    });
  }

  /**
   * Builds the directed Work Center production graph:
   * 1. Maps which Work Center produces which items (primary & secondary).
   * 2. Iterates over all Work Centers and their BOMs:
   *    - For each component input, finds if an upstream Work Center produces it.
   *    - If yes, creates an Edge from source Work Center to target Work Center!
   *    - If no, classifies it as an external raw material.
   * 3. Calculates topological stages (ranks) for left-to-right visual placement.
   * 4. Calculates capacity, cycle times, bottleneck station, and batch hours.
   */
  function computeGraph() {
    // Determine active BOMs according to product filter
    let activeBOMs = [...boms];
    if (selectedProductFilter !== 'ALL') {
      // Trace backwards from the selected BOM target
      const targetBOM = boms.find((b) => b._id === selectedProductFilter);
      if (targetBOM) {
        const requiredBOMIds = new Set<string>();
        const queue: BOM[] = [targetBOM];

        while (queue.length > 0) {
          const current = queue.shift()!;
          requiredBOMIds.add(current._id);

          // Find BOMs that produce current's components
          current.components.forEach((comp) => {
            const compItemId = typeof comp.item === 'object' ? comp.item._id : comp.item;
            boms.forEach((candidate) => {
              const primaryId = typeof candidate.primaryProduct.item === 'object'
                ? candidate.primaryProduct.item._id
                : candidate.primaryProduct.item;
              const hasSecondary = candidate.secondaryOutputs.some((so) => {
                const sId = typeof so.item === 'object' ? so.item._id : so.item;
                return sId === compItemId;
              });

              if ((primaryId === compItemId || hasSecondary) && !requiredBOMIds.has(candidate._id)) {
                queue.push(candidate);
              }
            });
          });
        }

        activeBOMs = boms.filter((b) => requiredBOMIds.has(b._id));
      }
    }

    // Map: Item ID -> Array of { wc: WorkCenter, bom: BOM, isByProduct: boolean, quantity: number }
    const itemProducerMap = new Map<string, { wc: WorkCenter; bom: BOM; isByProduct: boolean; quantity: number }[]>();

    activeBOMs.forEach((bom) => {
      if (!bom.preferredWorkCenter) return;
      const wc = typeof bom.preferredWorkCenter === 'object'
        ? bom.preferredWorkCenter
        : workCenters.find((w) => w._id === bom.preferredWorkCenter);

      if (!wc) return;

      // Primary Output
      const primaryItemId = typeof bom.primaryProduct.item === 'object'
        ? bom.primaryProduct.item._id
        : bom.primaryProduct.item;

      if (primaryItemId) {
        const list = itemProducerMap.get(primaryItemId) || [];
        list.push({ wc, bom, isByProduct: false, quantity: bom.primaryProduct.quantity });
        itemProducerMap.set(primaryItemId, list);
      }

      // Secondary Outputs (Co-products / By-products)
      bom.secondaryOutputs.forEach((sec) => {
        const secItemId = typeof sec.item === 'object' ? sec.item._id : sec.item;
        if (secItemId) {
          const list = itemProducerMap.get(secItemId) || [];
          list.push({ wc, bom, isByProduct: true, quantity: sec.quantity });
          itemProducerMap.set(secItemId, list);
        }
      });
    });

    // Determine participating Work Centers
    const participatingWcMap = new Map<string, { wc: WorkCenter; boms: BOM[] }>();
    activeBOMs.forEach((bom) => {
      if (!bom.preferredWorkCenter) return;
      const wc = typeof bom.preferredWorkCenter === 'object'
        ? bom.preferredWorkCenter
        : workCenters.find((w) => w._id === bom.preferredWorkCenter);

      if (wc) {
        const existing = participatingWcMap.get(wc._id) || { wc, boms: [] };
        if (!existing.boms.some((b) => b._id === bom._id)) {
          existing.boms.push(bom);
        }
        participatingWcMap.set(wc._id, existing);
      }
    });

    // If no work centers found in BOMs, fall back to showing all work centers
    if (participatingWcMap.size === 0) {
      workCenters.forEach((wc) => {
        participatingWcMap.set(wc._id, { wc, boms: [] });
      });
    }

    // Build directed edges and categorize materials
    const edgesMap = new Map<string, ProductionGraphEdge>();
    const nodeInboundMap = new Map<string, ProductionMaterialTransfer[]>();
    const nodeOutboundMap = new Map<string, ProductionMaterialTransfer[]>();
    const nodeInboundTransfers = new Map<string, { fromWcId: string; fromWcCode: string; materials: ProductionMaterialTransfer[] }[]>();
    const nodeOutboundTransfers = new Map<string, { toWcId: string; toWcCode: string; materials: ProductionMaterialTransfer[] }[]>();

    // Pre-initialize maps for ALL participating WCs before processing
    participatingWcMap.forEach(({ wc }) => {
      nodeInboundMap.set(wc._id, []);
      nodeOutboundMap.set(wc._id, []);
      nodeInboundTransfers.set(wc._id, []);
      nodeOutboundTransfers.set(wc._id, []);
    });

    participatingWcMap.forEach(({ wc, boms: wcBOMs }) => {

      wcBOMs.forEach((bom) => {
        // Examine input components
        bom.components.forEach((comp) => {
          const compItem = typeof comp.item === 'object'
            ? comp.item
            : inventoryItems.find((i) => i._id === comp.item);

          if (!compItem) return;

          const producers = itemProducerMap.get(compItem._id) || [];
          // Filter out self-producers if any
          const upstreamProducers = producers.filter((p) => p.wc._id !== wc._id);

          const transfer: ProductionMaterialTransfer = {
            itemId: compItem._id,
            itemCode: compItem.itemCode,
            itemName: compItem.name,
            category: compItem.category,
            quantity: comp.quantity,
            unitOfMeasure: comp.unitOfMeasure || compItem.unitOfMeasure,
            scrapFactor: comp.scrapFactor,
            unitCost: compItem.unitCost,
          };

          if (upstreamProducers.length > 0) {
            // There is an upstream Work Center producing this component!
            upstreamProducers.forEach((prod) => {
              const edgeKey = `${prod.wc._id}->${wc._id}`;
              const existingEdge = edgesMap.get(edgeKey);

              if (existingEdge) {
                if (!existingEdge.materials.some((m) => m.itemId === transfer.itemId)) {
                  existingEdge.materials.push(transfer);
                }
                if (!existingEdge.bomCodes.includes(bom.bomCode)) {
                  existingEdge.bomCodes.push(bom.bomCode);
                }
              } else {
                edgesMap.set(edgeKey, {
                  id: edgeKey,
                  sourceWcId: prod.wc._id,
                  targetWcId: wc._id,
                  sourceWcCode: prod.wc.code,
                  targetWcCode: wc.code,
                  materials: [{ ...transfer, isByProduct: prod.isByProduct }],
                  bomCodes: [prod.bom.bomCode, bom.bomCode],
                });
              }

              // Record inbound transfer
              const inList = nodeInboundTransfers.get(wc._id)!;
              let inGroup = inList.find((g) => g.fromWcId === prod.wc._id);
              if (!inGroup) {
                inGroup = { fromWcId: prod.wc._id, fromWcCode: prod.wc.code, materials: [] };
                inList.push(inGroup);
              }
              if (!inGroup.materials.some((m) => m.itemId === transfer.itemId)) {
                inGroup.materials.push(transfer);
              }

              // Record outbound transfer
              const outList = nodeOutboundTransfers.get(prod.wc._id)!;
              let outGroup = outList.find((g) => g.toWcId === wc._id);
              if (!outGroup) {
                outGroup = { toWcId: wc._id, toWcCode: wc.code, materials: [] };
                outList.push(outGroup);
              }
              if (!outGroup.materials.some((m) => m.itemId === transfer.itemId)) {
                outGroup.materials.push(transfer);
              }
            });
          } else {
            // External Raw Material from Warehouse
            nodeInboundMap.get(wc._id)!.push(transfer);
          }
        });

        // Examine output items for terminal products (not consumed downstream)
        const primaryItem = typeof bom.primaryProduct.item === 'object'
          ? bom.primaryProduct.item
          : inventoryItems.find((i) => i._id === bom.primaryProduct.item);

        if (primaryItem) {
          // Check if any active BOM consumes this primary item
          const isConsumedDownstream = activeBOMs.some((otherBom) =>
            otherBom._id !== bom._id &&
            otherBom.components.some((c) => (typeof c.item === 'object' ? c.item._id : c.item) === primaryItem._id)
          );

          if (!isConsumedDownstream) {
            nodeOutboundMap.get(wc._id)!.push({
              itemId: primaryItem._id,
              itemCode: primaryItem.itemCode,
              itemName: primaryItem.name,
              category: primaryItem.category,
              quantity: bom.primaryProduct.quantity,
              unitOfMeasure: bom.primaryProduct.unitOfMeasure,
              unitCost: primaryItem.unitCost,
              isByProduct: false,
            });
          }
        }

        // Secondary outputs (co-products / by-products)
        bom.secondaryOutputs.forEach((sec) => {
          const secItem = typeof sec.item === 'object'
            ? sec.item
            : inventoryItems.find((i) => i._id === sec.item);

          if (secItem) {
            const isConsumedDownstream = activeBOMs.some((otherBom) =>
              otherBom.components.some((c) => (typeof c.item === 'object' ? c.item._id : c.item) === secItem._id)
            );

            if (!isConsumedDownstream) {
              nodeOutboundMap.get(wc._id)!.push({
                itemId: secItem._id,
                itemCode: secItem.itemCode,
                itemName: secItem.name,
                category: secItem.category,
                quantity: sec.quantity,
                unitOfMeasure: sec.unitOfMeasure || secItem.unitOfMeasure,
                unitCost: secItem.unitCost,
                isByProduct: true,
              });
            }
          }
        });
      });
    });

    graphEdges = Array.from(edgesMap.values());

    // ----------------------------------------------------
    // Topological Rank Assignment for Left-to-Right Staging
    // ----------------------------------------------------
    const stages = new Map<string, number>();
    participatingWcMap.forEach((_, wcId) => stages.set(wcId, 0));

    // Iteratively push downstream stages
    let changed = true;
    let iterations = 0;
    while (changed && iterations < 15) {
      changed = false;
      iterations++;
      graphEdges.forEach((edge) => {
        const sourceStage = stages.get(edge.sourceWcId) || 0;
        const targetStage = stages.get(edge.targetWcId) || 0;
        if (targetStage <= sourceStage) {
          stages.set(edge.targetWcId, sourceStage + 1);
          changed = true;
        }
      });
    }

    // Group nodes by stage
    const stageGroups = new Map<number, string[]>();
    stages.forEach((stage, wcId) => {
      const list = stageGroups.get(stage) || [];
      list.push(wcId);
      stageGroups.set(stage, list);
    });

    // Calculate node coordinates
    const NODE_WIDTH = 260;
    const NODE_HEIGHT = 160;
    const X_SPACING = 360;
    const Y_SPACING = 210;
    const START_X = 60;
    const START_Y = 60;

    let maxHours = 0;
    let bottleneck: WorkCenter | null = null;
    let totalMachineCost = 0;

    graphNodes = [];
    const stageKeys = Array.from(stageGroups.keys()).sort((a, b) => a - b);

    stageKeys.forEach((stageIndex) => {
      const wcIdsInStage = stageGroups.get(stageIndex)!;
      wcIdsInStage.forEach((wcId, rowIdx) => {
        const { wc, boms: wcBOMs } = participatingWcMap.get(wcId)!;
        const x = START_X + stageIndex * X_SPACING;
        const y = START_Y + rowIdx * Y_SPACING;

        // Capacity & Batch Simulation
        const capacity = wc.capacityPerHour > 0 ? wc.capacityPerHour : 1;
        const cycleTimeMinutes = Math.round((60 / capacity) * 10) / 10;
        const simulatedHours = Math.round((batchSize / capacity) * 100) / 100;
        const stationCost = Math.round(simulatedHours * wc.hourlyRate * 100) / 100;
        totalMachineCost += stationCost;

        if (simulatedHours > maxHours) {
          maxHours = simulatedHours;
          bottleneck = wc;
        }

        graphNodes.push({
          id: wc._id,
          wc,
          boms: wcBOMs,
          stage: stageIndex,
          x,
          y,
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
          inboundExternalMaterials: nodeInboundMap.get(wc._id) || [],
          outboundTerminalMaterials: nodeOutboundMap.get(wc._id) || [],
          inboundWcTransfers: nodeInboundTransfers.get(wc._id) || [],
          outboundWcTransfers: nodeOutboundTransfers.get(wc._id) || [],
          cycleTimeMinutes,
          simulatedHours,
        });
      });
    });

    // Mark bottleneck node
    graphNodes.forEach((node) => {
      node.isBottleneck = bottleneck?._id === node.id && graphNodes.length > 1;
    });

    metrics = {
      totalStations: graphNodes.length,
      totalInterCenterFlows: graphEdges.length,
      simulatedBatchSize: batchSize,
      bottleneckWc: bottleneck,
      maxLeadTimeHours: maxHours,
      totalCostEstimate: Math.round(totalMachineCost * 100) / 100,
    };

    updateMetricsBanner();
  }

  function updateMetricsBanner() {
    document.getElementById('metric-stations')!.textContent = metrics.totalStations.toString();
    document.getElementById('metric-flows')!.textContent = metrics.totalInterCenterFlows.toString();

    const bnEl = document.getElementById('metric-bottleneck')!;
    const bnPill = document.getElementById('metric-bottleneck-pill')!;
    if (metrics.bottleneckWc) {
      bnEl.textContent = `${metrics.bottleneckWc.code} (${metrics.bottleneckWc.capacityPerHour} pcs/hr)`;
      bnPill.style.display = 'flex';
    } else {
      bnEl.textContent = 'None';
    }

    document.getElementById('metric-lead-time')!.textContent = `${metrics.maxLeadTimeHours} hrs`;
    document.getElementById('metric-total-cost')!.textContent = `$${metrics.totalCostEstimate.toLocaleString()}`;
  }

  // ----------------------------------------------------
  // SVG Canvas Rendering & Interaction
  // ----------------------------------------------------
  function renderSVGGraph() {
    const nodesLayer = document.getElementById('nodes-layer');
    const edgesLayer = document.getElementById('edges-layer');
    if (!nodesLayer || !edgesLayer) return;

    nodesLayer.innerHTML = '';
    edgesLayer.innerHTML = '';

    const nodeMap = new Map<string, ProductionGraphNode>();
    graphNodes.forEach((n) => nodeMap.set(n.id, n));

    // 1. Render Edges (Material Transfers between Work Centers)
    graphEdges.forEach((edge) => {
      const source = nodeMap.get(edge.sourceWcId);
      const target = nodeMap.get(edge.targetWcId);
      if (!source || !target) return;

      const isHighlighted =
        selectedEdgeId === edge.id ||
        selectedNodeId === edge.sourceWcId ||
        selectedNodeId === edge.targetWcId;

      const isByProduct = edge.materials.some((m) => m.isByProduct);

      // Start: center right of source node
      const x1 = source.x + source.width;
      const y1 = source.y + source.height / 2;

      // End: center left of target node
      const x2 = target.x;
      const y2 = target.y + target.height / 2;

      // Cubic Bezier curve control points
      const dx = Math.max(80, Math.abs(x2 - x1) * 0.5);
      const cx1 = x1 + dx;
      const cy1 = y1;
      const cx2 = x2 - dx;
      const cy2 = y2;

      const pathData = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;

      // Group for edge
      const edgeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      edgeGroup.setAttribute('class', `graph-edge-group ${isHighlighted ? 'active' : ''}`);
      edgeGroup.dataset.edgeId = edge.id;

      // Invisible wider stroke for easy click/hover targeting
      const hitPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      hitPath.setAttribute('d', pathData);
      hitPath.setAttribute('class', 'edge-hit-area');

      // Visual Path
      const visualPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      visualPath.setAttribute('d', pathData);
      visualPath.setAttribute(
        'class',
        `edge-path ${isByProduct ? 'byproduct' : 'primary'} ${isHighlighted ? 'highlighted' : ''}`
      );
      visualPath.setAttribute(
        'marker-end',
        isHighlighted ? 'url(#arrow-highlight)' : isByProduct ? 'url(#arrow-byproduct)' : 'url(#arrow-primary)'
      );

      // Midpoint for transfer label badge
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;

      const labelGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      labelGroup.setAttribute('class', 'edge-label-badge');
      labelGroup.setAttribute('transform', `translate(${midX}, ${midY})`);

      // Prepare label text
      const primaryTransfer = edge.materials[0];
      const scaledQty = Math.round(primaryTransfer.quantity * batchSize * 10) / 10;
      const labelText = `${primaryTransfer.itemCode} (${scaledQty} ${primaryTransfer.unitOfMeasure})`;

      const badgeBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      const textWidth = Math.max(120, labelText.length * 7.5 + 24);
      badgeBg.setAttribute('x', (-textWidth / 2).toString());
      badgeBg.setAttribute('y', '-12');
      badgeBg.setAttribute('width', textWidth.toString());
      badgeBg.setAttribute('height', '24');
      badgeBg.setAttribute('rx', '12');
      badgeBg.setAttribute('class', `edge-pill-rect ${isByProduct ? 'byproduct' : ''}`);

      const badgeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      badgeText.setAttribute('x', '0');
      badgeText.setAttribute('y', '4');
      badgeText.setAttribute('text-anchor', 'middle');
      badgeText.setAttribute('class', 'edge-pill-text');
      badgeText.textContent = labelText;

      labelGroup.appendChild(badgeBg);
      labelGroup.appendChild(badgeText);

      edgeGroup.appendChild(hitPath);
      edgeGroup.appendChild(visualPath);
      edgeGroup.appendChild(labelGroup);

      // Edge click handler
      edgeGroup.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedEdgeId = edge.id;
        selectedNodeId = null;
        renderSVGGraph();
        renderEdgeInspector(edge);
      });

      edgesLayer.appendChild(edgeGroup);
    });

    // 2. Render Work Center Nodes
    graphNodes.forEach((node) => {
      const isSelected = selectedNodeId === node.id;
      const isBottleneck = !!node.isBottleneck;

      const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      nodeGroup.setAttribute('class', `graph-node-group ${isSelected ? 'selected' : ''} ${isBottleneck ? 'bottleneck' : ''}`);
      nodeGroup.setAttribute('transform', `translate(${node.x}, ${node.y})`);
      nodeGroup.dataset.nodeId = node.id;

      // Card Background
      const cardRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      cardRect.setAttribute('width', node.width.toString());
      cardRect.setAttribute('height', node.height.toString());
      cardRect.setAttribute('rx', '10');
      cardRect.setAttribute('class', `node-card-rect status-${node.wc.status.toLowerCase()}`);
      if (isBottleneck) {
        cardRect.setAttribute('filter', 'url(#bottleneck-glow)');
      } else if (isSelected) {
        cardRect.setAttribute('filter', 'url(#node-glow)');
      }

      // ForeignObject for Rich HTML Inside SVG Node Card
      const fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
      fo.setAttribute('width', node.width.toString());
      fo.setAttribute('height', node.height.toString());
      fo.setAttribute('class', 'node-foreign-object');

      const htmlCard = document.createElement('div');
      htmlCard.className = `node-card-inner ${isSelected ? 'selected' : ''} ${isBottleneck ? 'bottleneck' : ''}`;

      // Determine Department Icon
      let deptIcon = '⚙️';
      if (node.wc.type === 'MANUAL_ASSEMBLY') deptIcon = '🖐️';
      else if (node.wc.type === 'QUALITY_CONTROL') deptIcon = '🔬';
      else if (node.wc.type === 'PACKAGING') deptIcon = '📦';
      else if (node.wc.type === 'SURFACE_FINISH') deptIcon = '✨';

      const inTransfersCount = node.inboundWcTransfers.reduce((acc, t) => acc + t.materials.length, 0);
      const extInCount = node.inboundExternalMaterials.length;
      const outTransfersCount = node.outboundWcTransfers.reduce((acc, t) => acc + t.materials.length, 0);
      const extOutCount = node.outboundTerminalMaterials.length;

      htmlCard.innerHTML = `
        <div class="node-header">
          <div class="node-title-group">
            <span class="node-type-icon">${deptIcon}</span>
            <div class="node-code-wrapper">
              <strong class="node-code">${node.wc.code}</strong>
              <span class="node-dept-tag">${node.wc.department}</span>
            </div>
          </div>
          <span class="node-status-badge status-${node.wc.status.toLowerCase()}">${node.wc.status}</span>
        </div>

        <div class="node-body">
          <div class="node-wc-name" title="${node.wc.name}">${node.wc.name}</div>
          <div class="node-active-process">
            <span class="recipe-icon">📑</span>
            <span class="recipe-text">${node.boms.length > 0 ? node.boms.map((b) => b.bomCode).join(', ') : 'No BOM'}</span>
          </div>
        </div>

        <div class="node-metrics-bar">
          <div class="metric-col">
            <span class="metric-label">Capacity</span>
            <span class="metric-val">${node.wc.capacityPerHour} <small>pcs/h</small></span>
          </div>
          <div class="metric-col">
            <span class="metric-label">Batch Duration</span>
            <span class="metric-val highlight">${node.simulatedHours} <small>hrs</small></span>
          </div>
          <div class="metric-col">
            <span class="metric-label">Est. Cost</span>
            <span class="metric-val">$${Math.round(node.simulatedHours * node.wc.hourlyRate)}</span>
          </div>
        </div>

        <!-- Node Ports / Flow Chips Footer -->
        <div class="node-flow-footer">
          <div class="flow-port in" title="${inTransfersCount} upstream parts, ${extInCount} raw components">
            ← <strong>${inTransfersCount + extInCount}</strong> In
          </div>
          ${
            isBottleneck
              ? '<span class="bottleneck-tag">⚠️ BOTTLENECK</span>'
              : `<span class="stage-tag">Stage ${node.stage + 1}</span>`
          }
          <div class="flow-port out" title="${outTransfersCount} downstream transfers, ${extOutCount} terminal outputs">
            <strong>${outTransfersCount + extOutCount}</strong> Out →
          </div>
        </div>
      `;

      fo.appendChild(htmlCard);
      nodeGroup.appendChild(cardRect);
      nodeGroup.appendChild(fo);

      // Node Dragging & Selection Listeners
      nodeGroup.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        draggingNodeId = node.id;
        dragOffset = {
          x: (e.clientX - panX) / zoomLevel - node.x,
          y: (e.clientY - panY) / zoomLevel - node.y,
        };
      });

      nodeGroup.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedNodeId = node.id;
        selectedEdgeId = null;
        renderSVGGraph();
        renderNodeInspector(node);
      });

      nodesLayer.appendChild(nodeGroup);
    });

    applyPanZoomTransform();
  }

  function applyPanZoomTransform() {
    const layer = document.getElementById('graph-pan-layer');
    if (layer) {
      layer.setAttribute('transform', `translate(${panX}, ${panY}) scale(${zoomLevel})`);
    }
  }

  // ----------------------------------------------------
  // Inspectors: Work Center & Edge Details
  // ----------------------------------------------------
  function renderNodeInspector(node: ProductionGraphNode) {
    const placeholder = document.getElementById('inspector-placeholder');
    const content = document.getElementById('inspector-content');
    if (!placeholder || !content) return;

    placeholder.style.display = 'none';
    content.style.display = 'block';

    const activeBOM = node.boms[0];

    content.innerHTML = `
      <div class="inspector-header">
        <div class="inspector-badge-row">
          <span class="status-pill status-${node.wc.status.toLowerCase()}">${node.wc.status}</span>
          <span class="dept-badge">${node.wc.department}</span>
          ${node.isBottleneck ? '<span class="bottleneck-pill">⚠️ Production Bottleneck</span>' : ''}
        </div>
        <h3 class="inspector-title">${node.wc.name}</h3>
        <div class="inspector-subtitle">Work Center Code: <code>${node.wc.code}</code> | Type: ${node.wc.type}</div>
      </div>

      <!-- Capacity & Simulation Stats -->
      <div class="inspector-section">
        <h4 class="section-title">⚡ Operational Capacity & Run Time</h4>
        <div class="stats-mini-grid">
          <div class="mini-stat">
            <span class="stat-label">Rated Speed</span>
            <strong class="stat-val">${node.wc.capacityPerHour} pcs/hr</strong>
          </div>
          <div class="mini-stat">
            <span class="stat-label">Cycle Time</span>
            <strong class="stat-val">${node.cycleTimeMinutes} min/unit</strong>
          </div>
          <div class="mini-stat">
            <span class="stat-label">Simulated Duration</span>
            <strong class="stat-val highlight">${node.simulatedHours} hours</strong>
          </div>
          <div class="mini-stat">
            <span class="stat-label">Machine Labor Cost</span>
            <strong class="stat-val">$${Math.round(node.simulatedHours * node.wc.hourlyRate)} ($${node.wc.hourlyRate}/h)</strong>
          </div>
        </div>
        ${
          node.isBottleneck
            ? `<div class="alert-box alert-warning mt-2">
                <strong>Capacity Constraint Alert:</strong> This station has the lowest throughput in the chain (${node.wc.capacityPerHour} pcs/hr). It defines the maximum line pace and will determine the overall batch lead time of ${node.simulatedHours} hours.
               </div>`
            : ''
        }
      </div>

      <!-- Inbound Lineage (Inputs Received) -->
      <div class="inspector-section">
        <h4 class="section-title">📥 Inbound Material Lineage (Inputs)</h4>
        <p class="section-desc">Parts & components consumed by this work center:</p>

        <!-- From Upstream Work Centers -->
        ${
          node.inboundWcTransfers.length > 0
            ? `
            <div class="transfer-group-heading">From Upstream Work Centers:</div>
            ${node.inboundWcTransfers
              .map(
                (tr) => `
                <div class="transfer-card upstream">
                  <div class="transfer-header">
                    <span class="source-tag">From ${tr.fromWcCode}</span>
                  </div>
                  <div class="transfer-materials">
                    ${tr.materials
                      .map(
                        (m) => `
                      <div class="material-line-item">
                        <div class="mat-info">
                          <strong>${m.itemName}</strong>
                          <code>${m.itemCode}</code>
                        </div>
                        <div class="mat-qty">
                          <span class="qty-unit">${m.quantity} ${m.unitOfMeasure}/unit</span>
                          <span class="qty-batch">${Math.round(m.quantity * batchSize * 10) / 10} for batch</span>
                        </div>
                      </div>
                    `
                      )
                      .join('')}
                  </div>
                </div>
              `
              )
              .join('')}
          `
            : ''
        }

        <!-- From Warehouse / Raw Stock -->
        ${
          node.inboundExternalMaterials.length > 0
            ? `
            <div class="transfer-group-heading">From Raw Material Inventory:</div>
            <div class="transfer-card warehouse">
              <div class="transfer-header">
                <span class="source-tag">🏢 Warehouse Stock</span>
              </div>
              <div class="transfer-materials">
                ${node.inboundExternalMaterials
                  .map(
                    (m) => `
                  <div class="material-line-item">
                    <div class="mat-info">
                      <strong>${m.itemName}</strong>
                      <code>${m.itemCode}</code>
                    </div>
                    <div class="mat-qty">
                      <span class="qty-unit">${m.quantity} ${m.unitOfMeasure}/unit</span>
                      <span class="qty-batch">${Math.round(m.quantity * batchSize * 10) / 10} for batch</span>
                    </div>
                  </div>
                `
                  )
                  .join('')}
              </div>
            </div>
          `
            : ''
        }

        ${
          node.inboundWcTransfers.length === 0 && node.inboundExternalMaterials.length === 0
            ? '<p class="text-muted text-sm">No input materials mapped to this work center.</p>'
            : ''
        }
      </div>

      <!-- Outbound Lineage (Outputs Produced) -->
      <div class="inspector-section">
        <h4 class="section-title">📤 Outbound Material Lineage (Outputs)</h4>
        <p class="section-desc">Products & by-products manufactured by this work center:</p>

        <!-- To Downstream Work Centers -->
        ${
          node.outboundWcTransfers.length > 0
            ? `
            <div class="transfer-group-heading">Feeds Downstream Work Centers:</div>
            ${node.outboundWcTransfers
              .map(
                (tr) => `
                <div class="transfer-card downstream">
                  <div class="transfer-header">
                    <span class="dest-tag">To ${tr.toWcCode}</span>
                  </div>
                  <div class="transfer-materials">
                    ${tr.materials
                      .map(
                        (m) => `
                      <div class="material-line-item">
                        <div class="mat-info">
                          <strong>${m.itemName}</strong>
                          <code>${m.itemCode}</code>
                          ${m.isByProduct ? '<span class="byproduct-badge">By-Product</span>' : ''}
                        </div>
                        <div class="mat-qty">
                          <span class="qty-unit">${m.quantity} ${m.unitOfMeasure}/unit</span>
                          <span class="qty-batch">${Math.round(m.quantity * batchSize * 10) / 10} for batch</span>
                        </div>
                      </div>
                    `
                      )
                      .join('')}
                  </div>
                </div>
              `
              )
              .join('')}
          `
            : ''
        }

        <!-- Terminal Products -->
        ${
          node.outboundTerminalMaterials.length > 0
            ? `
            <div class="transfer-group-heading">Delivered to Finished Goods / Salvage:</div>
            <div class="transfer-card finished">
              <div class="transfer-header">
                <span class="dest-tag">📦 Finished Stock / Scrap Bin</span>
              </div>
              <div class="transfer-materials">
                ${node.outboundTerminalMaterials
                  .map(
                    (m) => `
                  <div class="material-line-item">
                    <div class="mat-info">
                      <strong>${m.itemName}</strong>
                      <code>${m.itemCode}</code>
                      ${m.isByProduct ? '<span class="byproduct-badge">Recyclable By-Product</span>' : ''}
                    </div>
                    <div class="mat-qty">
                      <span class="qty-unit">${m.quantity} ${m.unitOfMeasure}/unit</span>
                      <span class="qty-batch">${Math.round(m.quantity * batchSize * 10) / 10} for batch</span>
                    </div>
                  </div>
                `
                  )
                  .join('')}
              </div>
            </div>
          `
            : ''
        }
      </div>

      <!-- Active BOM Recipe -->
      ${
        activeBOM
          ? `
        <div class="inspector-section">
          <h4 class="section-title">📑 Assigned BOM Recipe</h4>
          <div class="bom-recipe-box">
            <div class="recipe-name"><strong>${activeBOM.bomCode}</strong>: ${activeBOM.name}</div>
            <p class="recipe-desc">${activeBOM.description || 'Standard manufacturing recipe.'}</p>
            <div class="recipe-meta">
              <span>Version: <code>v${activeBOM.version}</code></span>
              <span>Status: <strong class="text-success">${activeBOM.status}</strong></span>
            </div>
          </div>
        </div>
      `
          : ''
      }
    `;
  }

  function renderEdgeInspector(edge: ProductionGraphEdge) {
    const placeholder = document.getElementById('inspector-placeholder');
    const content = document.getElementById('inspector-content');
    if (!placeholder || !content) return;

    placeholder.style.display = 'none';
    content.style.display = 'block';

    const sourceWc = workCenters.find((w) => w._id === edge.sourceWcId);
    const targetWc = workCenters.find((w) => w._id === edge.targetWcId);

    content.innerHTML = `
      <div class="inspector-header">
        <div class="inspector-badge-row">
          <span class="status-pill status-running">Active Transfer</span>
          <span class="dept-badge">Inter-Center Lineage</span>
        </div>
        <h3 class="inspector-title">${edge.sourceWcCode} ➔ ${edge.targetWcCode}</h3>
        <div class="inspector-subtitle">Material handover between production stages</div>
      </div>

      <div class="inspector-section">
        <h4 class="section-title">🔀 Stage Connection</h4>
        <div class="edge-nodes-display">
          <div class="edge-node-box">
            <span class="node-role">Upstream Source:</span>
            <strong>${sourceWc?.name || edge.sourceWcCode}</strong>
            <small>${sourceWc?.department || ''} (${sourceWc?.capacityPerHour} pcs/h)</small>
          </div>
          <div class="edge-arrow-connector">➔</div>
          <div class="edge-node-box">
            <span class="node-role">Downstream Consumer:</span>
            <strong>${targetWc?.name || edge.targetWcCode}</strong>
            <small>${targetWc?.department || ''} (${targetWc?.capacityPerHour} pcs/h)</small>
          </div>
        </div>
      </div>

      <div class="inspector-section">
        <h4 class="section-title">📦 Transferred Material Line Items</h4>
        <div class="transfer-materials">
          ${edge.materials
            .map((m) => {
              const batchTotal = Math.round(m.quantity * batchSize * 10) / 10;
              const estValue = m.unitCost ? Math.round(batchTotal * m.unitCost * 100) / 100 : null;
              return `
              <div class="material-line-item highlight">
                <div class="mat-info">
                  <strong>${m.itemName}</strong>
                  <code>${m.itemCode}</code>
                  ${m.isByProduct ? '<span class="byproduct-badge">By-Product Lineage</span>' : '<span class="primary-badge">Subassembly Component</span>'}
                </div>
                <div class="mat-qty">
                  <span class="qty-unit">${m.quantity} ${m.unitOfMeasure}/unit</span>
                  <span class="qty-batch"><strong>${batchTotal} ${m.unitOfMeasure}</strong> for ${batchSize} units</span>
                  ${estValue ? `<span class="mat-cost">Est. Value: $${estValue}</span>` : ''}
                </div>
              </div>
            `;
            })
            .join('')}
        </div>
      </div>

      <div class="inspector-section">
        <h4 class="section-title">⚖️ Pace & Capacity Balance</h4>
        <p class="text-muted text-sm">
          ${
            sourceWc && targetWc && sourceWc.capacityPerHour > targetWc.capacityPerHour
              ? `⚠️ <strong>Pacing Mismatch:</strong> Upstream station ${sourceWc.code} (${sourceWc.capacityPerHour} pcs/h) produces faster than ${targetWc.code} (${targetWc.capacityPerHour} pcs/h). Work-in-progress (WIP) buffer recommended.`
              : sourceWc && targetWc && sourceWc.capacityPerHour < targetWc.capacityPerHour
              ? `⚠️ <strong>Starvation Risk:</strong> Upstream station ${sourceWc.code} (${sourceWc.capacityPerHour} pcs/h) is slower than downstream ${targetWc.code} (${targetWc.capacityPerHour} pcs/h). Downstream center may idle waiting for parts.`
              : `✅ <strong>Balanced Flow:</strong> Capacities are well matched between stations.`
          }
        </p>
      </div>
    `;
  }

  // ----------------------------------------------------
  // Sequence / Routing Tab View
  // ----------------------------------------------------
  function renderSequenceTable() {
    const tbody = document.getElementById('sequence-tbody');
    if (!tbody) return;

    if (graphNodes.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="text-center py-4">No production routing steps found.</td></tr>';
      return;
    }

    // Sort by stage ascending
    const sortedNodes = [...graphNodes].sort((a, b) => a.stage - b.stage);

    tbody.innerHTML = sortedNodes
      .map((node) => {
        const primaryBom = node.boms[0];

        // Format Inputs
        const inItems = [
          ...node.inboundWcTransfers.flatMap((t) =>
            t.materials.map((m) => `${m.itemCode} (${m.quantity * batchSize} ${m.unitOfMeasure})`)
          ),
          ...node.inboundExternalMaterials.map(
            (m) => `${m.itemCode} (${m.quantity * batchSize} ${m.unitOfMeasure})`
          ),
        ].join(', ') || 'None';

        // Format Sources
        const sources = [
          ...node.inboundWcTransfers.map((t) => t.fromWcCode),
          node.inboundExternalMaterials.length > 0 ? 'Warehouse' : '',
        ]
          .filter(Boolean)
          .join(', ') || 'Direct';

        // Format Outputs
        const outItems = [
          ...node.outboundWcTransfers.flatMap((t) =>
            t.materials.map((m) => `${m.itemCode} (${m.quantity * batchSize} ${m.unitOfMeasure})`)
          ),
          ...node.outboundTerminalMaterials.map(
            (m) => `${m.itemCode} (${m.quantity * batchSize} ${m.unitOfMeasure})`
          ),
        ].join(', ') || 'WIP';

        // Format Destinations
        const dests = [
          ...node.outboundWcTransfers.map((t) => t.toWcCode),
          node.outboundTerminalMaterials.length > 0 ? 'Finished Bay' : '',
        ]
          .filter(Boolean)
          .join(', ') || 'Next Stage';

        return `
          <tr class="${node.isBottleneck ? 'row-bottleneck' : ''}">
            <td><span class="stage-tag">Stage ${node.stage + 1}</span></td>
            <td>
              <strong>${node.wc.code}</strong>
              <div class="text-muted text-xs">${node.wc.name}</div>
            </td>
            <td><code>${primaryBom ? primaryBom.bomCode : 'N/A'}</code></td>
            <td><span class="text-sm">${inItems}</span></td>
            <td><span class="badge badge-subtle">${sources}</span></td>
            <td><span class="text-sm font-medium">${outItems}</span></td>
            <td><span class="badge badge-subtle">${dests}</span></td>
            <td>${node.wc.capacityPerHour} pcs/h</td>
            <td>
              <strong class="${node.isBottleneck ? 'text-danger' : 'text-primary'}">${node.simulatedHours} hrs</strong>
              ${node.isBottleneck ? '<br><small class="text-danger">Bottleneck</small>' : ''}
            </td>
          </tr>
        `;
      })
      .join('');
  }

  function renderCurrentView() {
    const graphContainer = document.getElementById('plan-graph-container')!;
    const seqContainer = document.getElementById('plan-sequence-container')!;
    const btnGraph = document.getElementById('btn-view-graph')!;
    const btnSeq = document.getElementById('btn-view-sequence')!;

    if (viewMode === 'graph') {
      graphContainer.style.display = 'block';
      seqContainer.style.display = 'none';
      btnGraph.className = 'btn btn-sm btn-primary active';
      btnSeq.className = 'btn btn-sm btn-outline';
      renderSVGGraph();
    } else {
      graphContainer.style.display = 'none';
      seqContainer.style.display = 'block';
      btnGraph.className = 'btn btn-sm btn-outline';
      btnSeq.className = 'btn btn-sm btn-primary active';
      renderSequenceTable();
    }
  }

  // ----------------------------------------------------
  // Event Bindings: Simulator, Filters, Zoom, Dragging
  // ----------------------------------------------------
  function initEvents() {
    // View Switcher
    document.getElementById('btn-view-graph')?.addEventListener('click', () => {
      viewMode = 'graph';
      renderCurrentView();
    });
    document.getElementById('btn-view-sequence')?.addEventListener('click', () => {
      viewMode = 'sequence';
      renderCurrentView();
    });

    // Product Filter
    document.getElementById('plan-filter-product')?.addEventListener('change', (e) => {
      selectedProductFilter = (e.target as HTMLSelectElement).value;
      selectedNodeId = null;
      selectedEdgeId = null;
      computeGraph();
      renderCurrentView();
    });

    // Batch Simulator Input
    const batchInput = document.getElementById('plan-batch-input') as HTMLInputElement;
    const updateBatch = (val: number) => {
      batchSize = Math.max(1, Math.min(1000, val));
      batchInput.value = batchSize.toString();

      // Update chips active state
      document.querySelectorAll('.batch-presets .btn-chip').forEach((btn) => {
        if (Number((btn as HTMLElement).dataset.batch) === batchSize) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });

      computeGraph();
      renderCurrentView();

      // Refresh inspector if open
      if (selectedNodeId) {
        const n = graphNodes.find((g) => g.id === selectedNodeId);
        if (n) renderNodeInspector(n);
      } else if (selectedEdgeId) {
        const ed = graphEdges.find((e) => e.id === selectedEdgeId);
        if (ed) renderEdgeInspector(ed);
      }
    };

    batchInput?.addEventListener('change', () => updateBatch(Number(batchInput.value) || 1));
    document.getElementById('batch-inc-btn')?.addEventListener('click', () => updateBatch(batchSize + 5));
    document.getElementById('batch-dec-btn')?.addEventListener('click', () => updateBatch(batchSize - 5));

    document.querySelectorAll('.batch-presets .btn-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = Number((btn as HTMLElement).dataset.batch);
        if (target) updateBatch(target);
      });
    });

    // Zoom & Pan Buttons
    document.getElementById('btn-zoom-in')?.addEventListener('click', () => {
      zoomLevel = Math.min(2.5, zoomLevel + 0.2);
      applyPanZoomTransform();
    });
    document.getElementById('btn-zoom-out')?.addEventListener('click', () => {
      zoomLevel = Math.max(0.4, zoomLevel - 0.2);
      applyPanZoomTransform();
    });
    document.getElementById('btn-zoom-reset')?.addEventListener('click', () => {
      zoomLevel = 1;
      panX = 40;
      panY = 40;
      applyPanZoomTransform();
    });
    document.getElementById('btn-zoom-fit')?.addEventListener('click', () => {
      if (graphNodes.length === 0) return;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      graphNodes.forEach((n) => {
        if (n.x < minX) minX = n.x;
        if (n.y < minY) minY = n.y;
        if (n.x + n.width > maxX) maxX = n.x + n.width;
        if (n.y + n.height > maxY) maxY = n.y + n.height;
      });

      const containerEl = document.getElementById('plan-graph-container')!;
      const availWidth = containerEl.clientWidth - 80;
      const availHeight = containerEl.clientHeight - 80;
      const contentWidth = maxX - minX;
      const contentHeight = maxY - minY;

      const scaleX = availWidth / contentWidth;
      const scaleY = availHeight / contentHeight;
      zoomLevel = Math.max(0.5, Math.min(1.2, Math.min(scaleX, scaleY)));

      panX = 40 - minX * zoomLevel;
      panY = 40 - minY * zoomLevel;
      applyPanZoomTransform();
    });

    // Mouse Wheel Zoom on SVG
    const svgEl = document.getElementById('production-graph-svg')!;
    svgEl.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      zoomLevel = Math.max(0.3, Math.min(2.5, zoomLevel * zoomFactor));
      applyPanZoomTransform();
    }, { passive: false });

    // Background Pan Event Listeners
    svgEl.addEventListener('mousedown', (e) => {
      if (e.button !== 0 || draggingNodeId) return;
      isPanning = true;
      startMouseX = e.clientX - panX;
      startMouseY = e.clientY - panY;
      svgEl.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (isPanning) {
        panX = e.clientX - startMouseX;
        panY = e.clientY - startMouseY;
        applyPanZoomTransform();
      } else if (draggingNodeId) {
        const node = graphNodes.find((n) => n.id === draggingNodeId);
        if (node) {
          node.x = (e.clientX - panX) / zoomLevel - dragOffset.x;
          node.y = (e.clientY - panY) / zoomLevel - dragOffset.y;
          renderSVGGraph();
        }
      }
    });

    window.addEventListener('mouseup', () => {
      if (isPanning) {
        isPanning = false;
        svgEl.style.cursor = 'grab';
      }
      if (draggingNodeId) {
        draggingNodeId = null;
      }
    });

    // Deselect when clicking SVG background
    document.getElementById('graph-bg-rect')?.addEventListener('click', () => {
      selectedNodeId = null;
      selectedEdgeId = null;
      renderSVGGraph();
      const placeholder = document.getElementById('inspector-placeholder');
      const content = document.getElementById('inspector-content');
      if (placeholder) placeholder.style.display = 'block';
      if (content) content.style.display = 'none';
    });
  }

  // Load and bootstrap
  await loadData();
  initEvents();
}


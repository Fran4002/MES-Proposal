export type InventoryCategory =
  | 'RAW_MATERIAL'
  | 'SUB_ASSEMBLY'
  | 'FINISHED_GOOD'
  | 'CONSUMABLE'
  | 'BY_PRODUCT';

export type InventoryStatus = 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED';

export interface InventoryItem {
  _id: string;
  itemCode: string;
  name: string;
  description?: string;
  category: InventoryCategory;
  unitOfMeasure: string;
  quantityOnHand: number;
  minStockLevel: number;
  unitCost: number;
  location?: string;
  status: InventoryStatus;
  isLowStock?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type WorkCenterType =
  | 'MACHINE'
  | 'MANUAL_ASSEMBLY'
  | 'QUALITY_CONTROL'
  | 'PACKAGING'
  | 'SURFACE_FINISH';

export type WorkCenterStatus = 'AVAILABLE' | 'RUNNING' | 'MAINTENANCE' | 'OFFLINE';

export interface WorkCenter {
  _id: string;
  code: string;
  name: string;
  description?: string;
  department: string;
  type: WorkCenterType;
  capacityPerHour: number;
  hourlyRate: number;
  status: WorkCenterStatus;
  currentJob?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BOMComponent {
  _id?: string;
  item: InventoryItem | string;
  quantity: number;
  unitOfMeasure?: string;
  scrapFactor?: number;
  notes?: string;
}

export interface BOMSecondaryOutput {
  _id?: string;
  item: InventoryItem | string;
  type: 'CO_PRODUCT' | 'BY_PRODUCT';
  quantity: number;
  unitOfMeasure?: string;
  costAllocationPercent?: number;
  notes?: string;
}

export interface BOM {
  _id: string;
  bomCode: string;
  name: string;
  description?: string;
  version: string;
  status: 'DRAFT' | 'ACTIVE' | 'OBSOLETE';
  primaryProduct: {
    item: InventoryItem | string;
    quantity: number;
    unitOfMeasure: string;
  };
  secondaryOutputs: BOMSecondaryOutput[];
  components: BOMComponent[];
  preferredWorkCenter?: WorkCenter | string | null;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  count?: number;
  message?: string;
  stats?: Record<string, number>;
}


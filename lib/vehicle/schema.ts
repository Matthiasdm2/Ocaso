// Vehicle schema definitions - placeholder implementation

export type VehicleType = 'cars' | 'motos' | 'bedrijfsvoertuigen' | 'campers';

export interface VehicleSchema {
  type: VehicleType;
  fields: Array<{
    id: string;
    name: string;
    type: 'string' | 'number' | 'boolean' | 'select';
    required?: boolean;
    options?: string[];
  }>;
  groups: Array<{
    id: string;
    title: string;
    fields: Array<{
      id: string;
      name: string;
      type: 'string' | 'number' | 'boolean' | 'select';
      required?: boolean;
      options?: string[];
    }>;
  }>;
}

export const vehicleSchemas: Record<VehicleType, VehicleSchema> = {
  cars: {
    type: 'cars',
    fields: [
      { id: 'make', name: 'make', type: 'string', required: true },
      { id: 'model', name: 'model', type: 'string', required: true },
      { id: 'year', name: 'year', type: 'number', required: true },
      { id: 'mileage', name: 'mileage', type: 'number' },
      { id: 'fuel_type', name: 'fuel_type', type: 'select', options: ['benzine', 'diesel', 'hybrid', 'electric'] },
    ],
    groups: [
      {
        id: 'basic',
        title: 'Basic Information',
        fields: [
          { id: 'make', name: 'make', type: 'string', required: true },
          { id: 'model', name: 'model', type: 'string', required: true },
          { id: 'year', name: 'year', type: 'number', required: true },
        ],
      },
    ],
  },
  motos: {
    type: 'motos',
    fields: [
      { id: 'make', name: 'make', type: 'string', required: true },
      { id: 'model', name: 'model', type: 'string', required: true },
      { id: 'year', name: 'year', type: 'number', required: true },
      { id: 'engine_size', name: 'engine_size', type: 'number' },
    ],
    groups: [
      {
        id: 'basic',
        title: 'Basic Information',
        fields: [
          { id: 'make', name: 'make', type: 'string', required: true },
          { id: 'model', name: 'model', type: 'string', required: true },
          { id: 'year', name: 'year', type: 'number', required: true },
        ],
      },
    ],
  },
  bedrijfsvoertuigen: {
    type: 'bedrijfsvoertuigen',
    fields: [
      { id: 'make', name: 'make', type: 'string', required: true },
      { id: 'model', name: 'model', type: 'string', required: true },
      { id: 'year', name: 'year', type: 'number', required: true },
      { id: 'load_capacity', name: 'load_capacity', type: 'number' },
    ],
    groups: [
      {
        id: 'basic',
        title: 'Basic Information',
        fields: [
          { id: 'make', name: 'make', type: 'string', required: true },
          { id: 'model', name: 'model', type: 'string', required: true },
          { id: 'year', name: 'year', type: 'number', required: true },
        ],
      },
    ],
  },
  campers: {
    type: 'campers',
    fields: [
      { id: 'make', name: 'make', type: 'string', required: true },
      { id: 'model', name: 'model', type: 'string', required: true },
      { id: 'year', name: 'year', type: 'number', required: true },
      { id: 'sleeping_capacity', name: 'sleeping_capacity', type: 'number' },
    ],
    groups: [
      {
        id: 'basic',
        title: 'Basic Information',
        fields: [
          { id: 'make', name: 'make', type: 'string', required: true },
          { id: 'model', name: 'model', type: 'string', required: true },
          { id: 'year', name: 'year', type: 'number', required: true },
        ],
      },
    ],
  },
};

export function getSchema(vehicleType: VehicleType): VehicleSchema {
  return vehicleSchemas[vehicleType];
}

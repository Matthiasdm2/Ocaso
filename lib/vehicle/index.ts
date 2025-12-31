/**
 * VEHICLE MODULE - INDEX
 * 
 * Central export point for all vehicle-related schemas and utilities.
 * Used throughout the application for:
 * - Posting forms (dynamic field rendering)
 * - Search filters (filter generation)
 * - Validation (client & server)
 * - Database operations
 * - API endpoints
 */

// Schema exports
export {
  getSchema, vehicleSchemas, type VehicleSchema, type VehicleType
} from './schema';

// Validation exports
export {
  cleanAndValidateData,
  getFieldErrorMessage,
  getFilterableFields,
  getSearchableFields,
  isFieldFilterable,
  isFieldSearchable,
  validateField,
  validateListing,
  validateRequiredFields,
  type ValidationError,
  type ValidationResult
} from './validation';

// Filter exports
export {
  buildDeterministicParams,
  buildVehicleFilterParams,
  buildVehicleFilters,
  parseVehicleFiltersFromParams,
  VEHICLE_FILTER_MAP,
  type VehicleFilterConfig
} from './filters';

// Posting actions exports
export {
  getVehicleListing,
  saveVehicleListing,
  transformVehicleData,
  validateVehiclePosting,
  type VehicleListingData,
  type VehiclePostingFormData
} from './posting';


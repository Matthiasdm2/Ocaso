// Placeholder vehicle functions for build compatibility
export type VehiclePostingFormData = {
  title: string;
  price: number;
  category_id: string;
  // Add other fields as needed
};

export async function saveVehicleListing(userId: string, data: VehiclePostingFormData, listingId?: string): Promise<{ success: boolean }> {
  // Placeholder implementation
  console.log('saveVehicleListing called with:', { userId, data, listingId });
  return { success: true };
}

export function validateVehiclePosting(): Record<string, string> | null {
  // Placeholder implementation - no validation errors
  return null;
}

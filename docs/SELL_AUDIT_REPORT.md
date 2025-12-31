# SELL AUDIT REPORT - Phase A Inventory

**Date**: December 31, 2024  
**Branch**: `fix/sell-end-to-end-stability-20241231`  
**Scope**: /sell end-to-end flow reliability audit

---

## A1) /SELL ENTRYPOINT & COMPONENT TREE

### Main Entry Point

- **File**: `app/sell/page.tsx` (1,082 lines)
- **Type**: Client-side Next.js App Router page component
- **Auth**: Required (checks `supabase.auth.getUser()`)

### Component Dependencies

- **CategorySelect**: `@/components/CategorySelect`
- **ConfirmModal**: `@/components/ConfirmModal`
- **ImagePreviewSlider**: `@/components/ImagePreviewSlider`
- **LocationSelect**: `@/components/LocationSelect`
- **PhotoUploader**: `@/components/PhotoUploader`
- **PreviewModal**: `@/components/PreviewModal`
- **ShippingFields**: `@/components/ShippingFields`
- **Toggle**: `@/components/Toggle`
- **VehicleDetailsSection**: `app/sell/components/VehicleDetailsSection.tsx`

### State Management

```typescript
// Core listing fields
const [title, setTitle] = useState("");
const [description, setDescription] = useState("");
const [price, setPrice] = useState("");
const [stock, setStock] = useState(1);
const [allowOffers, setAllowOffers] = useState(false);
const [state, setState] = useState("nieuw");
const [category, setCategory] = useState("");
const [subcategory, setSubcategory] = useState("");

// Images & upload
const [imageUrls, setImageUrls] = useState<string[]>([]);
const [mainIndex, setMainIndex] = useState(0);
const [uploading, setUploading] = useState(false);

// Shipping & payment
const [allowShipping, setAllowShipping] = useState(false);
const [shipping, setShipping] = useState({
  length: "",
  width: "",
  height: "",
  weight: "",
});
const [allowSecurePay, setAllowSecurePay] = useState(false);
const [bidding, setBidding] = useState({ min: "" });

// Vehicle details (conditional)
const [vehicleDetails, setVehicleDetails] = useState({});
```

---

## A2) API ROUTE CALLED ON SUBMIT

### Endpoint

- **Route**: `POST /api/listings`
- **File**: `app/api/listings/route.ts` (318 lines)
- **Runtime**: `nodejs`

### Request Flow

```typescript
// Client prepares payload
const safePayload = {
  // Basic listing fields...
  // Add vehicle details if category is vehicle and data is provided
  ...(categorySlug &&
    ["auto-motor", "bedrijfswagens", "camper-mobilhomes"].includes(
      categorySlug
    ) &&
    Object.keys(vehicleDetails).length > 0 && {
      vehicle_details: vehicleDetails,
    }),
};

// API call
const response = await fetch("/api/listings", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(safePayload),
});
```

### Auth Mechanism

- **Type**: Session-based authentication via Supabase
- **Server validation**: `await supabase.auth.getUser()`
- **RLS**: Enforced via Row Level Security policies

### Image Upload Flow

1. **Direct Upload to Supabase Storage**: Client uploads images directly to `listing-images` bucket
2. **Upload timing**: Images uploaded BEFORE listing creation via `handleFilesSelected()`
3. **Storage path**: `${userId}/${randomId()}.${ext}`
4. **Public URLs**: Generated via `supabase.storage.from(BUCKET_NAME).getPublicUrl(path)`

---

## A3) SUPABASE TABLES TOUCHED DURING /SELL

### Primary Tables

#### 1. `listings` (main table)

- **Purpose**: Core listing data
- **Key fields**: title, description, price, images[], seller_id, category_id, subcategory_id, status
- **Operations**: INSERT (create new listing)
- **RLS**: Owner can INSERT, authenticated read on active listings

#### 2. `listing_vehicle_details` (conditional)

- **Purpose**: Vehicle-specific metadata for vehicle categories
- **Key fields**: listing_id, year, mileage_km, body_type, condition, fuel_type, power_hp, transmission
- **Operations**: INSERT (if vehicle category detected)
- **Relationship**: 1:1 with listings, CASCADE DELETE
- **RLS**: Only listing owner can INSERT/UPDATE/DELETE

#### 3. `categories` (lookup)

- **Purpose**: Category validation and vehicle detection
- **Operations**: SELECT (to check if category slug is vehicle type)
- **Vehicle detection**: `slug IN ('auto-motor', 'bedrijfswagens', 'camper-mobilhomes')`

#### 4. `subcategories` (lookup - implicit)

- **Purpose**: Subcategory validation
- **Operations**: Likely SELECT for validation (not explicitly seen in code)

#### 5. `profiles` (user data)

- **Purpose**: User profile data for business account detection
- **Operations**: SELECT (to determine account_type, stripe_account_id, org_slug)
- **Business logic**: KYC status check for secure pay feature

### Storage Bucket

#### 1. `listing-images`

- **Purpose**: Image storage for listing photos
- **Operations**:
  - INSERT (direct client upload)
  - SELECT (public read via public URLs)
- **Path structure**: `${userId}/${randomId()}.${ext}`
- **Policies**:
  - Public read access
  - Authenticated upload only
  - User can only access own uploads

---

## A4) POTENTIAL FAILURE POINTS IDENTIFIED

### Race Conditions

1. **Image upload vs listing creation**: Images uploaded async before listing submit
2. **Double submit**: No client-side submit button disabling during API call
3. **Vehicle details validation**: Complex conditional logic based on category lookup

### Validation Issues

1. **Client-server mismatch**: Different validation rules on client vs server
2. **Vehicle category detection**: Relies on database lookup that could fail
3. **Missing transaction safety**: Vehicle details insert failure triggers listing deletion (rollback)

### Authentication & Authorization

1. **Session timeout**: No handling of expired auth during long form filling
2. **KYC check failure**: Secure pay validation could fail silently
3. **RLS policy failures**: Could cause cryptic database errors

### Storage Upload Failures

1. **Partial uploads**: No atomic guarantee that all images upload successfully
2. **Storage quota**: No handling of storage limits
3. **File size/type validation**: Basic validation but could miss edge cases

---

**Next Phase**: B - Error Catalog (instrument and reproduce failures)

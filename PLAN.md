# Plan: Area Map Preview + Service Zone System + Legacy zonesServed Removal

## Files Read & Verified (Nothing Assumed)

| File | What Was Confirmed |
|------|--------------------|
| `schema/area.schema.js` | GeoJSON Point centroid only — no polygon |
| `schema/zone.schema.js` | GeoJSON Polygon `boundary` field exists (optional) |
| `schema/kitchen.schema.js` | Both `areasServed[]` + `zonesServed[]` confirmed, index on both |
| `schema/systemConfig.schema.js` | `geofencing.enabled` defaults to `false` |
| `services/geofencing.service.js` | `findKitchensForLocation` — zero dependency on `zonesServed` |
| `services/config.service.js` | `isGeofencingEnabled()` reads DB config |
| `services/area.service.js` | `geoNearAreas` uses `$geoNear` on centroid, no polygon |
| `services/order-helpers.service.js` | `findKitchenForZone` still uses `zonesServed` (Phase 3 risk) |
| `src/area/area.controller.js` | `toApiArea()` normalizes `[lng,lat]` → `{latitude, longitude}` |
| `src/kitchen/kitchen.controller.js` | `getKitchensForZone` queries `zonesServed` directly (PUBLIC route) |
| `src/kitchen/kitchen.routes.js` | `/zone/:zoneId` is PUBLIC (no auth). All other routes confirmed. |
| `src/order/order.controller.js:214` | Legacy zone check only runs when geo is disabled |
| `src/customer/customer.controller.js:463` | Same dual-path pattern |
| `src/address/address.controller.js:188` | Same dual-path pattern |
| `index.route.js` | All route registrations confirmed, pattern for new service zone route |
| `package.json` (backend) | No turf.js or geo libraries — convex hull must be hand-written |
| Admin: `api.types.ts` | `Kitchen.areasServed?: Area[] | string[]`, `Area.coordinates?: {latitude,longitude}` |
| Admin: `AreaPickerModal.tsx` | Returns `NearbyArea[]` (no coordinates). Need `getAreasByIds()` for map. |
| Admin: `KitchenFormModal.tsx` | `serviceableAreas: string[]` validated, legacy pincode→area migration effect |
| Admin: `NavigationContext.tsx` | `ScreenName` union type, add `'ServiceZones'` after `'Banners'` |
| Admin: `rbac.ts` | `ALL_MENU_ITEMS` structure, last id is `'24'`, use `'25'` for ServiceZones |
| Admin: `App.tsx` | `case 'Zones'` pattern confirmed for adding new screens |
| Admin: `package.json` | No `react-native-maps` — must install |
| Admin: `AndroidManifest.xml` | No Google Maps meta-data — must add |
| Admin: `strings.xml` | No Maps API key — must add |
| Consumer: `HomeScreen.tsx:338` | GPS flow: `getZoneByPincode` → `getKitchensForZone` (uses zonesServed!) |
| Consumer: `CartScreen.tsx:664` | Order creation sends `deliveryAddressId` only — NOT `zoneId` ✅ |
| Consumer: `CouponSheet.tsx:149` | Uses `zoneId` (Zone document ID) — unrelated to `kitchen.zonesServed` ✅ |

---

## Context

The platform has fully pivoted from pincode/zone-based kitchen serviceability to area-based serviceability (`areasServed[]`). Areas are localities/neighborhoods (e.g., "Tilak Nagar") with a GeoJSON centroid point and pincodes list stored in MongoDB.

**Current state:**
- Admin selects areas via `AreaPickerModal` (radius search from kitchen coordinates) → saved as `kitchen.areasServed[]`
- No visual map preview exists — admin has no spatial sense of what's covered
- Legacy `kitchen.zonesServed[]` (pincode-based) still exists in 73 backend locations and 10 admin app files

**Goal:**
1. **Phase 1** ✅ COMPLETE — Show selected areas on a map inside the kitchen form/profile
2. **Phase 2** — Service Zone system: named groups of areas with a computed polygon boundary
3. **Phase 3** — Remove `zonesServed` entirely once areasServed is proven complete

---

## Phase 1: Area Map Preview ✅ COMPLETE

### What was built
After admin selects areas in `AreaPickerModal`, a map appears showing the kitchen pin + a circle marker (r=600m) for each selected area centroid.

### Files changed

**Admin App:**
- `android/app/src/main/res/values/strings.xml` — added `google_maps_key`
- `android/app/src/main/AndroidManifest.xml` — added `com.google.android.geo.API_KEY` meta-data
- `src/modules/kitchens/components/AreaMapPreview.tsx` ← **NEW** — MapView component
- `src/modules/kitchens/components/KitchenFormModal.tsx` — added `areaMapAreas` state, fetches full area coords via `getAreasByIds()` after picker save, renders `AreaMapPreview`
- `src/modules/kitchens/screens/KitchenProfileScreen.tsx` — renders `AreaMapPreview` below areas list
- `src/modules/kitchens/screens/KitchenDetailScreen.tsx` — renders `AreaMapPreview` below areas list

**Backend (`D:\AIB Innovations\Tiffsy\New Backend\backend`):**
- `src/kitchen/kitchen.controller.js` — added `coordinates` to `areasServed` populate projection in `getKitchenById` and `updateServiceableAreas` (was missing, causing 0 areas on map)

### Key implementation note
`AreaMapPreview.getAreaCoords()` handles two coordinate formats:
- Normalized `{ latitude, longitude }` — from `GET /api/areas` endpoints via `toApiArea()`
- Raw GeoJSON `{ type: "Point", coordinates: [lng, lat] }` — from Mongoose populate inside kitchen docs

### Rollback
Remove `AreaMapPreview` import + render in 3 files. No DB changes. 5-minute revert.

---

## Phase 2: Service Zone System

### Concept
A **ServiceZone** = a named, reusable delivery zone made of a group of selected areas. Its polygon boundary is auto-computed as the convex hull of the selected area centroids. Admin creates zones first, then assigns a zone to a kitchen. Kitchen profile shows the zone polygon on a map.

### 2A: Backend

#### New file: `schema/serviceZone.schema.js`
```js
{
  name: String (required),
  city: String (required),
  description: String (optional),
  areaIds: [ObjectId ref 'Area'] (required, min 1),
  boundary: {             // GeoJSON Polygon — convex hull of area centroids
    type: { type: String, enum: ['Polygon'] },
    coordinates: [[[Number]]]
  },
  status: { type: String, enum: ['ACTIVE','INACTIVE'], default: 'ACTIVE' },
  createdBy: ObjectId ref 'User'
}
// Indexes: boundary 2dsphere (sparse), city, status
```

#### Convex Hull utility: `utils/convexHull.js`
Implement Jarvis march (gift wrapping) in pure JS — no new npm dependency.
Input: array of `[lng, lat]` points. Output: GeoJSON Polygon coordinates array (closed ring).

#### New module: `src/servicezone/`
- `serviceZone.controller.js`
- `serviceZone.routes.js`
- `serviceZone.validation.js`

**Endpoints:**
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/service-zones/preview-boundary` | Compute polygon from areaIds (no save) |
| POST | `/api/service-zones` | Create zone (name, city, areaIds) |
| GET | `/api/service-zones` | List zones (paginated, filter by city/status) |
| GET | `/api/service-zones/:id` | Get zone with populated areas |
| PUT | `/api/service-zones/:id` | Update zone |
| DELETE | `/api/service-zones/:id` | Delete zone (block if kitchens use it) |

**`preview-boundary` logic:**
1. Fetch area documents by areaIds → extract `coordinates.coordinates` ([lng, lat] per area)
2. Run convexHull() → returns GeoJSON Polygon
3. Return polygon coordinates (do not save)

#### Kitchen schema addition (`schema/kitchen.schema.js`)
```js
serviceZoneIds: {
  type: [mongoose.Schema.Types.ObjectId],
  ref: 'ServiceZone',
  default: [],
}
```
Add index: `kitchenSchema.index({ serviceZoneIds: 1 })`

#### New kitchen endpoint
`PATCH /api/kitchens/:id/service-zones` — body: `{ serviceZoneIds: string[] }` — updates assignment

#### Route registration (`index.route.js`)
```js
import serviceZoneRoutes from "./src/servicezone/serviceZone.routes.js";
router.use("/service-zones", serviceZoneRoutes);
```
Add kitchen service-zones patch route in `kitchen.routes.js`

### 2B: Admin App

#### New type (`src/types/api.types.ts`)
```ts
export interface ServiceZone {
  _id: string;
  name: string;
  city: string;
  description?: string;
  areaIds: Area[] | string[];
  boundary?: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
}
```
Add `serviceZoneIds?: ServiceZone[] | string[]` to `Kitchen` interface.

#### New service: `src/services/serviceZone.service.ts`
Methods: `getServiceZones()`, `getServiceZoneById()`, `createServiceZone()`, `updateServiceZone()`, `deleteServiceZone()`, `previewBoundary(areaIds)`, `assignToKitchen(kitchenId, zoneIds)`

#### New component: `src/modules/kitchens/components/ServiceZoneMapView.tsx`
Props: `boundary: GeoJSON Polygon coords`, `areas: Area[]`, optional `kitchenCoords`
- Renders `<Polygon>` with the boundary coordinates
- Renders kitchen marker + area circle markers inside
- Reuses `AreaMapPreview` logic for the markers layer

#### New component: `src/modules/kitchens/components/ServiceZoneFormModal.tsx`
Flow:
1. Input zone name + city
2. Opens `AreaPickerModal` (reuse existing) to select areas
3. On area save → call `serviceZoneService.previewBoundary(areaIds)` → renders `ServiceZoneMapView` with the polygon preview
4. Confirm → `createServiceZone({ name, city, areaIds })`

#### New screen: `src/modules/kitchens/screens/ServiceZonesScreen.tsx`
- List of service zones as cards (name, city, area count, status badge)
- FAB or header button → opens `ServiceZoneFormModal`
- Tap zone card → shows `ServiceZoneMapView` full-screen + "Assign to Kitchen" option

#### Kitchen form/profile updates
- `KitchenFormModal.tsx` — add "Service Zone" section (optional): zone picker dropdown → on select, shows `ServiceZoneMapView` inline
- `KitchenProfileScreen.tsx` — if `serviceZoneIds` populated, show `ServiceZoneMapView` in a card
- `src/services/kitchen.service.ts` — update populate query string from `?populate=zonesServed,areasServed` to `?populate=zonesServed,areasServed,serviceZoneIds`

#### Navigation wiring (confirmed patterns from actual code)

**`src/context/NavigationContext.tsx`** — add `'ServiceZones'` to `ScreenName` union (after `'Banners'`):
```ts
| 'Banners'
| 'ServiceZones';
```

**`src/utils/rbac.ts`** `ALL_MENU_ITEMS` — add after id `'24'` (Banners), in `'Kitchen'` group:
```ts
{
  id: '25',
  label: 'Service Zones',
  icon: 'map',
  screen: 'ServiceZones',
  roles: ['ADMIN'],
  group: 'Kitchen',
},
```

**`App.tsx`** MainContent switch — follow `case 'Zones'` pattern:
```tsx
case 'ServiceZones':
  return (
    <PermissionGuard requiredRoles={['ADMIN']} screenName="ServiceZones" onMenuPress={onMenuPress}>
      <ServiceZonesScreen onMenuPress={onMenuPress} />
    </PermissionGuard>
  );
```

**Rollback for Phase 2**: Comment out `router.use("/service-zones", serviceZoneRoutes)` in `index.route.js`. Admin app gracefully hides zone section when API returns 404. Existing kitchen data untouched.

---

## Phase 3: Remove Legacy `zonesServed` (Separate PR — after Phase 2 is live)

**Do not implement this in Phase 1 or 2. This is a separate controlled migration.**

### Mandatory pre-check before starting
```js
// Run in MongoDB shell:
db.systemconfigs.findOne({ key: "geofencing" })
// Must show: { value: { enabled: true } }
// If enabled: false → DO NOT proceed. Enable geofencing, monitor 1 week first.
```

### Safe removal sequence (must follow this order)

**Step 0** — Update `GET /api/kitchens/zone/:zoneId` (PUBLIC, consumer GPS flow):
- Replace `Kitchen.find({ zonesServed: zoneId })` with area-based lookup:
  1. `Zone.findById(zoneId)` → get `zone.pincode`
  2. `Area.find({ pincodes: zone.pincode })` → get areaIds
  3. `Kitchen.find({ areasServed: { $in: areaIds } })`
- Deploy + verify consumer GPS still finds kitchens — ZERO risk, new code path

**Step 1** — Enable geofencing in production, monitor 2 weeks (check logs for "Legacy zone-based check" → should be 0)

**Step 2** — Fix subscription auto-order flow (`services/order-helpers.service.js` lines 320, 343-344, 352):
- Replace `findKitchenForZone(zoneId)` with `findKitchenForArea(areaId)`
- Deploy + monitor auto-order success rate 1 week

**Step 3** — Fix kitchen registration (`src/auth/auth.controller.js` lines 833-1843):
- Remove pincode → zone resolution on kitchen creation

**Step 4** — Remove fallback `else` branches in order/customer/address controllers

**Step 5** — Remove schema field + methods + index from `schema/kitchen.schema.js`

**Step 6** — MongoDB cleanup (maintenance window, NOT 12pm-2pm / 7pm-9pm IST):
```js
db.kitchens.updateMany({}, { $unset: { zonesServed: 1 } })
```

### Backend files with zonesServed references (73 total)
- `schema/kitchen.schema.js` — field definition, index, `servesZone()`, `findActiveByZone()`, `findPartnerByZone()`
- `src/kitchen/kitchen.controller.js` — ~12 references
- `src/auth/auth.controller.js` — ~6 references
- `src/order/order.controller.js:215` — legacy fallback path
- `src/address/address.controller.js:193, 421, 496`
- `src/customer/customer.controller.js:468, 612, 619, 750`
- `src/zone/zone.controller.js:101, 149, 225, 353`
- `src/admin/admin.controller.js:1251`
- `src/scheduling/scheduling.controller.js:1219, 1265`
- `services/order-helpers.service.js:320, 343-344, 352`
- `services/zone-resolution.service.js` — may be removable entirely

### Admin App files to clean up (10 total)
- `src/types/api.types.ts` — remove `zonesServed` from Kitchen interface
- `src/services/kitchen.service.ts` — remove `zonesServed` from populate string
- `src/modules/kitchens/screens/KitchenProfileScreen.tsx` — remove legacy fallback (lines 155-159, 746-765)
- `src/modules/kitchens/screens/KitchenDetailScreen.tsx` — remove legacy fallback (lines 244-249, 413-447)
- `src/modules/kitchens/components/KitchenFormModal.tsx` — remove zonesServed reverse-map effect (lines 188-223)
- `src/modules/kitchens/components/KitchenCard.tsx` — remove fallback in `getCoverageCount()` (lines 54-62)
- `src/modules/kitchens/components/KitchenDetailModal.tsx` — remove fallback (lines 193-202)
- `src/modules/kitchens/components/PendingKitchenCard.tsx` — remove fallback (lines 122-131)
- `src/modules/kitchens/screens/KitchensManagementScreen.tsx` — remove fallback
- `src/services/kitchen-staff.service.ts` — remove `zonesServed?: string[]`

**Never do all 73 removals in one commit.** Split across Steps 0-6 above.

---

## Risk Analysis

### Phase 1 Risks
| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| `react-native-maps` native build fails | App won't build | Medium | Revert `package.json` + `AndroidManifest.xml` — 2-line revert |
| Google Maps key missing Maps SDK | Map shows blank | Low | App stays functional, just no map |
| Areas lack coordinates in DB | Map preview incomplete | Medium | `getAreaCoords()` returns null → area silently skipped |
| Map component crashes | KitchenFormModal unusable | Low | Wrap in React ErrorBoundary |

### Phase 2 Risks
| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| ServiceZone endpoints have a bug | Zone screen broken | Medium | Comment out route in `index.route.js` — existing data untouched |
| `serviceZoneIds` field causes save errors | Kitchen update fails | Low | Field is optional, default `[]` — no migration needed |
| Convex hull wrong (< 3 areas) | Preview crashes | Medium | Guard: enforce min 3 areas on frontend |
| Kitchen assigned to deleted zone | Profile shows missing data | Low | Delete endpoint returns 400 if kitchens reference the zone |

### Phase 3 Risks (CRITICAL)
- If geofencing is off in production, removing zonesServed breaks ALL order placement
- Subscription auto-orders fail silently if `findKitchenForZone` removed before Step 2
- Consumer GPS flow breaks if Step 0 not done first

### What cannot break (safe zones)
- All existing `/api/areas/*` endpoints — untouched in all phases
- Customer order placement (primary geo path already bypasses zonesServed)
- Kitchen menu, batch management, driver assignment

---

## Verification Checklist

### Phase 1 ✅
- [x] Build runs on Android
- [ ] KitchenFormModal → select areas → map shows circles + kitchen pin
- [ ] KitchenProfileScreen → "Areas Served" section shows map
- [ ] KitchenDetailScreen → map preview visible
- [ ] Existing area save flow unchanged

### Phase 2
- [ ] Navigate to Service Zones screen (sidebar)
- [ ] Create zone with 5-6 areas → polygon preview renders on map
- [ ] Save → appears in zone list
- [ ] Assign zone to kitchen → kitchen profile shows polygon map
- [ ] `GET /api/service-zones/:id` → `boundary` polygon populated
- [ ] `DELETE` zone assigned to kitchen → returns 400

### Phase 3
- [ ] `db.systemconfigs.findOne({ key: "geofencing" })` shows `enabled: true`
- [ ] Consumer GPS flow finds kitchens via areasServed
- [ ] `db.kitchens.find({ zonesServed: { $exists: true, $ne: [] } })` → empty

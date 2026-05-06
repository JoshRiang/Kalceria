# Features: Users Map & Live Location Tracking

Real-time location tracking dan community visualization menggunakan Google Maps.

---

## 🗺️ Map Overview

**Users Map** adalah fitur yang menampilkan lokasi semua Kalcerians secara real-time pada peta. Users dapat:

- Melihat lokasi pengguna lain (kecamatan level, untuk privacy)
- Melihat mini-events (bubble dialogs pada map)
- Berkontribusi dengan broadcast status mereka sendiri
- Kontak user lain via WhatsApp/Instagram/Facebook

---

## 📍 Location Tracking System

### Architecture

```
┌─────────────────────────────────────┐
│ Frontend (Next.js + Google Maps)    │
│  - Display user markers on map      │
│  - Show mini-events bubbles         │
│  - Handle zoom/rotate/pan           │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│ Backend (Node.js + Express)         │
│  - Live location API endpoints      │
│  - Validate session tokens          │
│  - Rate limiting                    │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│ Wide Column Store (Redis)           │
│  - Live location entries            │
│  - Polling counters                 │
│  - TTL-based expiry                 │
└─────────────────────────────────────┘
```

### User Registration for Map

When user **enables location on profile**:

1. Set `User.allowLiveLocation = true`
2. Set `User.district` (from domicile, privacy mask)
3. Start polling location from device

### Location Data Storage (Redis)

```
Redis Key: live:user:{userId}

Value Schema:
{
  userId: "user123",
  lat: -6.2088,
  lng: 106.8456,
  district: "Jakarta Selatan",
  timestamp: 1715000000,
  pollingCount: 1,
  isStale: false
}
```

---

## 🔄 Polling Mechanism (5x Logic)

### Memory Optimization

**Problem**: Live location polls every 1 minute = memory bloat

**Solution**: 5x polling with rolling data management

```
Timeline:
┌─────────────────────────────────────────────────────┐
│ Poll 1: lat=-6.2088, lng=106.8456 | Count=1        │ (Keep)
│ Poll 2: lat=-6.2089, lng=106.8457 | Count=2        │ (Keep)
│ Poll 3: lat=-6.2088, lng=106.8456 | Count=3        │ (Same as #1, keep)
│ Poll 4: lat=-6.2090, lng=106.8458 | Count=4        │ (Keep)
│ Poll 5: lat=-6.2091, lng=106.8459 | Count=5        │ (TRIGGER)
└─────────────────────────────────────────────────────┘
                      ↓
          [COUNT REACHED 5 & NEW LOCATION]
                      ↓
         [DELETE OLD DATA, STORE ONLY LATEST]
                      ↓
         [RESET pollingCount = 0]
```

### Backend Logic

```javascript
// Pseudo-code: Update live location

async function updateLiveLocation(userId, lat, lng) {
  const current = await redis.get(`live:user:${userId}`);

  if (!current) {
    // First poll
    await redis.setex(`live:user:${userId}`, 30 * 60, {
      lat,
      lng,
      timestamp: Date.now(),
      pollingCount: 1,
      isStale: false,
    });
    return;
  }

  const pollingCount = current.pollingCount + 1;
  const newLocation = lat !== current.lat || lng !== current.lng;

  if (pollingCount < 5) {
    // Keep accumulating
    current.pollingCount = pollingCount;
    await redis.setex(`live:user:${userId}`, 30 * 60, current);
  } else if (pollingCount === 5) {
    if (newLocation) {
      // New location after 5 polls: Delete old, store new
      await redis.setex(`live:user:${userId}`, 30 * 60, {
        lat,
        lng,
        timestamp: Date.now(),
        pollingCount: 0,
        isStale: false,
      });
    } else {
      // Same location for 5 polls: Mark stale, will delete next poll
      current.isStale = true;
      await redis.setex(`live:user:${userId}`, 30 * 60, current);
    }
  }
}
```

---

## 🎯 Frontend: Google Maps Integration

### Map Component Features

**Interactive Controls**:

- 🔍 Zoom in/out
- 🔄 Rotate left/right
- 📍 Pan (drag)
- 🎯 Center on current user

**Markers**:

- User markers with profile photo
- Mini-event bubbles (with inner circle + plus sign)
- Color-coded by district or status

**On Click User Marker**:

```
1. Show popup with:
   - Profile photo
   - Username
   - District (privacy-masked)
2. Options:
   - View profile
   - Contact (WhatsApp/Instagram/Facebook links)
   - Block/Report
```

**On Click Mini-Event Bubble**:

```
1. Show popup with:
   - Mini-event title
   - User who posted
   - Message/description
   - "Join" or "View Details" button
```

---

## 💬 Contact Me Feature

### Social Media Integration

User can optionally add social media handles during registration:

```
Optional Fields:
- whatsapp: "+62812xxxxxxxx" (direct link)
- instagram: "@username" (link to profile)
- facebook: "facebook.com/profile.php?id=..."
```

### Usage

When user clicks another user marker:

```
If Contact Me is set:
  ├─ WhatsApp: Opens wa.me/{phone}
  ├─ Instagram: Opens instagram.com/{username}
  └─ Facebook: Opens facebook link

If Contact Me NOT set (NULL):
  └─ Show: "User hasn't set contact info"
```

### Privacy

- Contact fields are **optional** (nullable)
- If not provided → display as "Contact unavailable"
- Users can update contact info anytime

---

## 📍 Mini Events (User Broadcasts)

### Mini Event Bubble UI

On the map, each user can have ONE active mini-event:

```
┌─────────────────────┐
│   ▯  ●              │
│   (small circle     │
│    inner circle)    │
│      [+]            │
│    (plus sign)      │
└─────────────────────┘

When clicked:
  ┌──────────────────────────────┐
  │ John Doe's Mini Event        │
  ├──────────────────────────────┤
  │ "Going to meet up at Bintaro" │
  │ Posted: 2 hours ago          │
  │ Expires in: 22 hours         │
  └──────────────────────────────┘
```

### Mini Event Data

```prisma
model MiniEvent {
  id         String   @id
  userId     String   @unique  // ONE per user
  title      String
  description String
  lat        Float
  lng        Float
  expiresAt  DateTime // 24 hours from creation
  isActive   Boolean
}
```

### Mini Event Lifecycle

```
1. User creates mini-event from profile or map
2. Backend generates unique bubble on map
3. TTL set to 24 hours
4. After 24 hours: Auto-delete

Manual actions:
- User can DELETE early (expiresAt = 0)
- User can UPDATE (expiresAt keeps running)
```

---

## 📊 UserBroadcast (Status Updates)

One user = One active broadcast at a time

```prisma
model UserBroadcast {
  id        String   @unique
  userId    String   @unique  // ONE per user (constraint)
  message   String
  expiresAt DateTime
  isActive  Boolean
}
```

### Status Display

**On map view**:

- Show user marker + broadcast message in popup
- If no broadcast: Show "Add status"

**Backend endpoint**: `GET /api/broadcasts/:userId`

```json
{
  "userId": "user123",
  "message": "Heading to Semarang for automotive meet!",
  "expiresAt": "2026-05-08T10:30:00Z",
  "district": "Jakarta Selatan"
}
```

---

## 🔐 Location Privacy & Security

### Privacy Levels

```
Level 1: EXACT (Disabled)
  - Location NOT shared
  - User appears as "Offline"

Level 2: DISTRICT (Enabled - Default)
  - Only show district: "Jakarta Selatan"
  - Don't show exact lat/lng to other users
  - Backend stores full coordinates
  - Frontend rounds to district center

Level 3: HIDDEN INACTIVE (TTL)
  - If no location update for 30 mins
  - Mark as "Offline"
  - Remove from map display
```

### Security Measures

- ✅ Require login to enable location
- ✅ Encrypt lat/lng during transmission (HTTPS)
- ✅ Rate limit location updates (1 update per 30s per user)
- ✅ Validate session token before accepting location data
- ✅ Remove data after TTL expires

---

## 📡 API Endpoints

### Update Location

```
POST /api/location/update
Authorization: Bearer {token}
Body: {
  lat: -6.2088,
  lng: 106.8456
}

Response:
{
  success: true,
  message: "Location updated"
}
```

### Get Nearby Users

```
GET /api/location/nearby?lat=-6.2&lng=106.8&radius=50

Response:
[
  {
    userId: "user123",
    username: "john_doe",
    lat: -6.2088,
    lng: 106.8456,
    district: "Jakarta Selatan",
    profilePhoto: "url",
    hasContact: true  // Has WhatsApp/Instagram/Facebook
  },
  ...
]
```

### Get Mini Events

```
GET /api/mini-events/active

Response:
[
  {
    id: "event123",
    userId: "user123",
    title: "Going to Bintaro",
    lat: -6.2088,
    lng: 106.8456,
    expiresAt: "2026-05-08T10:30:00Z"
  },
  ...
]
```

---

## 🚀 Frontend Features (Next.js)

```typescript
// Components needed:
- GoogleMapComponent
  - Load map with user markers
  - Handle marker clusters (if many users)
  - Zoom/pan/rotate controls

- UserMarkerPopup
  - Show user info, district, contact buttons

- MiniEventBubble
  - Show mini-event title, description, expiry

- ContactMeModal
  - WhatsApp/Instagram/Facebook links

- LocationPermissionPrompt
  - Request GPS access on first visit
  - Store preference in localStorage + backend
```

---

## 📊 Performance Considerations

- **Marker clustering**: Group users by zoom level (Google Maps library)
- **Data refresh**: Poll every 5 seconds (frontend), update from Redis (backend)
- **Memory**: 5x polling logic ensures minimal Redis footprint
- **Caching**: Broadcast data cached for 1 minute on frontend

---

## 🔄 Live Telemetry Reverse Polling

**Concept**: Backend initiates connection to client for real-time updates

```
NOT IMPLEMENTED YET (Future feature)

Option 1: WebSocket
- Persistent connection
- Real-time updates
- Better for continuous streams

Option 2: Server-Sent Events (SSE)
- Simpler than WebSocket
- Browser-native support
- Good for broadcast data

Option 3: Polling (Current approach)
- Simple HTTP requests
- No persistent connection
- Works with all networks
```

---

## 🚀 Future Enhancements

- [ ] Heatmap of user concentrations
- [ ] Events/locations of interest on map
- [ ] Friend list with persistent connection tracking
- [ ] Notification when friends are nearby
- [ ] Custom broadcast templates (with images)
- [ ] View history of past broadcasts
- [ ] Advanced privacy controls (block users from seeing you)

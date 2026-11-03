// mockMiniEvents.js
// 12 distinct events across 4 mini event categories with realistic Kalcerian declarers and distinct normalized media

export const INITIAL_MOCK_MINI_EVENTS = [
  // ─── CAFE MEETING (3 Events) ───────────────────────────────────────────────
  {
    id: "mini_cafe_1",
    title: "Morning Espresso Catchup",
    description: "Morning caffeine hit and route planning before heading to BSD loop.",
    location: "Kopi Toko Djawa, Bintaro Sektor 9, Tangerang Selatan",
    category: "cafe",
    mediaUrl: "/media/gifs/event_cafe_1.mp4",
    mediaUrls: ["/media/gifs/event_cafe_1.mp4", "/media/gifs/event_cafe_2.mp4"],
    lat: -6.2735,
    lng: 106.7110,
    isActive: true,
    expiresAt: new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString(),
    creator: {
      id: "mock_ahmad",
      name: "Ahmad Bintaro",
      nickname: "Ahmad",
      profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ahmad",
      broadcast: { message: "Riding around Sector 9!", createdAt: new Date().toISOString() },
      coverType: "video",
      coverImage: "/media/gifs/event_cafe_1.mp4",
      socialPlatform: null,
      socialLink: null,
      instagram: null,
      whatsapp: null,
      phone: null,
      reason: "Cruising Bintaro streets, keeping engine tuning sharp and clean runs."
    }
  },
  {
    id: "mini_cafe_2",
    title: "Sunset Coffee & Chills",
    description: "Iced Latte session at Sector 7 parkside cafe. All car enthusiasts welcome.",
    location: "Bintaro Loop Parkside Cafe, Sektor 7, Tangerang Selatan",
    category: "cafe",
    mediaUrl: "/media/gifs/event_cafe_2.mp4",
    lat: -6.2810,
    lng: 106.7225,
    isActive: true,
    expiresAt: new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString(),
    creator: {
      id: "mock_rei",
      name: "Rei Nathan",
      nickname: "Rei",
      profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rei",
      broadcast: { message: "Coffee & route check at FM", createdAt: new Date().toISOString() }
    }
  },
  {
    id: "mini_cafe_3",
    title: "V6 Roaster & Filter Brew",
    description: "Pour over tasting and casual Sunday talk with the crew.",
    location: "Tanamera Coffee, Bintaro Jaya, Tangerang Selatan",
    category: "cafe",
    mediaUrl: "/media/gifs/event_cafe_3.mp4",
    lat: -6.2680,
    lng: 106.7085,
    isActive: true,
    expiresAt: new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString(),
    creator: {
      id: "mock_josh",
      name: "Josh Riang",
      nickname: "Josh",
      profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Josh"
    }
  },

  // ─── SOMETHING SPECIAL (3 Events) ──────────────────────────────────────────
  {
    id: "mini_spec_1",
    title: "Sunday Morning Fast Run",
    description: "Early morning spirited highway convoy to Karawaci circuit loop.",
    location: "Pondok Ranji Fast Loop, Tangerang Selatan",
    category: "special",
    mediaUrl: "/media/gifs/event_spec_1.mp4",
    mediaUrls: ["/media/gifs/event_spec_1.mp4", "/media/gifs/event_spec_2.mp4", "/media/gifs/event_spec_3.mp4"],
    lat: -6.2790,
    lng: 106.7160,
    isActive: true,
    expiresAt: new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString(),
    creator: {
      id: "mock_alpha",
      name: "Kalcerian Alpha",
      nickname: "Alpha",
      profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alpha",
      broadcast: { message: "Highway run starts in 30 mins!", createdAt: new Date().toISOString() }
    }
  },
  {
    id: "mini_spec_2",
    title: "Trackday Rollout Prep",
    description: "Alignment check and tire pressure setup before Sentul session.",
    location: "Sentul Circuit Staging Point, Tangerang Selatan",
    category: "special",
    mediaUrl: "/media/gifs/event_spec_2.mp4",
    lat: -6.2650,
    lng: 106.7190,
    isActive: true,
    expiresAt: new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString(),
    creator: {
      id: "mock_ghost",
      name: "Ghost Rider",
      nickname: "Ghost",
      profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ghost"
    }
  },
  {
    id: "mini_spec_3",
    title: "Midnight Garage Reveal",
    description: "Secret widebody build unveiling with the core engineering circle.",
    location: "Midnight Garage HQ, Pondok Pucung, Tangerang Selatan",
    category: "special",
    mediaUrl: "/media/gifs/event_spec_3.mp4",
    lat: -6.2855,
    lng: 106.7060,
    isActive: true,
    expiresAt: new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString(),
    creator: {
      id: "mock_otniel",
      name: "Otniel Kevin",
      nickname: "Otniel",
      profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Otniel"
    }
  },

  // ─── EAT TOGETHER (3 Events) ───────────────────────────────────────────────
  {
    id: "mini_eat_1",
    title: "Late Night Sate & Tongseng",
    description: "Post-cruise street food feast near Sector 7 strip.",
    location: "Taman Jajan Sektor 7, Bintaro, Tangerang Selatan",
    category: "eat",
    mediaUrl: "/media/gifs/event_eat_1.mp4",
    mediaUrls: ["/media/gifs/event_eat_1.mp4", "/media/gifs/event_eat_2.mp4"],
    lat: -6.2710,
    lng: 106.7145,
    isActive: true,
    expiresAt: new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString(),
    creator: {
      id: "mock_coki",
      name: "Coki",
      nickname: "Coki",
      profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Coki",
      broadcast: { message: "Post-cruise street food feast near Sector 7 strip.", createdAt: new Date().toISOString() }
    }
  },
  {
    id: "mini_eat_2",
    title: "Dimsum Brunch Gathering",
    description: "Warm dimsum feast and parking lot lineup at Bintaro Loop.",
    location: "Plaza Bintaro Jaya, Pondok Aren, Tangerang Selatan",
    category: "eat",
    mediaUrl: "/media/gifs/event_eat_2.mp4",
    lat: -6.2760,
    lng: 106.7250,
    isActive: true,
    expiresAt: new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString(),
    creator: {
      id: "mock_bonita",
      name: "Bonita Bon",
      nickname: "Bonita",
      profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bonita",
      broadcast: { message: "Dimsum spot is full, parking outside", createdAt: new Date().toISOString() }
    }
  },
  {
    id: "mini_eat_3",
    title: "Smoked Brisket Dinner",
    description: "BBQ platter sharing and dyno talk with the turbos family.",
    location: "Fresh Market Bintaro Sektor 7, Tangerang Selatan",
    category: "eat",
    mediaUrl: "/media/gifs/event_eat_3.mp4",
    lat: -6.2620,
    lng: 106.7120,
    isActive: true,
    expiresAt: new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString(),
    creator: {
      id: "mock_dinda",
      name: "Dinda Laras",
      nickname: "Dinda",
      profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Dinda"
    }
  },

  // ─── DISCUSS MORE (3 Events) ───────────────────────────────────────────────
  {
    id: "mini_disc_1",
    title: "ECU Tuning & Map Strategy",
    description: "In-depth technical breakdown of fuel trims, ignition timing, and boost curves.",
    location: "Bintaro Autocenter, Sektor 9, Tangerang Selatan",
    category: "discuss",
    mediaUrl: "/media/gifs/event_disc_1.mp4",
    mediaUrls: ["/media/gifs/event_disc_1.mp4", "/media/gifs/event_disc_2.mp4"],
    lat: -6.2745,
    lng: 106.7180,
    isActive: true,
    expiresAt: new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString(),
    creator: {
      id: "mock_melati",
      name: "Melati Eka",
      nickname: "Melati",
      profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Melati"
    }
  },
  {
    id: "mini_disc_2",
    title: "Coilovers & Camber Talk",
    description: "Suspension geometry roundtable: roll centers and damper rebound settings.",
    location: "Speedlab Tuning, Bintaro Sektor 7, Tangerang Selatan",
    category: "discuss",
    mediaUrl: "/media/gifs/event_disc_2.mp4",
    lat: -6.2830,
    lng: 106.7115,
    isActive: true,
    expiresAt: new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString(),
    creator: {
      id: "mock_adit",
      name: "Adit Bintaro",
      nickname: "Adit",
      profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Adit",
      broadcast: { message: "Dyno run booked for Saturday!", createdAt: new Date().toISOString() },
      coverType: "gif",
      coverImage: "/media/gifs/event_cafe_1.gif",
      socialPlatform: "IG",
      socialLink: "aditbintaro",
      instagram: "aditbintaro",
      whatsapp: "+6281234567890",
      phone: "+6281234567890",
      reason: "Chasing suspension balance, track day prep, and car enthusiast community."
    }
  },
  {
    id: "mini_disc_3",
    title: "Aero & Downforce Clinic",
    description: "Computational flow analysis discussion on rear wings and front splitters.",
    location: "Aerotech Garage, Pondok Aren, Tangerang Selatan",
    category: "discuss",
    mediaUrl: "/media/gifs/event_disc_3.mp4",
    lat: -6.2695,
    lng: 106.7210,
    isActive: true,
    expiresAt: new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString(),
    creator: {
      id: "mock_fajar",
      name: "Fajar Drift",
      nickname: "Fajar",
      profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Fajar"
    }
  }
];

export const INITIAL_ACCEPTED_COLLABS = {
  mini_spec_2: ["mock_otniel", "own"]
};

export const INITIAL_EVENT_REQUESTS = {
  mini_spec_3: [
    { id: "req_adit_otniel", user: { id: "mock_adit", name: "Adit Bintaro", nickname: "Adit", profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Adit", broadcast: "Dyno run booked for Saturday!" }, message: "Bro, count me in for the midnight widebody reveal! Bringing the GR Yaris.", createdAt: new Date(Date.now() - 1800000).toISOString() },
    { id: "req_dinda_otniel", user: { id: "mock_dinda", name: "Dinda Laras", nickname: "Dinda", profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Dinda", broadcast: "Trackday tuning prep at FM" }, message: "Would love to collab on the aero build session tonight!", createdAt: new Date(Date.now() - 4200000).toISOString() }
  ],
  mini_cafe_1: [
    { id: "req_adit", user: { id: "mock_adit", name: "Adit Bintaro", nickname: "Adit", profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Adit", broadcast: "Dyno run booked for Saturday!" }, message: "Ready for highway convoy route!", createdAt: new Date(Date.now() - 3600000).toISOString() },
    { id: "req_bonita", user: { id: "mock_bonita", name: "Bonita Bon", nickname: "Bonita", profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bonita", broadcast: "Coffee & car chat in Sector 7" }, message: "Joining morning espresso catchup with my Silvia S15.", createdAt: new Date(Date.now() - 7200000).toISOString() }
  ],
  own: [
    { id: "req_dinda", user: { id: "mock_dinda", name: "Dinda Laras", nickname: "Dinda", profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Dinda", broadcast: "Trackday tuning prep at FM" }, message: "Count me in for this session! Let's roll together.", createdAt: new Date(Date.now() - 1800000).toISOString() }
  ]
};

export const cleanEventDesc = (item) => {
  if (!item) return item;
  const raw = item.description || "";
  const catMatch = raw.match(/\[CAT:([a-z_]+)\]/i);
  const mediaMatch = raw.match(/\[MEDIA:([^\]]+)\]/i);
  const locMatch = raw.match(/\[LOC:([^\]]+)\]/i);
  const cleanDescription = raw
    .replace(/\[CAT:[a-z_]+\]\s*/gi, "")
    .replace(/\[MEDIA:[^\]]+\]\s*/gi, "")
    .replace(/\[LOC:[^\]]+\]\s*/gi, "")
    .trim();
  return {
    ...item,
    category: catMatch ? catMatch[1].toLowerCase() : (item.category || "cafe"),
    mediaUrl: mediaMatch ? mediaMatch[1] : (item.mediaUrl || null),
    location: locMatch ? locMatch[1].trim() : (item.location || null),
    description: cleanDescription,
  };
};

export const mergeEvents = (activeList) => {
  const normalizedMocks = INITIAL_MOCK_MINI_EVENTS.map(cleanEventDesc);
  if (!activeList || activeList.length === 0) return normalizedMocks;
  const cleanedActive = activeList.map(cleanEventDesc);
  const activeIds = new Set(cleanedActive.map((e) => e.id));
  const missingMocks = normalizedMocks.filter((m) => !activeIds.has(m.id));
  return [...cleanedActive, ...missingMocks];
};

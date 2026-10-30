// mockMiniEvents.js
// 12 distinct events across 4 mini event categories with realistic Kalcerian declarers and distinct normalized media

export const INITIAL_MOCK_MINI_EVENTS = [
  // ─── CAFE MEETING (3 Events) ───────────────────────────────────────────────
  {
    id: "mini_cafe_1",
    title: "Morning Espresso Catchup",
    description: "Morning caffeine hit and route planning before heading to BSD loop.",
    category: "cafe",
    mediaUrl: "/media/gifs/event_cafe_1.gif",
    mediaUrls: ["/media/gifs/event_cafe_1.gif", "/media/gifs/event_cafe_2.gif"],
    lat: -6.2735,
    lng: 106.7110,
    isActive: true,
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    creator: {
      id: "mock_ahmad",
      name: "Ahmad Bintaro",
      nickname: "Ahmad",
      profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ahmad"
    }
  },
  {
    id: "mini_cafe_2",
    title: "Sunset Coffee & Chills",
    description: "Iced Latte session at Sector 7 parkside cafe. All car enthusiasts welcome.",
    category: "cafe",
    mediaUrl: "/media/gifs/event_cafe_2.gif",
    lat: -6.2810,
    lng: 106.7225,
    isActive: true,
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    creator: {
      id: "mock_rei",
      name: "Rei Nathan",
      nickname: "Rei",
      profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rei"
    }
  },
  {
    id: "mini_cafe_3",
    title: "V6 Roaster & Filter Brew",
    description: "Pour over tasting and casual Sunday talk with the crew.",
    category: "cafe",
    mediaUrl: "/media/gifs/event_cafe_3.gif",
    lat: -6.2680,
    lng: 106.7085,
    isActive: true,
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
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
    category: "special",
    mediaUrl: "/media/gifs/event_spec_1.gif",
    mediaUrls: ["/media/gifs/event_spec_1.gif", "/media/gifs/event_spec_2.gif", "/media/gifs/event_spec_3.gif"],
    lat: -6.2790,
    lng: 106.7160,
    isActive: true,
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    creator: {
      id: "mock_alpha",
      name: "Kalcerian Alpha",
      nickname: "Alpha",
      profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alpha"
    }
  },
  {
    id: "mini_spec_2",
    title: "Trackday Rollout Prep",
    description: "Alignment check and tire pressure setup before Sentul session.",
    category: "special",
    mediaUrl: "/media/gifs/event_spec_2.gif",
    lat: -6.2650,
    lng: 106.7190,
    isActive: true,
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
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
    category: "special",
    mediaUrl: "/media/gifs/event_spec_3.gif",
    lat: -6.2855,
    lng: 106.7060,
    isActive: true,
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
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
    description: "Post-cruise street food feast near Fresh Market strip.",
    category: "eat",
    mediaUrl: "/media/gifs/event_eat_1.gif",
    mediaUrls: ["/media/gifs/event_eat_1.gif", "/media/gifs/event_eat_2.gif"],
    lat: -6.2710,
    lng: 106.7145,
    isActive: true,
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    creator: {
      id: "mock_coki",
      name: "Coki",
      nickname: "Coki",
      profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Coki"
    }
  },
  {
    id: "mini_eat_2",
    title: "Dimsum Brunch Gathering",
    description: "Warm dimsum feast and parking lot lineup at Bintaro Loop.",
    category: "eat",
    mediaUrl: "/media/gifs/event_eat_2.gif",
    lat: -6.2760,
    lng: 106.7250,
    isActive: true,
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    creator: {
      id: "mock_bonita",
      name: "Bonita Bon",
      nickname: "Bonita",
      profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bonita"
    }
  },
  {
    id: "mini_eat_3",
    title: "Smoked Brisket Dinner",
    description: "BBQ platter sharing and dyno talk with the turbos family.",
    category: "eat",
    mediaUrl: "/media/gifs/event_eat_3.gif",
    lat: -6.2620,
    lng: 106.7120,
    isActive: true,
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
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
    category: "discuss",
    mediaUrl: "/media/gifs/event_disc_1.gif",
    mediaUrls: ["/media/gifs/event_disc_1.gif", "/media/gifs/event_disc_2.gif"],
    lat: -6.2745,
    lng: 106.7180,
    isActive: true,
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
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
    category: "discuss",
    mediaUrl: "/media/gifs/event_disc_2.gif",
    lat: -6.2830,
    lng: 106.7115,
    isActive: true,
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    creator: {
      id: "mock_adit",
      name: "Adit Bintaro",
      nickname: "Adit",
      profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Adit"
    }
  },
  {
    id: "mini_disc_3",
    title: "Aero & Downforce Clinic",
    description: "Computational flow analysis discussion on rear wings and front splitters.",
    category: "discuss",
    mediaUrl: "/media/gifs/event_disc_3.gif",
    lat: -6.2695,
    lng: 106.7210,
    isActive: true,
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    creator: {
      id: "mock_fajar",
      name: "Fajar Drift",
      nickname: "Fajar",
      profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Fajar"
    }
  }
];

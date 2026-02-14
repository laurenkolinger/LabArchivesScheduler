/* ============================================
   Marine Science Lab Equipment Scheduler
   Shared Application Logic
   ============================================ */

// ---- Equipment Catalog ----
const EQUIPMENT = [
  // Boats
  {
    id: "boat-enterprise",
    name: "SS Enterprise",
    aka: 'a.k.a. "NCC-1701 of the Sea"',
    category: "boat",
    description: "26ft Boston Whaler. GPS, fish finder, davit. Trailerable. Coast Guard kit aboard.",
  },
  {
    id: "boat-pearl",
    name: "The Black Pearl",
    aka: 'a.k.a. "Why Is the Rum Gone?"',
    category: "boat",
    description: "18ft Carolina Skiff. Shallow-draft, perfect for estuary sampling and nearshore work.",
  },
  {
    id: "boat-serenity",
    name: "Serenity",
    aka: 'a.k.a. "Big Damn Boat"',
    category: "boat",
    description: "22ft Rigid Inflatable (RIB). Fast deployment for open-water transects and dive ops.",
  },
  {
    id: "boat-orca",
    name: "The Orca",
    aka: 'a.k.a. "We\'re Gonna Need a Bigger Boat"',
    category: "boat",
    description: "34ft research vessel. A-frame, winch, wet lab space. Multi-day capable.",
  },

  // Rooms
  {
    id: "room-batcave",
    name: "The Batcave",
    aka: "Dive Gear Room (Bldg C-012)",
    category: "room",
    description: "Dive locker with compressor, rinse tanks, gear storage, and regulator bench.",
  },
  {
    id: "room-237",
    name: "Room 237",
    aka: "Wet Lab (Bldg A-237)",
    category: "room",
    description: "Running seawater, fume hood, 3 benches, -80 freezer, dissecting scopes.",
  },
  {
    id: "room-holodeck",
    name: "The Holodeck",
    aka: "Conference Room (Bldg A-110)",
    category: "room",
    description: "Seats 20, projector, Zoom setup, whiteboard wall. Reserve for meetings & defenses.",
  },

  // Tools / Instruments
  {
    id: "tool-mjolnir",
    name: "Mjolnir",
    aka: "Sediment Corer (Wildco hand corer)",
    category: "tool",
    description: "Stainless hand corer, 2-inch and 4-inch barrels, extension rods, core caps.",
  },
  {
    id: "tool-sonic",
    name: "Sonic Screwdriver",
    aka: "CTD Probe (YSI CastAway)",
    category: "tool",
    description: "Handheld CTD — conductivity, temperature, depth. Bluetooth download.",
  },
  {
    id: "tool-precious",
    name: "The Precious",
    aka: "Underwater ROV (BlueROV2)",
    category: "tool",
    description: "ROV with 4K camera, lights, depth-rated to 100m. Requires tether & topside laptop.",
  },

  // Vehicles
  {
    id: "vehicle-mystery",
    name: "The Mystery Machine",
    aka: "Ford Transit Field Van",
    category: "vehicle",
    description: "12-passenger van, roof rack, tow hitch. Great for field trips and gear hauling.",
  },
  {
    id: "vehicle-ecto",
    name: "Ecto-1",
    aka: "F-250 Truck w/ Trailer",
    category: "vehicle",
    description: "Heavy-duty truck + dual-axle trailer. For towing boats or heavy equipment.",
  },
];

// ---- Example PI List ----
const PI_LIST = [
  "Dr. Elaine Benes",
  "Dr. Dana Scully",
  "Dr. Emmett Brown",
  "Dr. Henry \"Indiana\" Jones",
  "Dr. Beverly Crusher",
  "Dr. Ian Malcolm",
  "Dr. Ellen Ripley",
];

// ---- LocalStorage Keys ----
const STORAGE_KEY = "marinelab_reservations";

// ---- Data Access ----
function getReservations() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveReservations(reservations) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reservations));
}

function addReservation(reservation) {
  const reservations = getReservations();
  reservation.id = "res-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
  reservation.createdAt = new Date().toISOString();
  reservations.push(reservation);
  saveReservations(reservations);
  return reservation;
}

function deleteReservation(id) {
  const reservations = getReservations().filter((r) => r.id !== id);
  saveReservations(reservations);
}

// ---- Equipment Helpers ----
function getEquipmentById(id) {
  return EQUIPMENT.find((e) => e.id === id) || null;
}

function getEquipmentByCategory(cat) {
  return EQUIPMENT.filter((e) => e.category === cat);
}

function getCategoryLabel(cat) {
  const labels = { boat: "Boat", room: "Room", tool: "Tool / Instrument", vehicle: "Vehicle" };
  return labels[cat] || cat;
}

// ---- CSV Export ----
function reservationsToCSV() {
  const reservations = getReservations();
  if (reservations.length === 0) return "";

  const headers = [
    "Reservation ID",
    "Equipment ID",
    "Equipment Name",
    "Category",
    "Reserved By",
    "PI",
    "Fund Number",
    "Start Date",
    "Start Time",
    "End Date",
    "End Time",
    "Notes",
    "Created At",
  ];

  const rows = reservations.map((r) => {
    const eq = getEquipmentById(r.equipmentId);
    return [
      r.id,
      r.equipmentId,
      eq ? eq.name : r.equipmentId,
      eq ? getCategoryLabel(eq.category) : "",
      r.reservedBy,
      r.pi,
      r.fundNumber,
      r.startDate,
      r.startTime,
      r.endDate,
      r.endTime,
      r.notes || "",
      r.createdAt,
    ];
  });

  const escape = (val) => {
    const s = String(val).replace(/"/g, '""');
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s}"` : s;
  };

  return [headers.map(escape).join(","), ...rows.map((row) => row.map(escape).join(","))].join("\n");
}

function downloadCSV() {
  const csv = reservationsToCSV();
  if (!csv) {
    alert("No reservations to export.");
    return;
  }
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const date = new Date().toISOString().slice(0, 10);
  link.download = `lab_reservations_${date}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ---- Calendar Utilities ----
function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

function formatDateStr(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function getReservationsForDate(dateStr, filterCategory) {
  const reservations = getReservations();
  return reservations.filter((r) => {
    if (filterCategory && filterCategory !== "all") {
      const eq = getEquipmentById(r.equipmentId);
      if (!eq || eq.category !== filterCategory) return false;
    }
    return dateStr >= r.startDate && dateStr <= r.endDate;
  });
}

// ---- Seed Demo Data ----
function seedDemoReservations() {
  const existing = getReservations();
  if (existing.length > 0) return; // Don't overwrite

  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();

  const demos = [
    {
      equipmentId: "boat-enterprise",
      reservedBy: "Geordi LaForge",
      pi: "Dr. Beverly Crusher",
      fundNumber: "NSF-OCE-2401",
      startDate: formatDateStr(y, m, Math.min(today.getDate() + 1, 28)),
      startTime: "08:00",
      endDate: formatDateStr(y, m, Math.min(today.getDate() + 2, 28)),
      endTime: "17:00",
      notes: "Water quality transect — bring Niskin bottles",
    },
    {
      equipmentId: "room-237",
      reservedBy: "Fox Mulder",
      pi: "Dr. Dana Scully",
      fundNumber: "FBI-XF-1993",
      startDate: formatDateStr(y, m, Math.min(today.getDate() + 3, 28)),
      startTime: "09:00",
      endDate: formatDateStr(y, m, Math.min(today.getDate() + 3, 28)),
      endTime: "16:00",
      notes: "Tissue prep & histology",
    },
    {
      equipmentId: "tool-precious",
      reservedBy: "Samwise Gamgee",
      pi: "Dr. Ian Malcolm",
      fundNumber: "NOAA-ROV-007",
      startDate: formatDateStr(y, m, Math.min(today.getDate() + 5, 28)),
      startTime: "07:00",
      endDate: formatDateStr(y, m, Math.min(today.getDate() + 6, 28)),
      endTime: "18:00",
      notes: "Reef survey at site B — ROV checkout required day before",
    },
    {
      equipmentId: "vehicle-mystery",
      reservedBy: "Shaggy Rogers",
      pi: "Dr. Elaine Benes",
      fundNumber: "STATE-EDU-42",
      startDate: formatDateStr(y, m, Math.min(today.getDate(), 28)),
      startTime: "06:00",
      endDate: formatDateStr(y, m, Math.min(today.getDate(), 28)),
      endTime: "20:00",
      notes: "Field trip to barrier island — 8 students",
    },
  ];

  demos.forEach((d) => addReservation(d));
}

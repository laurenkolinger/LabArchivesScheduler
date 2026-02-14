/* ============================================
   Marine Science Lab Equipment Scheduler
   Frontend Application Logic
   ============================================ */

// ---- Equipment Catalog (static config) ----
const EQUIPMENT = [
  // Boats
  { id: "boat-enterprise", name: "SS Enterprise", aka: 'a.k.a. "NCC-1701 of the Sea"', category: "boat", description: "26ft Boston Whaler. GPS, fish finder, davit. Trailerable. Coast Guard kit aboard." },
  { id: "boat-pearl", name: "The Black Pearl", aka: 'a.k.a. "Why Is the Rum Gone?"', category: "boat", description: "18ft Carolina Skiff. Shallow-draft, perfect for estuary sampling and nearshore work." },
  { id: "boat-serenity", name: "Serenity", aka: 'a.k.a. "Big Damn Boat"', category: "boat", description: "22ft Rigid Inflatable (RIB). Fast deployment for open-water transects and dive ops." },
  { id: "boat-orca", name: "The Orca", aka: "a.k.a. \"We're Gonna Need a Bigger Boat\"", category: "boat", description: "34ft research vessel. A-frame, winch, wet lab space. Multi-day capable." },

  // Rooms
  { id: "room-batcave", name: "The Batcave", aka: "Dive Gear Room (Bldg C-012)", category: "room", description: "Dive locker with compressor, rinse tanks, gear storage, and regulator bench." },
  { id: "room-237", name: "Room 237", aka: "Wet Lab (Bldg A-237)", category: "room", description: "Running seawater, fume hood, 3 benches, -80 freezer, dissecting scopes." },
  { id: "room-holodeck", name: "The Holodeck", aka: "Conference Room (Bldg A-110)", category: "room", description: "Seats 20, projector, Zoom setup, whiteboard wall. Reserve for meetings & defenses." },

  // Tools
  { id: "tool-mjolnir", name: "Mjolnir", aka: "Sediment Corer (Wildco hand corer)", category: "tool", description: "Stainless hand corer, 2-inch and 4-inch barrels, extension rods, core caps." },
  { id: "tool-sonic", name: "Sonic Screwdriver", aka: "CTD Probe (YSI CastAway)", category: "tool", description: "Handheld CTD — conductivity, temperature, depth. Bluetooth download." },
  { id: "tool-precious", name: "The Precious", aka: "Underwater ROV (BlueROV2)", category: "tool", description: "ROV with 4K camera, lights, depth-rated to 100m. Requires tether & topside laptop." },

  // Vehicles
  { id: "vehicle-mystery", name: "The Mystery Machine", aka: "Ford Transit Field Van", category: "vehicle", description: "12-passenger van, roof rack, tow hitch. Great for field trips and gear hauling." },
  { id: "vehicle-ecto", name: "Ecto-1", aka: "F-250 Truck w/ Trailer", category: "vehicle", description: "Heavy-duty truck + dual-axle trailer. For towing boats or heavy equipment." },
];

const PI_LIST = [
  "Dr. Elaine Benes",
  "Dr. Dana Scully",
  "Dr. Emmett Brown",
  'Dr. Henry "Indiana" Jones',
  "Dr. Beverly Crusher",
  "Dr. Ian Malcolm",
  "Dr. Ellen Ripley",
];

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

// ---- API Helpers ----
async function apiGet(url) {
  const resp = await fetch(url);
  return resp.json();
}

async function apiPost(url, body) {
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { ok: resp.ok, status: resp.status, data: await resp.json() };
}

async function apiDelete(url) {
  const resp = await fetch(url, { method: "DELETE" });
  return { ok: resp.ok, status: resp.status, data: await resp.json() };
}

// ---- Session / Auth API ----
let _cachedSession = undefined;

async function getSession() {
  if (_cachedSession !== undefined) return _cachedSession;
  const data = await apiGet("/api/session");
  _cachedSession = data;
  return data;
}

function clearSessionCache() {
  _cachedSession = undefined;
}

async function isLoggedIn() {
  const s = await getSession();
  return s.loggedIn;
}

async function isAdmin() {
  const s = await getSession();
  return s.loggedIn && s.user && s.user.role === "admin";
}

async function getCurrentUser() {
  const s = await getSession();
  return s.loggedIn ? s.user : null;
}

// ---- Reservations API ----
async function getReservations() {
  return await apiGet("/api/reservations");
}

async function addReservation(fields) {
  return await apiPost("/api/reservations", fields);
}

async function deleteReservation(id) {
  return await apiDelete(`/api/reservations/${id}`);
}

// ---- Render Auth UI in Nav ----
async function renderAuthUI() {
  const navLinks = document.querySelector(".nav-links");
  if (!navLinks) return;

  const existing = document.getElementById("authWidget");
  if (existing) existing.remove();

  const widget = document.createElement("div");
  widget.id = "authWidget";
  widget.style.cssText = "display:flex;align-items:center;gap:8px;margin-left:12px;";

  const session = await getSession();

  if (session.loggedIn) {
    const info = document.createElement("span");
    info.style.cssText = "font-size:12px;opacity:0.9;color:#fff;";
    const roleLabel = session.user.role === "admin" ? "Admin" : "User";
    info.textContent = `${session.user.name} (${roleLabel})`;
    widget.appendChild(info);

    const logoutBtn = document.createElement("button");
    logoutBtn.textContent = "Log Out";
    logoutBtn.className = "btn";
    logoutBtn.style.cssText = "padding:5px 12px;font-size:12px;background:rgba(255,255,255,0.2);color:#fff;border:1px solid rgba(255,255,255,0.4);";
    logoutBtn.addEventListener("click", async () => {
      await apiPost("/api/logout", {});
      clearSessionCache();
      window.location.href = "/index.html";
    });
    widget.appendChild(logoutBtn);
  } else {
    const loginBtn = document.createElement("a");
    loginBtn.textContent = "Log In";
    loginBtn.href = "/login.html";
    loginBtn.className = "btn";
    loginBtn.style.cssText = "padding:5px 12px;font-size:12px;background:rgba(255,255,255,0.2);color:#fff;border:1px solid rgba(255,255,255,0.4);text-decoration:none;";
    widget.appendChild(loginBtn);

    const regBtn = document.createElement("a");
    regBtn.textContent = "Register";
    regBtn.href = "/register.html";
    regBtn.className = "btn";
    regBtn.style.cssText = "padding:5px 12px;font-size:12px;background:rgba(255,255,255,0.15);color:#fff;border:1px solid rgba(255,255,255,0.3);text-decoration:none;";
    widget.appendChild(regBtn);
  }

  navLinks.parentElement.appendChild(widget);
}

// ---- Filter reservations for a date (client-side, from fetched data) ----
function getReservationsForDate(reservations, dateStr, filterCategory) {
  return reservations.filter((r) => {
    if (filterCategory && filterCategory !== "all") {
      const eq = getEquipmentById(r.equipmentId);
      if (!eq || eq.category !== filterCategory) return false;
    }
    return dateStr >= r.startDate && dateStr <= r.endDate;
  });
}

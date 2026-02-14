/* ============================================
   Marine Science Lab Equipment Scheduler
   Express Backend Server
   ============================================ */

require("dotenv").config();

const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8080;

// ---- Config ----
const ALLOWED_DOMAIN = (process.env.ALLOWED_DOMAIN || "uvi.edu").toLowerCase();
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "admin@uvi.edu")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// ---- Middleware ----
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      sameSite: "lax",
    },
  })
);
app.use(express.static(path.join(__dirname, "public")));

// ---- Data Files ----
const DATA_DIR = path.join(__dirname, "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const RESERVATIONS_FILE = path.join(DATA_DIR, "reservations.json");

function readJSON(filepath) {
  try {
    if (!fs.existsSync(filepath)) return [];
    const raw = fs.readFileSync(filepath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeJSON(filepath, data) {
  fs.mkdirSync(path.dirname(filepath), { recursive: true });
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), "utf-8");
}

// ---- Email Transporter ----
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.warn(
      "SMTP not configured — verification emails will be logged to console instead of sent."
    );
    return null;
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
}

async function sendVerificationEmail(email, token) {
  const verifyURL = `${BASE_URL}/api/verify?token=${token}`;
  const mailOptions = {
    from: process.env.SMTP_FROM || `"Marine Science Lab" <noreply@${ALLOWED_DOMAIN}>`,
    to: email,
    subject: "Verify your Marine Science Lab Scheduler account",
    text: [
      "Welcome to the Marine Science Lab Equipment Scheduler!",
      "",
      "Please verify your email address by visiting this link:",
      verifyURL,
      "",
      "This link expires in 24 hours.",
      "",
      "If you did not create this account, you can safely ignore this email.",
    ].join("\n"),
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px;">
        <h2 style="color:#1b2a4a;">Marine Science Lab Equipment Scheduler</h2>
        <p>Welcome! Please verify your email address by clicking the button below:</p>
        <p style="text-align:center;margin:30px 0;">
          <a href="${verifyURL}"
             style="background:#2c5f8a;color:#fff;padding:14px 28px;text-decoration:none;border-radius:6px;font-weight:600;">
            Verify My Email
          </a>
        </p>
        <p style="color:#666;font-size:13px;">Or copy this link: <a href="${verifyURL}">${verifyURL}</a></p>
        <p style="color:#999;font-size:12px;">This link expires in 24 hours. If you did not create this account, ignore this email.</p>
      </div>
    `,
  };

  const transport = getTransporter();
  if (transport) {
    await transport.sendMail(mailOptions);
    console.log(`Verification email sent to ${email}`);
  } else {
    // Fallback: log to console for local dev
    console.log("=".repeat(60));
    console.log("VERIFICATION EMAIL (SMTP not configured)");
    console.log(`To: ${email}`);
    console.log(`Verify URL: ${verifyURL}`);
    console.log("=".repeat(60));
  }
}

// ---- Auth Middleware ----
function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: "Login required." });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: "Login required." });
  }
  if (req.session.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required." });
  }
  next();
}

// ---- Helper: determine role ----
function roleForEmail(email) {
  return ADMIN_EMAILS.includes(email.toLowerCase()) ? "admin" : "user";
}

// ================================================
// AUTH ROUTES
// ================================================

// POST /api/register
app.post("/api/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validate
    if (!email || !password || !name) {
      return res.status(400).json({ error: "Name, email, and password are required." });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check domain
    const domain = normalizedEmail.split("@")[1];
    if (domain !== ALLOWED_DOMAIN) {
      return res.status(400).json({
        error: `Only @${ALLOWED_DOMAIN} email addresses can register.`,
      });
    }

    // Check password strength
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    // Check if user already exists
    const users = readJSON(USERS_FILE);
    const existing = users.find((u) => u.email === normalizedEmail);
    if (existing && existing.verified) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    // If unverified account exists, remove it (allow re-registration)
    const filteredUsers = users.filter((u) => u.email !== normalizedEmail);

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create verification token
    const verifyToken = uuidv4();
    const tokenExpiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    const newUser = {
      id: uuidv4(),
      email: normalizedEmail,
      name: name.trim(),
      password: hashedPassword,
      role: roleForEmail(normalizedEmail),
      verified: false,
      verifyToken,
      tokenExpiry,
      createdAt: new Date().toISOString(),
    };

    filteredUsers.push(newUser);
    writeJSON(USERS_FILE, filteredUsers);

    // Send verification email
    await sendVerificationEmail(normalizedEmail, verifyToken);

    res.json({
      message: "Account created! Check your email for a verification link.",
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Server error during registration." });
  }
});

// GET /api/verify?token=xxx
app.get("/api/verify", (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.status(400).send(verifyResultPage(false, "Missing verification token."));
  }

  const users = readJSON(USERS_FILE);
  const user = users.find((u) => u.verifyToken === token);

  if (!user) {
    return res.status(400).send(verifyResultPage(false, "Invalid or expired verification link."));
  }

  if (user.tokenExpiry && Date.now() > user.tokenExpiry) {
    return res
      .status(400)
      .send(verifyResultPage(false, "This verification link has expired. Please register again."));
  }

  // Mark verified
  user.verified = true;
  user.verifyToken = null;
  user.tokenExpiry = null;
  writeJSON(USERS_FILE, users);

  res.send(verifyResultPage(true, "Your email has been verified! You can now log in."));
});

function verifyResultPage(success, message) {
  const color = success ? "#3d7a5f" : "#dc3545";
  const title = success ? "Email Verified!" : "Verification Failed";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${title} — Marine Science Lab</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <nav class="top-nav"><div class="nav-inner">
    <div class="nav-brand"><span class="logo">&#9875;</span><div><h1>Marine Science Lab</h1><div class="subtitle">Equipment Scheduler</div></div></div>
  </div></nav>
  <div class="container" style="text-align:center;padding-top:60px;">
    <div class="card" style="max-width:480px;margin:0 auto;">
      <h2 style="color:${color};">${title}</h2>
      <p class="mt-16">${message}</p>
      <a href="/index.html" class="btn btn-primary mt-16">Go to Calendar</a>
      ${success ? '<a href="/login.html" class="btn btn-outline mt-16" style="margin-left:8px;">Log In</a>' : '<a href="/register.html" class="btn btn-outline mt-16" style="margin-left:8px;">Register Again</a>'}
    </div>
  </div>
</body></html>`;
}

// POST /api/login
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const users = readJSON(USERS_FILE);
    const user = users.find((u) => u.email === normalizedEmail);

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    if (!user.verified) {
      return res.status(401).json({
        error: "Your email has not been verified yet. Check your inbox for the verification link.",
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    // Set session
    req.session.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    res.json({
      message: "Login successful.",
      user: req.session.user,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error during login." });
  }
});

// POST /api/logout
app.post("/api/logout", (req, res) => {
  req.session.destroy();
  res.json({ message: "Logged out." });
});

// GET /api/session
app.get("/api/session", (req, res) => {
  if (req.session.user) {
    res.json({ loggedIn: true, user: req.session.user });
  } else {
    res.json({ loggedIn: false, user: null });
  }
});

// POST /api/resend-verification
app.post("/api/resend-verification", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required." });

    const normalizedEmail = email.trim().toLowerCase();
    const users = readJSON(USERS_FILE);
    const user = users.find((u) => u.email === normalizedEmail);

    if (!user) {
      // Don't reveal whether account exists
      return res.json({ message: "If that email is registered, a new verification link has been sent." });
    }

    if (user.verified) {
      return res.json({ message: "This email is already verified. You can log in." });
    }

    // Generate new token
    user.verifyToken = uuidv4();
    user.tokenExpiry = Date.now() + 24 * 60 * 60 * 1000;
    writeJSON(USERS_FILE, users);

    await sendVerificationEmail(normalizedEmail, user.verifyToken);

    res.json({ message: "If that email is registered, a new verification link has been sent." });
  } catch (err) {
    console.error("Resend verification error:", err);
    res.status(500).json({ error: "Server error." });
  }
});

// ================================================
// RESERVATIONS API
// ================================================

// GET /api/reservations — public (anyone can view the calendar)
app.get("/api/reservations", (req, res) => {
  const reservations = readJSON(RESERVATIONS_FILE);
  res.json(reservations);
});

// POST /api/reservations — requires login (user or admin)
app.post("/api/reservations", requireLogin, (req, res) => {
  const { equipmentId, reservedBy, pi, fundNumber, startDate, startTime, endDate, endTime, notes } =
    req.body;

  if (!equipmentId || !reservedBy || !pi || !fundNumber || !startDate || !endDate || !startTime || !endTime) {
    return res.status(400).json({ error: "All required fields must be filled." });
  }

  const reservations = readJSON(RESERVATIONS_FILE);

  const reservation = {
    id: "res-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
    equipmentId,
    reservedBy: reservedBy.trim(),
    pi,
    fundNumber: fundNumber.trim(),
    startDate,
    startTime,
    endDate,
    endTime,
    notes: (notes || "").trim(),
    createdBy: req.session.user.email,
    createdAt: new Date().toISOString(),
  };

  reservations.push(reservation);
  writeJSON(RESERVATIONS_FILE, reservations);

  res.json({ message: "Reservation created.", reservation });
});

// DELETE /api/reservations/:id — requires admin
app.delete("/api/reservations/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  let reservations = readJSON(RESERVATIONS_FILE);
  const before = reservations.length;
  reservations = reservations.filter((r) => r.id !== id);

  if (reservations.length === before) {
    return res.status(404).json({ error: "Reservation not found." });
  }

  writeJSON(RESERVATIONS_FILE, reservations);
  res.json({ message: "Reservation deleted." });
});

// GET /api/reservations/csv — requires admin
app.get("/api/reservations/csv", requireAdmin, (req, res) => {
  const reservations = readJSON(RESERVATIONS_FILE);

  const headers = [
    "Reservation ID",
    "Equipment ID",
    "Reserved By",
    "PI",
    "Fund Number",
    "Start Date",
    "Start Time",
    "End Date",
    "End Time",
    "Notes",
    "Created By",
    "Created At",
  ];

  const escape = (val) => {
    const s = String(val || "").replace(/"/g, '""');
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s}"` : s;
  };

  const rows = reservations.map((r) =>
    [r.id, r.equipmentId, r.reservedBy, r.pi, r.fundNumber, r.startDate, r.startTime, r.endDate, r.endTime, r.notes, r.createdBy, r.createdAt]
      .map(escape)
      .join(",")
  );

  const csv = [headers.map(escape).join(","), ...rows].join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="lab_reservations_${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(csv);
});

// ================================================
// ADMIN: user management
// ================================================

// GET /api/admin/users — admin only
app.get("/api/admin/users", requireAdmin, (req, res) => {
  const users = readJSON(USERS_FILE).map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    verified: u.verified,
    createdAt: u.createdAt,
  }));
  res.json(users);
});

// ================================================
// Start Server
// ================================================
app.listen(PORT, () => {
  console.log(`Marine Science Lab Scheduler running at http://localhost:${PORT}`);
  console.log(`Allowed registration domain: @${ALLOWED_DOMAIN}`);
  console.log(`Admin emails: ${ADMIN_EMAILS.join(", ")}`);

  if (!getTransporter()) {
    console.log("NOTE: SMTP not configured — verification links will be printed to console.");
  }
});

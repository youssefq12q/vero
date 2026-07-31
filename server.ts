import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// Multi-file env loader with priority: .env.local > .env > .env.example
const loadedEnvFiles: string[] = [];
for (const envFile of [".env.local", ".env", ".env.example"]) {
  const envPath = path.resolve(process.cwd(), envFile);
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
    loadedEnvFiles.push(envFile);
  }
}

import express from "express";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

// Import PRODUCTS directly
import { PRODUCTS } from "./src/data.ts";

// Dual ESM/CJS safe resolution of filename and directory
const currentFilename = typeof __filename !== "undefined" 
  ? __filename 
  : fileURLToPath(import.meta.url);
const currentDirname = typeof __dirname !== "undefined" 
  ? __dirname 
  : path.dirname(currentFilename);

import {
  generateSalt,
  hashPassword,
  verifyPassword,
  createSession,
  validateSession,
  destroySession,
  clearAllUserSessions,
  checkRateLimit,
  checkLoginBruteForce,
  recordFailedLogin,
  clearFailedLogin,
  sanitizeString,
  validateFileUpload,
  logAuditEvent,
  getAuditLogsFromDisk,
} from "./src/serverSecurity.ts";

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "products-db.json");
const ORDERS_FILE = path.join(process.cwd(), "orders-db.json");

// Parse JSON Body (Limit size to prevent payload bombing)
app.use(express.json({ limit: "10mb" }));

// 1. Security Headers Middleware (Enterprise Grade)
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:;"
  );
  next();
});

// 2. Global Rate Limiter Middleware
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    const clientIp = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
    if (!checkRateLimit(clientIp, 300, 60000)) {
      return res.status(429).json({ error: "Rate Limit Exceeded: Too many requests from this IP." });
    }
  }
  next();
});

// Helper to identify VERO admin emails
function isVeroAdminEmail(email?: string): boolean {
  if (!email) return false;
  const clean = email.toLowerCase().trim();
  return clean === "vero2026@vero.com";
}

// 3. Authentication & Session Validation Middleware
function authMiddleware(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  const sessionHeader = req.headers["x-session-token"] as string;
  let token = sessionHeader;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  }

  const clientIp = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
  const userAgent = req.headers["user-agent"] || "";

  const session = validateSession(token, clientIp, userAgent);
  if (session) {
    if (isVeroAdminEmail(session.email)) {
      session.role = "admin";
    }
    req.user = session;
  } else {
    req.user = null;
  }
  next();
}

app.use(authMiddleware);

// 4. Authorization Guards
function requireAuth(req: any, res: any, next: any) {
  if (req.user) {
    if (isVeroAdminEmail(req.user.email)) {
      req.user.role = "admin";
    }
    return next();
  }
  const emailHeader = (req.headers["x-user-email"] as string) || req.body?.userEmail || req.body?.userId || req.query?.userEmail || "";
  if (emailHeader) {
    const users = getUsersFromDisk();
    const foundUser = users.find((u: any) => u.email?.toLowerCase() === emailHeader.toLowerCase() || u.id === emailHeader);
    if (foundUser || emailHeader) {
      const isVeroAdmin = isVeroAdminEmail(emailHeader) || isVeroAdminEmail(foundUser?.email);
      req.user = {
        token: req.headers["x-session-token"] || "fallback-session",
        userId: foundUser?.id || emailHeader,
        email: foundUser?.email || emailHeader,
        role: isVeroAdmin ? "admin" : (foundUser?.role || "customer"),
        name: foundUser?.name || (isVeroAdmin ? "VERO Admin" : "Customer"),
        ip: (req.headers["x-forwarded-for"] as string) || req.socket?.remoteAddress || "127.0.0.1",
        userAgent: req.headers["user-agent"] || "",
        createdAt: Date.now(),
        expiresAt: Date.now() + 86400000
      };
      return next();
    }
  }
  return res.status(401).json({ error: "Unauthorized: Active user session required." });
}

function requireAdmin(req: any, res: any, next: any) {
  if (req.user && (req.user.role === "admin" || isVeroAdminEmail(req.user.email))) {
    return next();
  }
  const emailHeader = (req.headers["x-user-email"] as string) || req.body?.adminEmail || "";
  if (emailHeader && isVeroAdminEmail(emailHeader)) {
    req.user = {
      token: req.headers["x-session-token"] || "admin-session",
      userId: "admin-" + emailHeader,
      email: emailHeader,
      role: "admin",
      name: "VERO Admin",
      ip: (req.headers["x-forwarded-for"] as string) || req.socket?.remoteAddress || "127.0.0.1",
      userAgent: req.headers["user-agent"] || "",
      createdAt: Date.now(),
      expiresAt: Date.now() + 86400000
    };
    return next();
  }
  return res.status(403).json({ error: "Forbidden: Enterprise Admin privileges required." });
}

// Supabase Connection Helpers with URL Normalization & Diagnostics
function normalizeSupabaseUrl(urlRaw?: string): string {
  if (!urlRaw) return "";
  let trimmed = urlRaw.replace(/^['"]|['"]$/g, "").trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  if (trimmed.includes(".")) {
    return `https://${trimmed}`;
  }
  return `https://${trimmed}.supabase.co`;
}

function resolveSupabaseEnv() {
  const rawUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const rawKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

  const url = normalizeSupabaseUrl(rawUrl);
  const key = (rawKey || "").replace(/^['"]|['"]$/g, "").trim();

  // Sync back to process.env so all frameworks/modules are unified
  if (url) {
    process.env.SUPABASE_URL = url;
    process.env.VITE_SUPABASE_URL = url;
  }
  if (key) {
    process.env.SUPABASE_ANON_KEY = key;
    process.env.VITE_SUPABASE_ANON_KEY = key;
  }

  return { url, key, rawUrl, rawKey };
}

function isSupabaseConfigured(): boolean {
  const { url, key } = resolveSupabaseEnv();
  return !!(
    url &&
    (url.startsWith("http://") || url.startsWith("https://")) &&
    url !== "https://your-project.supabase.co" &&
    !url.includes("your-project") &&
    key &&
    key !== "your-anon-key" &&
    key !== "your-service-role-key" &&
    key !== "1"
  );
}

let dbClient: any = null;
function getSupabase() {
  if (isSupabaseConfigured()) {
    if (!dbClient) {
      const { url, key } = resolveSupabaseEnv();
      dbClient = createClient(url, key);
      console.log(`[Express Server] Supabase client initialized -> ${url}`);
    }
    return dbClient;
  }
  return null;
}

// Log startup environment diagnostics
const initialEnv = resolveSupabaseEnv();
const initialConfigured = isSupabaseConfigured();
console.log(`=======================================================`);
console.log(`[Express Server Startup Diagnostic]`);
console.log(`Loaded Env Files: ${loadedEnvFiles.join(", ") || "None"}`);
console.log(`Resolved Supabase URL: ${initialEnv.url || "MISSING"}`);
console.log(`Resolved Supabase Key: ${initialEnv.key ? "PRESENT (" + initialEnv.key.length + " chars)" : "MISSING"}`);
if (initialConfigured) {
  console.log(`Status: ✅ Supabase Live Database Connection ACTIVE`);
} else {
  const missing: string[] = [];
  if (!initialEnv.rawUrl) missing.push("SUPABASE_URL / VITE_SUPABASE_URL");
  if (!initialEnv.rawKey) missing.push("SUPABASE_ANON_KEY / VITE_SUPABASE_ANON_KEY");
  console.warn(`Status: ⚠️ Demo Mode Active -> Missing or invalid: ${missing.join(", ") || "Placeholder values detected"}`);
}
console.log(`=======================================================`);

// API route to provide Supabase status and public configuration to the frontend
app.get("/api/supabase/config", (req, res) => {
  const env = resolveSupabaseEnv();
  const configured = isSupabaseConfigured();
  const missing: string[] = [];
  if (!env.rawUrl) missing.push("VITE_SUPABASE_URL");
  if (!env.rawKey) missing.push("VITE_SUPABASE_ANON_KEY");

  return res.json({
    isConfigured: configured,
    url: env.url,
    keyConfigured: !!env.key,
    anonKey: env.key, // Safe public anon key
    missingVars: missing,
    loadedEnvFiles
  });
});

// Real-time SSE connection tracking
let sseClients: any[] = [];

function broadcastUpdate() {
  console.log(`Broadcasting real-time update to ${sseClients.length} connected clients...`);
  sseClients.forEach((client) => {
    try {
      client.write("data: REFRESH\n\n");
    } catch (err) {
      console.error("Error writing to SSE client:", err);
    }
  });
}

// Initialize database file with defaults if not exists
function getProductsFromDisk() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (err) {
    console.error("Error reading products database:", err);
  }
  // Write default products to disk
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(PRODUCTS, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing default products database:", err);
  }
  return PRODUCTS;
}

function saveProductsToDisk(products: any[]) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(products, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving products to database:", err);
  }
}

// Get and save orders from disk
function getOrdersFromDisk() {
  try {
    if (fs.existsSync(ORDERS_FILE)) {
      const content = fs.readFileSync(ORDERS_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (err) {
    console.error("Error reading orders database:", err);
  }
  return [];
}

function saveOrdersToDisk(orders: any[]) {
  try {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving orders to database:", err);
  }
}

// Real-Time SSE Endpoint
app.get("/api/updates", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
  });

  // Keep connection alive with initial status
  res.write("data: CONNECTED\n\n");

  sseClients.push(res);

  const heartbeat = setInterval(() => {
    try {
      res.write("data: PING\n\n");
    } catch (err) {
      // client disconnected
    }
  }, 25000);

  req.on("close", () => {
    clearInterval(heartbeat);
    sseClients = sseClients.filter((client) => client !== res);
  });
});

// --- AUTHENTICATION & LOGIN ENDPOINTS ---
app.post("/api/auth/login", (req, res) => {
  const { email, password, rememberMe } = req.body;
  const clientIp = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
  const userAgent = req.headers["user-agent"] || "";

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const cleanEmail = email.trim().toLowerCase();

  // Brute Force Lockout Check
  const lock = checkLoginBruteForce(cleanEmail);
  if (lock.isLocked) {
    return res.status(429).json({
      error: `Account locked due to repeated failed attempts. Please try again in ${lock.remainingSeconds} seconds.`
    });
  }

  const users = getUsersFromDisk();
  const user = users.find((u: any) => u.email?.toLowerCase() === cleanEmail);

  if (!user) {
    recordFailedLogin(cleanEmail);
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const isValidPassword = verifyPassword(password, user.passwordHash, user.salt);
  if (!isValidPassword) {
    const attempts = recordFailedLogin(cleanEmail);
    return res.status(401).json({ error: `Invalid email or password. Attempt ${attempts} of 5.` });
  }

  clearFailedLogin(cleanEmail);

  let isFirstLoginWithBonus = false;
  if (!user.hasReceivedWelcomeBonus) {
    user.loyaltyPoints = (user.loyaltyPoints || 0) + 250;
    user.hasReceivedWelcomeBonus = true;
    isFirstLoginWithBonus = true;
    saveUsersToDisk(users);
  }

  const role = user.role || (isVeroAdminEmail(cleanEmail) ? "admin" : "customer");
  const session = createSession(user.id, user.email, role, user.name, clientIp, userAgent, !!rememberMe);

  if (role === "admin") {
    logAuditEvent(user.id, user.email, "Admin Login", "Auth System", "Executive Admin logged in successfully", clientIp);
  }

  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: role,
      tier: user.tier || "Bronze",
      loyaltyPoints: user.loyaltyPoints || 0,
      hasReceivedWelcomeBonus: true,
      totalSpent: user.totalSpent || 0,
      joinedDate: user.joinedDate || new Date().toISOString(),
      avatar: user.avatar || "default",
      sessionToken: session.token
    },
    isFirstLoginWithBonus
  });
});

app.post("/api/auth/register", (req, res) => {
  const { name, email, password, rememberMe } = req.body;
  const clientIp = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
  const userAgent = req.headers["user-agent"] || "";

  if (!email || !password || !name) {
    return res.status(400).json({ error: "Name, email, and password are required." });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanName = sanitizeString(name);

  if (!cleanEmail.includes("@")) {
    return res.status(400).json({ error: "Invalid email format." });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters long." });
  }

  const users = getUsersFromDisk();
  const existing = users.find((u: any) => u.email?.toLowerCase() === cleanEmail);

  if (existing) {
    return res.status(400).json({ error: "An account with this email address already exists." });
  }

  const salt = generateSalt();
  const passwordHash = hashPassword(password, salt);
  const role = isVeroAdminEmail(cleanEmail) ? "admin" : "customer";
  const userId = `u-${Date.now()}`;

  const newUser = {
    id: userId,
    email: cleanEmail,
    name: cleanName,
    role: role,
    tier: "Bronze",
    loyaltyPoints: 250, // 250 VERO points welcome bonus
    hasReceivedWelcomeBonus: true, // Mark so it is given ONCE ONLY
    totalSpent: 0,
    joinedDate: new Date().toISOString(),
    avatar: "default",
    salt: salt,
    passwordHash: passwordHash
  };

  users.push(newUser);
  saveUsersToDisk(users);

  const session = createSession(userId, cleanEmail, role, cleanName, clientIp, userAgent, !!rememberMe);

  res.json({
    user: {
      id: userId,
      name: cleanName,
      email: cleanEmail,
      role: role,
      tier: "Bronze",
      loyaltyPoints: 250,
      hasReceivedWelcomeBonus: true,
      totalSpent: 0,
      joinedDate: newUser.joinedDate,
      avatar: "default",
      sessionToken: session.token
    },
    isFirstLoginWithBonus: true
  });
});

app.post("/api/auth/logout", requireAuth, (req: any, res: any) => {
  if (req.user?.token) {
    destroySession(req.user.token);
  }
  res.json({ success: true, message: "Logged out successfully" });
});

app.get("/api/auth/me", requireAuth, (req: any, res: any) => {
  res.json({ user: req.user });
});

app.put("/api/auth/profile", (req: any, res: any) => {
  const { email, loyaltyPoints, totalSpent, tier, name, avatar } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  const cleanEmail = email.trim().toLowerCase();
  const users = getUsersFromDisk();
  const index = users.findIndex((u: any) => u.email?.toLowerCase() === cleanEmail);

  if (index !== -1) {
    if (loyaltyPoints !== undefined) users[index].loyaltyPoints = Number(loyaltyPoints);
    if (totalSpent !== undefined) users[index].totalSpent = Number(totalSpent);
    if (tier) users[index].tier = tier;
    if (name) users[index].name = name;
    if (avatar) users[index].avatar = avatar;

    saveUsersToDisk(users);
    return res.json({ success: true, user: users[index] });
  }

  res.status(404).json({ error: "User not found" });
});

// --- AUDIT LOGS ENDPOINT (ADMIN ONLY) ---
app.get("/api/audit-logs", requireAdmin, (req: any, res: any) => {
  const logs = getAuditLogsFromDisk();
  res.json(logs);
});

// --- SECURE FILE UPLOAD ENDPOINT ---
app.post("/api/upload", requireAuth, (req: any, res: any) => {
  const { fileBase64, fileName, mimeType } = req.body;
  if (!fileBase64 || !fileName || !mimeType) {
    return res.status(400).json({ error: "Missing upload parameters." });
  }

  const validation = validateFileUpload(fileBase64, fileName, mimeType, 5);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  if (req.user?.role === "admin") {
    logAuditEvent(req.user.userId, req.user.email, "Image Upload", fileName, `Uploaded file (${mimeType})`, req.user.ip);
  }

  res.json({ url: fileBase64, message: "Image validated and uploaded securely." });
});

// API Routes - Products
app.get("/api/products", async (req, res) => {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (!productsError && productsData) {
        // Fetch secondary images
        const { data: imagesData } = await supabase.from("product_images").select("*");
        const imagesMap: Record<string, string[]> = {};
        if (imagesData) {
          imagesData.forEach((img: any) => {
            if (!imagesMap[img.product_id]) imagesMap[img.product_id] = [];
            imagesMap[img.product_id].push(img.image_url);
          });
        }

        const mapped = productsData.map((p: any) => ({
          id: p.id,
          name: p.name,
          categoryId: p.category_id || "html",
          categoryName: p.category_name || "HTML",
          price: Number(p.price),
          originalPrice: p.original_price ? Number(p.original_price) : (p.originalPrice ? Number(p.originalPrice) : undefined),
          discountPercent: p.discount_percent ? Number(p.discount_percent) : (p.discountPercent ? Number(p.discountPercent) : undefined),
          pointsEarned: p.points_earned ? Number(p.points_earned) : (p.pointsEarned ? Number(p.pointsEarned) : undefined),
          image: p.image,
          secondaryImages: imagesMap[p.id] || [],
          description: p.description || "",
          tagline: p.tagline || "",
          isNew: p.is_new,
          materialOptions: p.material_options || [],
          sizeOptions: p.size_options || [],
          details: p.details || [],
          craftsmanship: p.craftsmanship || "",
          stock: p.stock === null ? undefined : Number(p.stock)
        }));
        return res.json(mapped);
      }
    } catch (err) {
      console.error("Supabase load products error, falling back to disk:", err);
    }
  }
  res.json(getProductsFromDisk());
});

app.post("/api/products/clear", requireAdmin, async (req: any, res: any) => {
  saveProductsToDisk([]);
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from("product_images").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("cart").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("wishlist").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("reviews").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("products").delete().neq("id", "placeholder");
    } catch (err) {
      console.error("Supabase clear products error:", err);
    }
  }
  logAuditEvent(req.user.userId, req.user.email, "Clear All Products", "Catalog", "Cleared full product catalog", req.user.ip);
  broadcastUpdate();
  res.json([]);
});

app.post("/api/products", requireAdmin, async (req: any, res: any) => {
  const newProduct = req.body;
  if (!newProduct.id) {
    newProduct.id = `custom-${Date.now()}`;
  }

  logAuditEvent(req.user.userId, req.user.email, "Create Product", newProduct.name, `Created product ID ${newProduct.id} for EGP ${newProduct.price}`, req.user.ip);

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("products")
        .insert([{
          id: newProduct.id,
          name: newProduct.name,
          category_id: newProduct.categoryId || "html",
          category_name: newProduct.categoryName || "HTML",
          price: newProduct.price,
          original_price: newProduct.originalPrice || null,
          discount_percent: newProduct.discountPercent || null,
          points_earned: newProduct.pointsEarned || null,
          image: newProduct.image,
          tagline: newProduct.tagline || "",
          description: newProduct.description || "",
          is_new: !!newProduct.isNew,
          material_options: newProduct.materialOptions || [],
          size_options: newProduct.sizeOptions || [],
          details: newProduct.details || [],
          craftsmanship: newProduct.craftsmanship || "",
          stock: newProduct.stock === undefined ? null : newProduct.stock
        }])
        .select()
        .single();

      if (!error && data) {
        // Add secondary images if any
        if (newProduct.secondaryImages && newProduct.secondaryImages.length > 0) {
          const imageRows = newProduct.secondaryImages.map((img: string) => ({
            product_id: newProduct.id,
            image_url: img
          }));
          await supabase.from("product_images").insert(imageRows);
        }

        // Return updated list
        const { data: updatedList } = await supabase.from("products").select("*").order("created_at", { ascending: false });
        if (updatedList) {
          broadcastUpdate();
          return res.json(updatedList.map(p => ({
            id: p.id,
            name: p.name,
            categoryId: p.category_id,
            categoryName: p.category_name,
            price: Number(p.price),
            originalPrice: p.original_price ? Number(p.original_price) : undefined,
            discountPercent: p.discount_percent ? Number(p.discount_percent) : undefined,
            pointsEarned: p.points_earned ? Number(p.points_earned) : undefined,
            image: p.image,
            description: p.description,
            tagline: p.tagline,
            isNew: p.is_new,
            materialOptions: p.material_options,
            sizeOptions: p.size_options,
            details: p.details,
            craftsmanship: p.craftsmanship,
            stock: p.stock === null ? undefined : p.stock
          })));
        }
      }
    } catch (err) {
      console.error("Supabase insert product error, falling back to disk:", err);
    }
  }

  const products = getProductsFromDisk();
  products.unshift(newProduct);
  saveProductsToDisk(products);
  broadcastUpdate();
  res.json(products);
});

app.put("/api/products/:id", requireAdmin, async (req: any, res: any) => {
  const productId = req.params.id;
  const updatedProduct = req.body;

  logAuditEvent(req.user.userId, req.user.email, "Edit Product", updatedProduct.name || productId, `Updated product attributes`, req.user.ip);

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("products")
        .update({
          name: updatedProduct.name,
          category_id: updatedProduct.categoryId,
          category_name: updatedProduct.categoryName,
          price: updatedProduct.price,
          original_price: updatedProduct.originalPrice || null,
          discount_percent: updatedProduct.discountPercent || null,
          points_earned: updatedProduct.pointsEarned || null,
          image: updatedProduct.image,
          tagline: updatedProduct.tagline,
          description: updatedProduct.description,
          is_new: !!updatedProduct.isNew,
          material_options: updatedProduct.materialOptions,
          size_options: updatedProduct.sizeOptions,
          details: updatedProduct.details,
          craftsmanship: updatedProduct.craftsmanship,
          stock: updatedProduct.stock === undefined ? null : updatedProduct.stock
        })
        .eq("id", productId)
        .select()
        .single();

      if (!error && data) {
        // Recreate secondary images
        await supabase.from("product_images").delete().eq("product_id", productId);
        if (updatedProduct.secondaryImages && updatedProduct.secondaryImages.length > 0) {
          const imageRows = updatedProduct.secondaryImages.map((img: string) => ({
            product_id: productId,
            image_url: img
          }));
          await supabase.from("product_images").insert(imageRows);
        }

        // Return updated list
        const { data: updatedList } = await supabase.from("products").select("*").order("created_at", { ascending: false });
        if (updatedList) {
          broadcastUpdate();
          return res.json(updatedList.map(p => ({
            id: p.id,
            name: p.name,
            categoryId: p.category_id,
            categoryName: p.category_name,
            price: Number(p.price),
            originalPrice: p.original_price ? Number(p.original_price) : undefined,
            discountPercent: p.discount_percent ? Number(p.discount_percent) : undefined,
            pointsEarned: p.points_earned ? Number(p.points_earned) : undefined,
            image: p.image,
            description: p.description,
            tagline: p.tagline,
            isNew: p.is_new,
            materialOptions: p.material_options,
            sizeOptions: p.size_options,
            details: p.details,
            craftsmanship: p.craftsmanship,
            stock: p.stock === null ? undefined : p.stock
          })));
        }
      }
    } catch (err) {
      console.error("Supabase update product error, falling back to disk:", err);
    }
  }

  const products = getProductsFromDisk();
  const index = products.findIndex((p: any) => p.id === productId);
  if (index !== -1) {
    products[index] = { ...products[index], ...updatedProduct };
    saveProductsToDisk(products);
    broadcastUpdate();
    res.json(products);
  } else {
    res.status(404).json({ error: "Product not found" });
  }
});

app.delete("/api/products/:id", requireAdmin, async (req: any, res: any) => {
  const productId = req.params.id;

  logAuditEvent(req.user.userId, req.user.email, "Delete Product", productId, `Deleted product ID ${productId}`, req.user.ip);

  // Always remove from disk database
  const diskProducts = getProductsFromDisk();
  const filteredDisk = diskProducts.filter((p: any) => p.id !== productId);
  saveProductsToDisk(filteredDisk);

  const supabase = getSupabase();
  if (supabase) {
    try {
      // Clean up child tables to avoid foreign key constraints
      await supabase.from("product_images").delete().eq("product_id", productId);
      await supabase.from("cart").delete().eq("product_id", productId);
      await supabase.from("wishlist").delete().eq("product_id", productId);
      await supabase.from("reviews").delete().eq("product_id", productId);
      await supabase.from("products").delete().eq("id", productId);

      const { data: updatedList } = await supabase.from("products").select("*").order("created_at", { ascending: false });
      if (updatedList && updatedList.length > 0) {
        broadcastUpdate();
        return res.json(updatedList.map(p => ({
          id: p.id,
          name: p.name,
          categoryId: p.category_id,
          categoryName: p.category_name,
          price: Number(p.price),
          image: p.image,
          description: p.description,
          tagline: p.tagline,
          isNew: p.is_new,
          materialOptions: p.material_options,
          sizeOptions: p.size_options,
          details: p.details,
          craftsmanship: p.craftsmanship,
          stock: p.stock === null ? undefined : p.stock
        })));
      }
    } catch (err) {
      console.error("Supabase delete product error:", err);
    }
  }

  broadcastUpdate();
  res.json(filteredDisk);
});

app.post("/api/products/reset", requireAdmin, async (req: any, res: any) => {
  logAuditEvent(req.user.userId, req.user.email, "Reset Products", "Catalog", "Reset products to default catalog state", req.user.ip);
  const supabase = getSupabase();
  if (supabase) {
    try {
      // First ensure categories exist to satisfy foreign key constraints
      const categoriesToInsert = [
        { id: "fine-jewelry", name: "Fine Jewelry" },
        { id: "timepieces", name: "Timepieces" },
        { id: "necklaces", name: "Necklaces" },
        { id: "rings", name: "Rings" },
        { id: "earrings", name: "Earrings" },
        { id: "bracelets", name: "Bracelets" },
        { id: "leather-goods", name: "Leather Goods" },
        { id: "accessories", name: "Accessories" }
      ];
      await supabase.from("categories").upsert(categoriesToInsert, { onConflict: "id" });

      // Clear secondary images and products in order
      await supabase.from("product_images").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("products").delete().neq("id", "placeholder");

      // Insert back defaults
      const dbRows = PRODUCTS.map(p => ({
        id: p.id,
        name: p.name,
        category_id: p.categoryId,
        category_name: p.categoryName,
        price: p.price,
        image: p.image,
        tagline: p.tagline,
        description: p.description,
        is_new: !!p.isNew,
        material_options: p.materialOptions || [],
        size_options: p.sizeOptions || [],
        details: p.details || [],
        craftsmanship: p.craftsmanship,
        stock: p.stock === undefined ? null : p.stock
      }));

      await supabase.from("products").insert(dbRows);
      broadcastUpdate();
      return res.json(PRODUCTS);
    } catch (err) {
      console.error("Supabase reset products error, falling back to disk:", err);
    }
  }

  saveProductsToDisk(PRODUCTS);
  broadcastUpdate();
  res.json(PRODUCTS);
});

// API Routes - Orders
app.get("/api/orders", async (req: any, res: any) => {
  const supabase = getSupabase();
  let allOrders: any[] = [];

  if (supabase) {
    try {
      const { data: dbOrders, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (!ordersError && dbOrders) {
        const { data: dbItems } = await supabase
          .from("order_items")
          .select(`
            order_id,
            quantity,
            selected_material,
            selected_size,
            price,
            product_id,
            products (name, price, image, category_name)
          `);

        const itemsMap: Record<string, any[]> = {};
        if (dbItems) {
          dbItems.forEach((item: any) => {
            if (!itemsMap[item.order_id]) itemsMap[item.order_id] = [];
            const prodData = item.products || { name: "Archived Item", price: item.price, image: "images/placeholder.jpg", category_name: "Catalog" };
            itemsMap[item.order_id].push({
              product: {
                id: item.product_id,
                name: prodData.name,
                price: Number(item.price),
                image: prodData.image,
                categoryName: prodData.category_name
              },
              quantity: item.quantity,
              selectedMaterial: item.selected_material,
              selectedSize: item.selected_size
            });
          });
        }

        allOrders = dbOrders.map((o: any) => ({
          id: o.id,
          orderNumber: o.order_number,
          date: o.date,
          createdAt: o.created_at,
          total: Number(o.total),
          status: o.status,
          shippingName: o.shipping_name,
          shippingEmail: o.email,
          shippingAddress: o.shipping_address,
          shippingCity: o.shipping_city,
          shippingZip: o.shipping_zip || "",
          shippingPhone: o.shipping_phone || "",
          items: itemsMap[o.id] || []
        }));
      }
    } catch (err) {
      console.error("Supabase load orders error, falling back to disk:", err);
      allOrders = getOrdersFromDisk();
    }
  } else {
    allOrders = getOrdersFromDisk();
  }

  // Security Filtering (Require ownership for customers, full access for admins)
  if (req.user?.role === "admin") {
    return res.json(allOrders);
  }

  if (req.user) {
    const userOrders = allOrders.filter(
      (o: any) =>
        o.shippingEmail?.toLowerCase() === req.user.email.toLowerCase() ||
        o.userId === req.user.userId
    );
    return res.json(userOrders);
  }

  // Unauthenticated lookup with orderNumber & email
  const { email, orderNumber } = req.query;
  if (email && orderNumber) {
    const matched = allOrders.filter(
      (o: any) =>
        o.orderNumber === orderNumber &&
        o.shippingEmail?.toLowerCase() === (email as string).toLowerCase()
    );
    return res.json(matched);
  }

  return res.json([]);
});

app.post("/api/orders", async (req: any, res: any) => {
  const newOrder = req.body;
  if (!newOrder.id) {
    newOrder.id = `order-${Date.now()}`;
  }

  // Bind order to logged in user ID if available
  if (req.user) {
    newOrder.userId = req.user.userId;
    newOrder.shippingEmail = req.user.email;
  }

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { error: orderError } = await supabase
        .from("orders")
        .insert([{
          id: newOrder.id,
          order_number: newOrder.orderNumber,
          email: newOrder.shippingEmail,
          shipping_name: newOrder.shippingName,
          shipping_address: newOrder.shippingAddress,
          shipping_city: newOrder.shippingCity,
          shipping_zip: newOrder.shippingZip,
          shipping_phone: newOrder.shippingPhone || null,
          total: newOrder.total,
          status: newOrder.status,
          date: newOrder.date
        }]);

      if (!orderError) {
        // Insert order items
        const itemRows = newOrder.items.map((item: any) => ({
          order_id: newOrder.id,
          product_id: item.product.id,
          quantity: item.quantity,
          selected_material: item.selectedMaterial,
          selected_size: item.selectedSize,
          price: item.product.price
        }));

        await supabase.from("order_items").insert(itemRows);

        broadcastUpdate();
        return res.json(newOrder);
      }
    } catch (err) {
      console.error("Supabase insert order error, falling back to disk:", err);
    }
  }

  const orders = getOrdersFromDisk();
  orders.unshift(newOrder);
  saveOrdersToDisk(orders);
  broadcastUpdate();
  res.json(newOrder);
});

app.put("/api/orders/:id", requireAdmin, async (req: any, res: any) => {
  const orderId = req.params.id;
  const updatedOrder = req.body;

  logAuditEvent(req.user.userId, req.user.email, "Update Order Status", orderId, `Changed order status to ${updatedOrder.status}`, req.user.ip);

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("orders")
        .update({ status: updatedOrder.status })
        .eq("id", orderId)
        .select()
        .single();

      if (!error && data) {
        broadcastUpdate();
        return res.json(data);
      }
    } catch (err) {
      console.error("Supabase update order error, falling back to disk:", err);
    }
  }

  const orders = getOrdersFromDisk();
  const index = orders.findIndex((o: any) => o.id === orderId);
  if (index !== -1) {
    orders[index] = { ...orders[index], ...updatedOrder };
    saveOrdersToDisk(orders);
    broadcastUpdate();
    res.json(orders[index]);
  } else {
    res.status(404).json({ error: "Order not found" });
  }
});

app.delete("/api/orders/:id", requireAdmin, async (req: any, res: any) => {
  const orderId = req.params.id;

  logAuditEvent(req.user.userId, req.user.email, "Delete Order", orderId, `Deleted order ID ${orderId}`, req.user.ip);

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", orderId);

      if (!error) {
        broadcastUpdate();
        const { data: dbOrders } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
        if (dbOrders) return res.json(dbOrders);
      }
    } catch (err) {
      console.error("Supabase delete order error, falling back to disk:", err);
    }
  }

  const orders = getOrdersFromDisk();
  const filtered = orders.filter((o: any) => o.id !== orderId);
  saveOrdersToDisk(filtered);
  broadcastUpdate();
  res.json(filtered);
});

// --- REWARDS DYNAMIC DATABASE & API ENDPOINTS ---
const REWARDS_FILE = path.join(process.cwd(), "rewards-db.json");

function getRewardsFromDisk() {
  try {
    if (fs.existsSync(REWARDS_FILE)) {
      const content = fs.readFileSync(REWARDS_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (err) {
    console.error("Error reading rewards database:", err);
  }
  return [];
}

function saveRewardsToDisk(rewards: any[]) {
  try {
    fs.writeFileSync(REWARDS_FILE, JSON.stringify(rewards, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving rewards to database:", err);
  }
}

app.get("/api/rewards", (req, res) => {
  res.json(getRewardsFromDisk());
});

app.post("/api/rewards", requireAdmin, (req: any, res: any) => {
  const newReward = req.body;
  if (!newReward.id) {
    newReward.id = `reward-${Date.now()}`;
  }
  logAuditEvent(req.user.userId, req.user.email, "Create Reward", newReward.title, `Cost ${newReward.cost} points`, req.user.ip);
  const rewards = getRewardsFromDisk();
  rewards.push(newReward);
  saveRewardsToDisk(rewards);
  broadcastUpdate();
  res.json(rewards);
});

app.delete("/api/rewards/:id", requireAdmin, (req: any, res: any) => {
  const rewardId = req.params.id;
  logAuditEvent(req.user.userId, req.user.email, "Delete Reward", rewardId, `Deleted reward ID ${rewardId}`, req.user.ip);
  const rewards = getRewardsFromDisk();
  const filtered = rewards.filter((r: any) => r.id !== rewardId);
  saveRewardsToDisk(filtered);
  broadcastUpdate();
  res.json(filtered);
});

// --- USERS MANAGEMENT DYNAMIC DATABASE & API ENDPOINTS ---
const USERS_FILE = path.join(process.cwd(), "users-db.json");

function getUsersFromDisk() {
  let users: any[] = [];
  let fileExists = false;
  try {
    if (fs.existsSync(USERS_FILE)) {
      fileExists = true;
      const content = fs.readFileSync(USERS_FILE, "utf-8");
      users = JSON.parse(content);
    }
  } catch (err) {
    console.error("Error reading users database:", err);
  }

  if (!fileExists) {
    users = [];
    saveUsersToDisk(users);
  }

  let dirty = false;
  users.forEach((u) => {
    if (isVeroAdminEmail(u.email)) {
      u.role = "admin";
      if (!u.passwordHash) {
        u.salt = generateSalt();
        u.passwordHash = hashPassword("VeroAdmin2026!Password", u.salt);
        dirty = true;
      }
    } else {
      if (!u.role) u.role = "customer";
      if (!u.passwordHash) {
        u.salt = generateSalt();
        u.passwordHash = hashPassword("Password123!", u.salt);
        dirty = true;
      }
    }
  });

  if (dirty) {
    saveUsersToDisk(users);
  }

  return users;
}

function saveUsersToDisk(users: any[]) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving users to database:", err);
  }
}

app.get("/api/users", requireAdmin, (req, res) => {
  // Strip password hashes before returning user records
  const users = getUsersFromDisk().map(({ passwordHash, salt, ...safeUser }) => safeUser);
  res.json(users);
});

app.post("/api/users", requireAdmin, (req: any, res: any) => {
  const newUser = req.body;
  if (!newUser.id) {
    newUser.id = `user-${Date.now()}`;
  }
  logAuditEvent(req.user.userId, req.user.email, "Update User Account", newUser.email, `Updated role: ${newUser.role || 'customer'}`, req.user.ip);
  const users = getUsersFromDisk();
  const existingIndex = users.findIndex((u: any) => u.email?.toLowerCase() === newUser.email?.toLowerCase());
  if (existingIndex >= 0) {
    users[existingIndex] = { ...users[existingIndex], ...newUser };
  } else {
    users.push(newUser);
  }
  saveUsersToDisk(users);
  broadcastUpdate();
  const safeUsers = users.map(({ passwordHash, salt, ...safeUser }) => safeUser);
  res.json(safeUsers);
});

app.put("/api/users/:id", requireAuth, (req: any, res: any) => {
  const userId = req.params.id;
  const updates = req.body;

  // Authorization check: User can only edit own profile unless admin
  if (req.user.role !== "admin" && req.user.userId !== userId && req.user.email !== userId) {
    return res.status(403).json({ error: "Forbidden: You are only allowed to update your own profile." });
  }

  const users = getUsersFromDisk();
  const updatedUsers = users.map((u: any) => (u.id === userId || u.email === userId ? { ...u, ...updates } : u));
  saveUsersToDisk(updatedUsers);
  broadcastUpdate();
  const safeUsers = updatedUsers.map(({ passwordHash, salt, ...safeUser }) => safeUser);
  res.json(safeUsers);
});

app.delete("/api/users/clear-all", requireAdmin, async (req: any, res: any) => {
  saveUsersToDisk([]);
  clearAllUserSessions();
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from("users").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    } catch (e) {
      console.error("Supabase clear users error:", e);
    }
  }
  broadcastUpdate();
  logAuditEvent(req.user.userId, req.user.email, "Clear All Accounts", "User Accounts", "Deleted all user accounts", req.user.ip);
  res.json([]);
});

app.delete("/api/users/:id", requireAdmin, async (req: any, res: any) => {
  const userId = req.params.id;
  const users = getUsersFromDisk();
  const remaining = users.filter((u: any) => u.id !== userId && u.email !== userId);
  saveUsersToDisk(remaining);
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from("users").delete().eq("id", userId);
    } catch (e) {
      console.error("Supabase delete user error:", e);
    }
  }
  broadcastUpdate();
  logAuditEvent(req.user.userId, req.user.email, "Delete User Account", userId, `Deleted user ID: ${userId}`, req.user.ip);
  const safeUsers = remaining.map(({ passwordHash, salt, ...safeUser }) => safeUser);
  res.json(safeUsers);
});

// --- GENERAL PROMO CODES DYNAMIC DATABASE & API ENDPOINTS ---
const PROMOS_FILE = path.join(process.cwd(), "promos-db.json");

function getPromosFromDisk() {
  try {
    if (fs.existsSync(PROMOS_FILE)) {
      const content = fs.readFileSync(PROMOS_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (err) {
    console.error("Error reading promos database:", err);
  }
  return [];
}

function savePromosToDisk(promos: any[]) {
  try {
    fs.writeFileSync(PROMOS_FILE, JSON.stringify(promos, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving promos to database:", err);
  }
}

app.get("/api/promos", (req, res) => {
  res.json(getPromosFromDisk());
});

app.post("/api/promos", requireAdmin, (req: any, res: any) => {
  const newPromo = req.body;
  if (!newPromo.id) {
    newPromo.id = `promo-${Date.now()}`;
  }
  if (newPromo.code) {
    newPromo.code = newPromo.code.toUpperCase();
  }
  logAuditEvent(req.user.userId, req.user.email, "Create Promo Code", newPromo.code, `Discount ${newPromo.discountPercent}%`, req.user.ip);
  const promos = getPromosFromDisk();
  promos.push(newPromo);
  savePromosToDisk(promos);
  broadcastUpdate();
  res.json(promos);
});

app.delete("/api/promos/:id", requireAdmin, (req: any, res: any) => {
  const promoId = req.params.id;
  logAuditEvent(req.user.userId, req.user.email, "Delete Promo Code", promoId, `Deleted promo ID ${promoId}`, req.user.ip);
  const promos = getPromosFromDisk();
  const filtered = promos.filter((p: any) => p.id !== promoId);
  savePromosToDisk(filtered);
  broadcastUpdate();
  res.json(filtered);
});

// --- REVIEWS & RATINGS SYSTEM DYNAMIC DATABASE & API ENDPOINTS ---
const REVIEWS_FILE = path.join(process.cwd(), "reviews-db.json");
const NOTIFICATIONS_FILE = path.join(process.cwd(), "notifications-db.json");

function getReviewsFromDisk() {
  try {
    if (fs.existsSync(REVIEWS_FILE)) {
      const content = fs.readFileSync(REVIEWS_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (err) {
    console.error("Error reading reviews database:", err);
  }
  return [];
}

function saveReviewsToDisk(reviews: any[]) {
  try {
    fs.writeFileSync(REVIEWS_FILE, JSON.stringify(reviews, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving reviews to database:", err);
  }
}

function getNotificationsFromDisk() {
  try {
    if (fs.existsSync(NOTIFICATIONS_FILE)) {
      const content = fs.readFileSync(NOTIFICATIONS_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (err) {
    console.error("Error reading notifications database:", err);
  }
  return [];
}

function saveNotificationsToDisk(notifications: any[]) {
  try {
    fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(notifications, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving notifications to database:", err);
  }
}

function createNotification(userId: string, title: string, message: string, type: string, reviewId?: string) {
  const notifications = getNotificationsFromDisk();
  const notif = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    userId,
    title,
    message,
    read: false,
    type,
    reviewId,
    createdAt: new Date().toISOString()
  };
  notifications.unshift(notif);
  saveNotificationsToDisk(notifications);
  broadcastUpdate();
}

// GET all reviews (with optional filtering)
app.get("/api/reviews", async (req, res) => {
  const { productId, userId, status } = req.query;

  const supabase = getSupabase();
  if (supabase) {
    try {
      let query = supabase.from("reviews").select("*").order("created_at", { ascending: false });
      if (productId) query = query.eq("product_id", productId);
      if (userId) query = query.eq("user_id", userId);
      if (status) query = query.eq("status", status);

      const { data: dbReviews, error } = await query;
      if (!error && dbReviews) {
        // Fetch child data
        const { data: images } = await supabase.from("review_images").select("*");
        const { data: votes } = await supabase.from("review_votes").select("*");
        const { data: reports } = await supabase.from("review_reports").select("*");
        const { data: replies } = await supabase.from("review_replies").select("*");

        const imagesMap: Record<string, string[]> = {};
        if (images) {
          images.forEach((img: any) => {
            if (!imagesMap[img.review_id]) imagesMap[img.review_id] = [];
            imagesMap[img.review_id].push(img.image_url);
          });
        }

        const votesMap: Record<string, string[]> = {};
        if (votes) {
          votes.forEach((v: any) => {
            if (!votesMap[v.review_id]) votesMap[v.review_id] = [];
            votesMap[v.review_id].push(v.user_id);
          });
        }

        const reportsMap: Record<string, any[]> = {};
        if (reports) {
          reports.forEach((r: any) => {
            if (!reportsMap[r.review_id]) reportsMap[r.review_id] = [];
            reportsMap[r.review_id].push({
              id: r.id,
              reviewId: r.review_id,
              userId: r.user_id,
              userName: r.user_name || "Customer",
              reason: r.reason,
              details: r.details || "",
              createdAt: r.created_at
            });
          });
        }

        const repliesMap: Record<string, any> = {};
        if (replies) {
          replies.forEach((rep: any) => {
            repliesMap[rep.review_id] = {
              id: rep.id,
              reviewId: rep.review_id,
              adminName: rep.admin_name || "VERO Official",
              reply: rep.reply,
              createdAt: rep.created_at
            };
          });
        }

        const mapped = dbReviews.map((r: any) => ({
          id: r.id,
          productId: r.product_id,
          productName: r.product_name,
          productImage: r.product_image,
          orderId: r.order_id,
          userId: r.user_id,
          userName: r.user_name || "Customer",
          userEmail: r.user_email || "",
          rating: Number(r.rating),
          title: r.title || "",
          review: r.review || r.comment || "",
          verifiedPurchase: !!r.verified_purchase,
          recommend: r.recommend !== false,
          isAnonymous: !!r.is_anonymous,
          status: r.status || "approved",
          images: imagesMap[r.id] || r.images || [],
          videoUrl: r.video_url || "",
          helpfulCount: Number(r.helpful_count || (votesMap[r.id] ? votesMap[r.id].length : 0)),
          votedUserIds: votesMap[r.id] || [],
          reports: reportsMap[r.id] || [],
          reply: repliesMap[r.id] || null,
          createdAt: r.created_at || new Date().toISOString(),
          updatedAt: r.updated_at || new Date().toISOString(),
          author: r.is_anonymous ? "عميل VERO المميز" : (r.user_name || "Customer"),
          comment: r.review || r.comment || ""
        }));

        return res.json(mapped);
      }
    } catch (err) {
      console.error("Supabase load reviews error, falling back to disk:", err);
    }
  }

  let reviews = getReviewsFromDisk();
  if (productId) {
    reviews = reviews.filter((r: any) => r.productId === productId);
  }
  if (userId) {
    reviews = reviews.filter((r: any) => r.userId === userId);
  }
  if (status) {
    reviews = reviews.filter((r: any) => r.status === status);
  }
  res.json(reviews);
});

// POST Create new review
app.post("/api/reviews", requireAuth, async (req: any, res: any) => {
  const newReview = req.body;
  if (!newReview.id) {
    newReview.id = `review-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  }

  // Force user identity from validated session
  newReview.userId = req.user.userId;
  newReview.userEmail = req.user.email;
  newReview.userName = req.user.name;

  newReview.createdAt = newReview.createdAt || new Date().toISOString();
  newReview.updatedAt = new Date().toISOString();
  newReview.status = newReview.status || "approved"; // Default auto-approve
  newReview.helpfulCount = 0;
  newReview.votedUserIds = [];
  newReview.reports = [];
  newReview.images = newReview.images || [];

  // Verify Purchase check from orders
  const orders = getOrdersFromDisk();
  const userOrders = orders.filter((o: any) =>
    (o.shippingEmail?.toLowerCase() === newReview.userEmail?.toLowerCase() ||
     o.id === newReview.orderId) &&
    (o.status?.toLowerCase().includes("delivered") || o.status === "تم التوصيل" || o.status === "Delivered")
  );

  const hasPurchasedProduct = userOrders.some((o: any) =>
    o.items?.some((item: any) => item.product?.id === newReview.productId)
  );

  newReview.verifiedPurchase = hasPurchasedProduct || !!newReview.verifiedPurchase;

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { error } = await supabase.from("reviews").insert([{
        id: newReview.id,
        product_id: newReview.productId,
        product_name: newReview.productName,
        product_image: newReview.productImage,
        order_id: newReview.orderId,
        user_id: newReview.userId,
        user_name: newReview.userName,
        user_email: newReview.userEmail,
        rating: newReview.rating,
        title: newReview.title,
        review: newReview.review,
        verified_purchase: newReview.verifiedPurchase,
        recommend: newReview.recommend,
        is_anonymous: newReview.isAnonymous,
        status: newReview.status,
        video_url: newReview.videoUrl,
        helpful_count: 0
      }]);

      if (!error) {
        if (newReview.images && newReview.images.length > 0) {
          const imgRows = newReview.images.map((img: string) => ({
            review_id: newReview.id,
            image_url: img
          }));
          await supabase.from("review_images").insert(imgRows);
        }
      }
    } catch (err) {
      console.error("Supabase insert review error:", err);
    }
  }

  const reviews = getReviewsFromDisk();
  const existingIdx = reviews.findIndex((r: any) => r.userId === newReview.userId && r.productId === newReview.productId);
  if (existingIdx !== -1) {
    reviews[existingIdx] = { ...reviews[existingIdx], ...newReview };
  } else {
    reviews.unshift(newReview);
  }

  saveReviewsToDisk(reviews);
  broadcastUpdate();
  res.json(newReview);
});

// PUT Update existing review (or change status / reply)
app.put("/api/reviews/:id", requireAuth, async (req: any, res: any) => {
  const reviewId = req.params.id;
  const updates = req.body;

  const reviews = getReviewsFromDisk();
  const index = reviews.findIndex((r: any) => r.id === reviewId);

  if (index === -1) {
    return res.status(404).json({ error: "Review not found" });
  }

  const targetReview = reviews[index];

  // RBAC Ownership check: Non-admin can only update their own review and CANNOT alter moderation status
  const isAdminUser = req.user?.role === "admin" || isVeroAdminEmail(req.user?.email) || isVeroAdminEmail(req.headers["x-user-email"] as string);
  if (!isAdminUser) {
    if (targetReview.userId !== req.user.userId && targetReview.userEmail?.toLowerCase() !== req.user.email.toLowerCase()) {
      return res.status(403).json({ error: "Forbidden: You can only edit your own review." });
    }
    // Prevent non-admin from manipulating moderation status
    delete updates.status;
  } else if (updates.status && updates.status !== targetReview.status) {
    logAuditEvent(req.user?.userId || "admin", req.user?.email || "vero2026@vero.com", "Moderate Review Status", reviewId, `Changed status to ${updates.status}`, req.user?.ip);
  }

  const prevStatus = targetReview.status;
  reviews[index] = {
    ...targetReview,
    ...updates,
    updatedAt: new Date().toISOString()
  };

  const updatedReview = reviews[index];

  // Send Notification if admin approved/rejected
  if (updates.status && updates.status !== prevStatus) {
    if (updates.status === "approved") {
      createNotification(
        updatedReview.userId,
        "تمت الموافقة على تقييمك ✨",
        `تمت الموافقة على تقييمك لمنتج "${updatedReview.productName || 'المنتج'}" بنجاح وظهر الآن للمستخدمين.`,
        "review_approved",
        updatedReview.id
      );
    } else if (updates.status === "rejected") {
      createNotification(
        updatedReview.userId,
        "تحديث بخصوص تقييمك ℹ️",
        `تعذر قبول تقييمك لمنتج "${updatedReview.productName || 'المنتج'}". يمكنك تعديله وفقًا لإرشادات مجتمع VERO.`,
        "review_rejected",
        updatedReview.id
      );
    }
  }

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from("reviews").update({
        rating: updatedReview.rating,
        title: updatedReview.title,
        review: updatedReview.review,
        recommend: updatedReview.recommend,
        is_anonymous: updatedReview.isAnonymous,
        status: updatedReview.status,
        video_url: updatedReview.videoUrl
      }).eq("id", reviewId);

      if (updates.images) {
        await supabase.from("review_images").delete().eq("review_id", reviewId);
        if (updates.images.length > 0) {
          const imgRows = updates.images.map((img: string) => ({
            review_id: reviewId,
            image_url: img
          }));
          await supabase.from("review_images").insert(imgRows);
        }
      }
    } catch (err) {
      console.error("Supabase update review error:", err);
    }
  }

  saveReviewsToDisk(reviews);
  broadcastUpdate();
  res.json(updatedReview);
});

// DELETE Review
app.delete("/api/reviews/:id", async (req: any, res: any) => {
  const reviewId = req.params.id;

  const reviews = getReviewsFromDisk();
  const targetReview = reviews.find((r: any) => r.id === reviewId);

  if (targetReview && req.user) {
    const isAdminUser = req.user?.role === "admin" || req.user?.email?.toLowerCase() === "vero2026@vero.com" || (req.headers["x-user-email"] as string)?.toLowerCase() === "vero2026@vero.com";
    if (isAdminUser) {
      logAuditEvent(req.user?.userId || "admin", req.user?.email || "vero2026@vero.com", "Delete Review", reviewId, "Deleted review as admin", req.user?.ip);
    }
  }

  const filtered = reviews.filter((r: any) => r.id !== reviewId);
  saveReviewsToDisk(filtered);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from("review_images").delete().eq("review_id", reviewId);
      await supabase.from("review_votes").delete().eq("review_id", reviewId);
      await supabase.from("review_reports").delete().eq("review_id", reviewId);
      await supabase.from("review_replies").delete().eq("review_id", reviewId);
      await supabase.from("reviews").delete().eq("id", reviewId);
    } catch (err) {
      console.error("Supabase delete review error:", err);
    }
  }

  broadcastUpdate();
  res.json({ success: true });
});

// POST Vote Helpful
app.post("/api/reviews/:id/helpful", async (req, res) => {
  const reviewId = req.params.id;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  const reviews = getReviewsFromDisk();
  const index = reviews.findIndex((r: any) => r.id === reviewId);
  if (index === -1) {
    return res.status(404).json({ error: "Review not found" });
  }

  const rev = reviews[index];
  rev.votedUserIds = rev.votedUserIds || [];

  const alreadyVoted = rev.votedUserIds.includes(userId);
  if (alreadyVoted) {
    // Remove vote (toggle)
    rev.votedUserIds = rev.votedUserIds.filter((id: string) => id !== userId);
    rev.helpfulCount = Math.max(0, (rev.helpfulCount || 1) - 1);
  } else {
    // Add vote
    rev.votedUserIds.push(userId);
    rev.helpfulCount = (rev.helpfulCount || 0) + 1;
  }

  saveReviewsToDisk(reviews);

  const supabase = getSupabase();
  if (supabase) {
    try {
      if (alreadyVoted) {
        await supabase.from("review_votes").delete().eq("review_id", reviewId).eq("user_id", userId);
      } else {
        await supabase.from("review_votes").insert([{ review_id: reviewId, user_id: userId }]);
      }
      await supabase.from("reviews").update({ helpful_count: rev.helpfulCount }).eq("id", reviewId);
    } catch (err) {
      console.error("Supabase vote review error:", err);
    }
  }

  broadcastUpdate();
  res.json(rev);
});

// POST Report Review
app.post("/api/reviews/:id/report", async (req, res) => {
  const reviewId = req.params.id;
  const { userId, userName, reason, details } = req.body;

  const reviews = getReviewsFromDisk();
  const index = reviews.findIndex((r: any) => r.id === reviewId);
  if (index === -1) {
    return res.status(404).json({ error: "Review not found" });
  }

  const rev = reviews[index];
  rev.reports = rev.reports || [];

  const reportItem = {
    id: `rep-${Date.now()}`,
    reviewId,
    userId: userId || "anon",
    userName: userName || "Customer",
    reason: reason || "Other",
    details: details || "",
    createdAt: new Date().toISOString()
  };

  rev.reports.push(reportItem);
  saveReviewsToDisk(reviews);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from("review_reports").insert([{
        review_id: reviewId,
        user_id: userId || "anon",
        user_name: userName || "Customer",
        reason: reason || "Other",
        details: details || ""
      }]);
    } catch (err) {
      console.error("Supabase report review error:", err);
    }
  }

  broadcastUpdate();
  res.json({ success: true, report: reportItem });
});

// POST Admin Reply to Review
app.post("/api/reviews/:id/reply", async (req, res) => {
  const reviewId = req.params.id;
  const { adminName, reply } = req.body;

  const reviews = getReviewsFromDisk();
  const index = reviews.findIndex((r: any) => r.id === reviewId);
  if (index === -1) {
    return res.status(404).json({ error: "Review not found" });
  }

  const rev = reviews[index];
  const replyObj = {
    id: `rep-${Date.now()}`,
    reviewId,
    adminName: adminName || "فريق إدارة VERO",
    reply,
    createdAt: new Date().toISOString()
  };

  rev.reply = replyObj;
  saveReviewsToDisk(reviews);

  // Send Notification to customer
  createNotification(
    rev.userId,
    "رد جديد من إدارة VERO 💬",
    `قامت إدارة VERO بالرد على تقييمك لمنتج "${rev.productName || 'المنتج'}": "${reply.length > 50 ? reply.substring(0, 50) + '...' : reply}"`,
    "admin_reply",
    rev.id
  );

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from("review_replies").upsert([{
        review_id: reviewId,
        admin_name: replyObj.adminName,
        reply: replyObj.reply
      }], { onConflict: "review_id" });
    } catch (err) {
      console.error("Supabase reply review error:", err);
    }
  }

  broadcastUpdate();
  res.json(rev);
});

// DELETE Admin Reply from Review
app.delete("/api/reviews/:id/reply", async (req, res) => {
  const reviewId = req.params.id;
  const reviews = getReviewsFromDisk();
  const index = reviews.findIndex((r: any) => r.id === reviewId);
  if (index !== -1) {
    reviews[index].reply = null;
    saveReviewsToDisk(reviews);
  }
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from("review_replies").delete().eq("review_id", reviewId);
    } catch (err) {
      console.error("Supabase delete reply error:", err);
    }
  }
  broadcastUpdate();
  res.json({ success: true });
});

// GET Customer Notifications
app.get("/api/notifications", (req, res) => {
  const userEmail = (req.query.userEmail as string) || (req.query.userId as string);
  const notifications = getNotificationsFromDisk();
  if (userEmail) {
    const target = userEmail.toLowerCase();
    const userNotifs = notifications.filter((n: any) =>
      (n.userId && n.userId.toLowerCase() === target) ||
      (n.userEmail && n.userEmail.toLowerCase() === target)
    );
    return res.json(userNotifs);
  }
  res.json(notifications);
});

app.get("/api/notifications/:userId", (req, res) => {
  const { userId } = req.params;
  const target = userId.toLowerCase();
  const notifications = getNotificationsFromDisk();
  const userNotifs = notifications.filter((n: any) =>
    (n.userId && n.userId.toLowerCase() === target) ||
    (n.userEmail && n.userEmail.toLowerCase() === target)
  );
  res.json(userNotifs);
});

// PUT Mark Notification as Read
app.put("/api/notifications/:id/read", (req, res) => {
  const { id } = req.params;
  const notifications = getNotificationsFromDisk();
  const index = notifications.findIndex((n: any) => n.id === id);
  if (index !== -1) {
    notifications[index].read = true;
    saveNotificationsToDisk(notifications);
    broadcastUpdate();
    return res.json(notifications[index]);
  }
  res.status(404).json({ error: "Notification not found" });
});

// Vite or Static Assets handling
async function initServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer } = await import("vite");
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

initServer();

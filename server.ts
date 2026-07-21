import dotenv from "dotenv";
// Load environment variables with override so .env.local is respected
dotenv.config({ path: ".env.local", override: true });
dotenv.config({ override: true });

import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

// Import PRODUCTS directly
import { PRODUCTS } from "./src/data.ts";

// Dual ESM/CJS safe resolution of filename and directory
const currentFilename =
  typeof __filename !== "undefined"
    ? __filename
    : fileURLToPath(import.meta.url);
const currentDirname =
  typeof __dirname !== "undefined" ? __dirname : path.dirname(currentFilename);

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "products-db.json");
const ORDERS_FILE = path.join(process.cwd(), "orders-db.json");

app.use(express.json());

// Supabase Connection Helpers
const rawUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const rawKey =
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

const SUPABASE_URL = rawUrl.replace(/^['"]|['"]$/g, "").trim();
const SUPABASE_ANON_KEY = rawKey.replace(/^['"]|['"]$/g, "").trim();

function isSupabaseConfigured() {
  return (
    SUPABASE_URL &&
    SUPABASE_URL.startsWith("https://") &&
    SUPABASE_URL !== "https://your-project.supabase.co" &&
    SUPABASE_ANON_KEY &&
    SUPABASE_ANON_KEY !== "your-anon-key" &&
    SUPABASE_ANON_KEY !== "1"
  );
}

let dbClient: any = null;
function getSupabase() {
  if (isSupabaseConfigured()) {
    if (!dbClient) {
      dbClient = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
    }
    return dbClient;
  }
  return null;
}

// Real-time SSE connection tracking
let sseClients: any[] = [];

function broadcastUpdate() {
  console.log(
    `Broadcasting real-time update to ${sseClients.length} connected clients...`,
  );
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
    Connection: "keep-alive",
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

// API Routes - Products
app.get("/api/products", async (req, res) => {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (!productsError && productsData && productsData.length > 0) {
        // Fetch secondary images
        const { data: imagesData } = await supabase
          .from("product_images")
          .select("*");
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
          image: p.image,
          secondaryImages: imagesMap[p.id] || [],
          description: p.description || "",
          tagline: p.tagline || "",
          isNew: p.is_new,
          materialOptions: p.material_options || [],
          sizeOptions: p.size_options || [],
          details: p.details || [],
          craftsmanship: p.craftsmanship || "",
          stock: p.stock === null ? undefined : Number(p.stock),
        }));
        return res.json(mapped);
      }
    } catch (err) {
      console.error("Supabase load products error, falling back to disk:", err);
    }
  }
  res.json(getProductsFromDisk());
});

app.post("/api/products", async (req, res) => {
  const newProduct = req.body;
  if (!newProduct.id) {
    newProduct.id = `custom-${Date.now()}`;
  }

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("products")
        .insert([
          {
            id: newProduct.id,
            name: newProduct.name,
            category_id: newProduct.categoryId || "html",
            category_name: newProduct.categoryName || "HTML",
            price: newProduct.price,
            image: newProduct.image,
            tagline: newProduct.tagline || "",
            description: newProduct.description || "",
            is_new: !!newProduct.isNew,
            material_options: newProduct.materialOptions || [],
            size_options: newProduct.sizeOptions || [],
            details: newProduct.details || [],
            craftsmanship: newProduct.craftsmanship || "",
            stock: newProduct.stock === undefined ? null : newProduct.stock,
          },
        ])
        .select()
        .single();

      if (!error && data) {
        // Add secondary images if any
        if (
          newProduct.secondaryImages &&
          newProduct.secondaryImages.length > 0
        ) {
          const imageRows = newProduct.secondaryImages.map((img: string) => ({
            product_id: newProduct.id,
            image_url: img,
          }));
          await supabase.from("product_images").insert(imageRows);
        }

        // Return updated list
        const { data: updatedList } = await supabase
          .from("products")
          .select("*")
          .order("created_at", { ascending: false });
        if (updatedList) {
          broadcastUpdate();
          return res.json(
            updatedList.map((p) => ({
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
              stock: p.stock === null ? undefined : p.stock,
            })),
          );
        }
      }
    } catch (err) {
      console.error(
        "Supabase insert product error, falling back to disk:",
        err,
      );
    }
  }

  const products = getProductsFromDisk();
  products.unshift(newProduct);
  saveProductsToDisk(products);
  broadcastUpdate();
  res.json(products);
});

app.put("/api/products/:id", async (req, res) => {
  const productId = req.params.id;
  const updatedProduct = req.body;

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
          image: updatedProduct.image,
          tagline: updatedProduct.tagline,
          description: updatedProduct.description,
          is_new: !!updatedProduct.isNew,
          material_options: updatedProduct.materialOptions,
          size_options: updatedProduct.sizeOptions,
          details: updatedProduct.details,
          craftsmanship: updatedProduct.craftsmanship,
          stock:
            updatedProduct.stock === undefined ? null : updatedProduct.stock,
        })
        .eq("id", productId)
        .select()
        .single();

      if (!error && data) {
        // Recreate secondary images
        await supabase
          .from("product_images")
          .delete()
          .eq("product_id", productId);
        if (
          updatedProduct.secondaryImages &&
          updatedProduct.secondaryImages.length > 0
        ) {
          const imageRows = updatedProduct.secondaryImages.map(
            (img: string) => ({
              product_id: productId,
              image_url: img,
            }),
          );
          await supabase.from("product_images").insert(imageRows);
        }

        // Return updated list
        const { data: updatedList } = await supabase
          .from("products")
          .select("*")
          .order("created_at", { ascending: false });
        if (updatedList) {
          broadcastUpdate();
          return res.json(
            updatedList.map((p) => ({
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
              stock: p.stock === null ? undefined : p.stock,
            })),
          );
        }
      }
    } catch (err) {
      console.error(
        "Supabase update product error, falling back to disk:",
        err,
      );
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

app.delete("/api/products/:id", async (req, res) => {
  const productId = req.params.id;

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", productId);

      if (!error) {
        const { data: updatedList } = await supabase
          .from("products")
          .select("*")
          .order("created_at", { ascending: false });
        if (updatedList) {
          broadcastUpdate();
          return res.json(
            updatedList.map((p) => ({
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
              stock: p.stock === null ? undefined : p.stock,
            })),
          );
        }
      }
    } catch (err) {
      console.error(
        "Supabase delete product error, falling back to disk:",
        err,
      );
    }
  }

  const products = getProductsFromDisk();
  const filtered = products.filter((p: any) => p.id !== productId);
  saveProductsToDisk(filtered);
  broadcastUpdate();
  res.json(filtered);
});

app.post("/api/products/reset", async (req, res) => {
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
        { id: "accessories", name: "Accessories" },
      ];
      await supabase
        .from("categories")
        .upsert(categoriesToInsert, { onConflict: "id" });

      // Clear secondary images and products in order
      await supabase
        .from("product_images")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("products").delete().neq("id", "placeholder");

      // Insert back defaults
      const dbRows = PRODUCTS.map((p) => ({
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
        stock: p.stock === undefined ? null : p.stock,
      }));

      await supabase.from("products").insert(dbRows);
      broadcastUpdate();
      return res.json(PRODUCTS);
    } catch (err) {
      console.error(
        "Supabase reset products error, falling back to disk:",
        err,
      );
    }
  }

  saveProductsToDisk(PRODUCTS);
  broadcastUpdate();
  res.json(PRODUCTS);
});

// API Routes - Orders
app.get("/api/orders", async (req, res) => {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data: dbOrders, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (!ordersError && dbOrders) {
        const { data: dbItems } = await supabase.from("order_items").select(`
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
            const prodData = item.products || {
              name: "Archived Item",
              price: item.price,
              image: "images/placeholder.jpg",
              category_name: "Catalog",
            };
            itemsMap[item.order_id].push({
              product: {
                id: item.product_id,
                name: prodData.name,
                price: Number(item.price),
                image: prodData.image,
                categoryName: prodData.category_name,
              },
              quantity: item.quantity,
              selectedMaterial: item.selected_material,
              selectedSize: item.selected_size,
            });
          });
        }

        const mappedOrders = dbOrders.map((o: any) => ({
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
          items: itemsMap[o.id] || [],
        }));
        return res.json(mappedOrders);
      }
    } catch (err) {
      console.error("Supabase load orders error, falling back to disk:", err);
    }
  }

  const orders = getOrdersFromDisk();
  res.json(orders);
});

app.post("/api/orders", async (req, res) => {
  const newOrder = req.body;
  if (!newOrder.id) {
    newOrder.id = `order-${Date.now()}`;
  }

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { error: orderError } = await supabase.from("orders").insert([
        {
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
          date: newOrder.date,
        },
      ]);

      if (!orderError) {
        // Insert order items
        const itemRows = newOrder.items.map((item: any) => ({
          order_id: newOrder.id,
          product_id: item.product.id,
          quantity: item.quantity,
          selected_material: item.selectedMaterial,
          selected_size: item.selectedSize,
          price: item.product.price,
        }));

        await supabase.from("order_items").insert(itemRows);

        // Fetch updated list
        const { data: dbOrders } = await supabase
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false });
        if (dbOrders) {
          // Re-fetch everything and trigger updates
          broadcastUpdate();
          return res.json(dbOrders);
        }
      }
    } catch (err) {
      console.error("Supabase insert order error, falling back to disk:", err);
    }
  }

  const orders = getOrdersFromDisk();
  orders.unshift(newOrder);
  saveOrdersToDisk(orders);
  broadcastUpdate();
  res.json(orders);
});

app.put("/api/orders/:id", async (req, res) => {
  const orderId = req.params.id;
  const updatedOrder = req.body;

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

app.delete("/api/orders/:id", async (req, res) => {
  const orderId = req.params.id;

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", orderId);

      if (!error) {
        broadcastUpdate();
        const { data: dbOrders } = await supabase
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false });
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
  return []; // Empty by default so the admin is the one who adds them!
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

app.post("/api/rewards", (req, res) => {
  const newReward = req.body;
  if (!newReward.id) {
    newReward.id = `reward-${Date.now()}`;
  }
  const rewards = getRewardsFromDisk();
  rewards.push(newReward);
  saveRewardsToDisk(rewards);
  broadcastUpdate();
  res.json(rewards);
});

app.delete("/api/rewards/:id", (req, res) => {
  const rewardId = req.params.id;
  const rewards = getRewardsFromDisk();
  const filtered = rewards.filter((r: any) => r.id !== rewardId);
  saveRewardsToDisk(filtered);
  broadcastUpdate();
  res.json(filtered);
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
  return []; // Empty by default so the admin is the one who adds them!
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

app.post("/api/promos", (req, res) => {
  const newPromo = req.body;
  if (!newPromo.id) {
    newPromo.id = `promo-${Date.now()}`;
  }
  // Ensure uppercase code
  if (newPromo.code) {
    newPromo.code = newPromo.code.toUpperCase();
  }
  const promos = getPromosFromDisk();
  promos.push(newPromo);
  savePromosToDisk(promos);
  broadcastUpdate();
  res.json(promos);
});

app.delete("/api/promos/:id", (req, res) => {
  const promoId = req.params.id;
  const promos = getPromosFromDisk();
  const filtered = promos.filter((p: any) => p.id !== promoId);
  savePromosToDisk(filtered);
  broadcastUpdate();
  res.json(filtered);
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

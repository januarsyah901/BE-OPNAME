import dotenv from "dotenv";
dotenv.config();

import prisma from "../config/prisma";
import bcrypt from "bcryptjs";

// ─────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────
const log = (section: string) => console.log(`✅ [${section}] seeded`);
const err = (section: string, e: any) =>
  console.error(`❌ [${section}] ERROR:`, e.message);

function generateSKU(categoryName: string, id: number): string {
  const prefix = categoryName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .substring(0, 3);
  return `AS-${prefix}-${String(id).padStart(4, "0")}`;
}

// ─────────────────────────────────────────────
// SEEDER FUNCTIONS
// ─────────────────────────────────────────────

async function cleanDatabase() {
  console.log("🧹 Membersihkan database...");
  // Hapus dengan urutan yang benar (child first)
  await prisma.stock_movements.deleteMany();
  await prisma.transaction_items.deleteMany();
  await prisma.transactions.deleteMany();
  await prisma.wa_notifications.deleteMany();
  await prisma.stock_opname_items.deleteMany();
  await prisma.stock_opnames.deleteMany();
  await prisma.work_orders.deleteMany();
  await prisma.service_catalog.deleteMany();
  await prisma.vehicles.deleteMany();
  await prisma.customers.deleteMany();
  await prisma.spare_parts.deleteMany();
  await prisma.categories.deleteMany();
  // Sisakan users tapi kita akan upsert
  console.log("✨ Database bersih.");
}

async function seedUsers() {
  const users = [
    {
      name: "Owner Bengkel",
      username: "owner",
      password: "owner123",
      role: "owner",
    },
    {
      name: "Admin Utama",
      username: "admin",
      password: "admin123",
      role: "admin",
    },
    {
      name: "Kasir Satu",
      username: "kasir1",
      password: "kasir123",
      role: "kasir",
    },
  ];

  for (const u of users) {
    try {
      const password_hash = bcrypt.hashSync(u.password, 10);
      await prisma.users.upsert({
        where: { username: u.username },
        update: {
          password_hash,
          role: u.role,
          deleted_at: null,
        },
        create: {
          name: u.name,
          username: u.username,
          password_hash,
          role: u.role,
        },
      });
    } catch (e: any) {
      err(`User: ${u.username}`, e);
    }
  }
  log("Users");
}

async function seedBengkelProfile() {
  try {
    await prisma.bengkel_profile.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        name: "Bengkel AutoService",
        address: "Jl. Raya Bandung No. 99, Cimahi, Jawa Barat",
        phone: "022-6123456",
        wa_gateway_token: null,
        wa_target_number: null,
      },
    });
    log("BengkelProfile");
  } catch (e: any) {
    err("BengkelProfile", e);
  }
}

async function seedCategories() {
  const categories = [
    { name: "Oli & Pelumas", description: "Semua jenis oli mesin dan pelumas" },
    { name: "Filter", description: "Filter oli, udara, bensin, AC" },
    { name: "Rem", description: "Kampas rem, disc brake, minyak rem" },
    { name: "Kelistrikan", description: "Aki, busi, kabel, lampu" },
    { name: "Pendingin Mesin", description: "Radiator, coolant, thermostat" },
    { name: "Suspensi", description: "Shock absorber, per, ball joint" },
    { name: "Belt & Rantai", description: "Timing belt, v-belt, chain kit" },
  ];

  for (const cat of categories) {
    try {
      const existing = await prisma.categories.findFirst({
        where: { name: cat.name },
      });
      if (!existing) {
        await prisma.categories.create({ data: cat });
      }
    } catch (e: any) {
      err(`Category: ${cat.name}`, e);
    }
  }
  log("Categories");
}

async function seedSpareParts() {
  const cats = await prisma.categories.findMany({
    select: { id: true, name: true },
  });
  const catMap: Record<string, number> = {};
  cats.forEach((c) => {
    catMap[c.name] = c.id;
  });

  const parts = [
    // Oli
    {
      category: "Oli & Pelumas",
      name: "Oli Mesin 10W-40 1L",
      cost: 45000,
      sell: 65000,
      stock: 50,
      min: 10,
      unit: "liter",
    },
    {
      category: "Oli & Pelumas",
      name: "Oli Mesin 10W-40 4L",
      cost: 160000,
      sell: 220000,
      stock: 30,
      min: 5,
      unit: "galon",
    },
    {
      category: "Oli & Pelumas",
      name: "Oli Transmisi Matic",
      cost: 55000,
      sell: 80000,
      stock: 20,
      min: 5,
      unit: "liter",
    },
    {
      category: "Oli & Pelumas",
      name: "Oli Gardan",
      cost: 30000,
      sell: 45000,
      stock: 25,
      min: 5,
      unit: "liter",
    },
    // Filter
    {
      category: "Filter",
      name: "Filter Oli Toyota Avanza",
      cost: 18000,
      sell: 30000,
      stock: 40,
      min: 10,
      unit: "pcs",
    },
    {
      category: "Filter",
      name: "Filter Udara Honda Jazz",
      cost: 25000,
      sell: 45000,
      stock: 20,
      min: 5,
      unit: "pcs",
    },
    {
      category: "Filter",
      name: "Filter Bensin Universal",
      cost: 15000,
      sell: 28000,
      stock: 30,
      min: 8,
      unit: "pcs",
    },
    // Rem
    {
      category: "Rem",
      name: "Kampas Rem Depan Avanza",
      cost: 85000,
      sell: 130000,
      stock: 15,
      min: 4,
      unit: "set",
    },
    {
      category: "Rem",
      name: "Kampas Rem Belakang Avanza",
      cost: 70000,
      sell: 110000,
      stock: 15,
      min: 4,
      unit: "set",
    },
    {
      category: "Rem",
      name: "Minyak Rem DOT 3",
      cost: 20000,
      sell: 35000,
      stock: 20,
      min: 5,
      unit: "botol",
    },
    // Kelistrikan
    {
      category: "Kelistrikan",
      name: "Aki Kering 45Ah",
      cost: 450000,
      sell: 580000,
      stock: 8,
      min: 2,
      unit: "pcs",
    },
    {
      category: "Kelistrikan",
      name: "Busi NGK Standard",
      cost: 18000,
      sell: 28000,
      stock: 60,
      min: 12,
      unit: "pcs",
    },
    {
      category: "Kelistrikan",
      name: "Busi NGK Iridium",
      cost: 55000,
      sell: 85000,
      stock: 20,
      min: 4,
      unit: "pcs",
    },
    // Pendingin
    {
      category: "Pendingin Mesin",
      name: "Coolant Prestone 1L",
      cost: 28000,
      sell: 45000,
      stock: 25,
      min: 5,
      unit: "liter",
    },
    {
      category: "Pendingin Mesin",
      name: "Thermostat Universal",
      cost: 45000,
      sell: 75000,
      stock: 10,
      min: 3,
      unit: "pcs",
    },
    // Suspensi
    {
      category: "Suspensi",
      name: "Shock Absorber Depan Avanza",
      cost: 280000,
      sell: 380000,
      stock: 6,
      min: 2,
      unit: "pcs",
    },
    // Belt
    {
      category: "Belt & Rantai",
      name: "V-Belt Honda Beat",
      cost: 35000,
      sell: 55000,
      stock: 20,
      min: 5,
      unit: "pcs",
    },
    {
      category: "Belt & Rantai",
      name: "Timing Belt Toyota",
      cost: 120000,
      sell: 200000,
      stock: 8,
      min: 2,
      unit: "pcs",
    },
  ];

  for (const p of parts) {
    try {
      const category_id = catMap[p.category] ?? null;
      const existing = await prisma.spare_parts.findFirst({
        where: { name: p.name, deleted_at: null },
      });
      if (existing) continue;

      // Insert dulu dengan SKU temp
      const inserted = await prisma.spare_parts.create({
        data: {
          category_id,
          name: p.name,
          sku: `TEMP-${Date.now()}-${Math.random()}`,
          cost_price: p.cost,
          sell_price: p.sell,
          current_stock: p.stock,
          minimum_stock: p.min,
          unit: p.unit,
        },
      });

      // Update dengan SKU yang benar
      const sku = generateSKU(p.category, inserted.id);
      await prisma.spare_parts.update({
        where: { id: inserted.id },
        data: { sku, barcode_value: sku },
      });
    } catch (e: any) {
      err(`SparePart: ${p.name}`, e);
    }
  }
  log("Spare Parts");
}

async function seedCustomers() {
  const customers = [
    {
      name: "Andi Susanto",
      phone: "081234567890",
      email: "andi@email.com",
      address: "Jl. Merdeka No. 10, Bandung",
    },
    {
      name: "Siti Rahayu",
      phone: "082345678901",
      email: "siti@email.com",
      address: "Jl. Sudirman No. 25, Jakarta",
    },
    {
      name: "Budi Santoso",
      phone: "083456789012",
      email: "budi_s@email.com",
      address: "Jl. Gatot Subroto No. 5, Bandung",
    },
    {
      name: "Dewi Anggraini",
      phone: "084567890123",
      email: "dewi@email.com",
      address: "Jl. Ahmad Yani No. 88",
    },
    {
      name: "Rizky Pratama",
      phone: "085678901234",
      email: null,
      address: "Jl. Raya Cimahi No. 12",
    },
  ];

  for (const c of customers) {
    try {
      const existing = await prisma.customers.findFirst({
        where: { phone: c.phone, deleted_at: null },
      });
      if (!existing) {
        await prisma.customers.create({ data: c });
      }
    } catch (e: any) {
      err(`Customer: ${c.name}`, e);
    }
  }
  log("Customers");
}

async function seedVehicles() {
  const customers = await prisma.customers.findMany({
    where: { deleted_at: null },
    orderBy: { id: "asc" },
  });
  if (!customers.length) return;

  const vehicles = [
    {
      customer_idx: 0,
      plate_number: "D 1234 ABC",
      type: "mobil",
      brand: "Toyota",
      model: "Avanza",
      year: 2019,
    },
    {
      customer_idx: 0,
      plate_number: "D 5678 XYZ",
      type: "motor",
      brand: "Honda",
      model: "Beat",
      year: 2021,
    },
    {
      customer_idx: 1,
      plate_number: "B 4321 DEF",
      type: "mobil",
      brand: "Honda",
      model: "Jazz",
      year: 2018,
    },
    {
      customer_idx: 2,
      plate_number: "D 9999 GHI",
      type: "mobil",
      brand: "Suzuki",
      model: "Ertiga",
      year: 2020,
    },
    {
      customer_idx: 3,
      plate_number: "F 1111 JKL",
      type: "motor",
      brand: "Yamaha",
      model: "NMAX",
      year: 2022,
    },
    {
      customer_idx: 4,
      plate_number: "D 7777 MNO",
      type: "mobil",
      brand: "Daihatsu",
      model: "Terios",
      year: 2017,
    },
  ];

  for (const v of vehicles) {
    try {
      const customer_id = customers[v.customer_idx]?.id;
      if (!customer_id) continue;
      await prisma.vehicles.upsert({
        where: { plate_number: v.plate_number },
        update: {},
        create: {
          customer_id,
          plate_number: v.plate_number,
          type: v.type,
          brand: v.brand,
          model: v.model,
          year: v.year,
        },
      });
    } catch (e: any) {
      err(`Vehicle: ${v.plate_number}`, e);
    }
  }
  log("Vehicles");
}

async function seedServiceCatalog() {
  const services = [
    {
      name: "Ganti Oli Mesin",
      description: "Penggantian oli mesin standar",
      kategori: "Mesin",
      standard_price: 100000,
      durasi_estimasi: "30 menit",
      berlaku_untuk: "keduanya",
      garansi: null,
      is_active: true,
    },
    {
      name: "Tune Up Lengkap",
      description: "Tune up busi, filter udara, karburator",
      kategori: "Mesin",
      standard_price: 250000,
      durasi_estimasi: "2-3 jam",
      berlaku_untuk: "mobil",
      garansi: "1 bulan",
      is_active: true,
    },
    {
      name: "Ganti Kampas Rem",
      description: "Penggantian kampas rem depan/belakang",
      kategori: "Rem & Transmisi",
      standard_price: 150000,
      durasi_estimasi: "1-2 jam",
      berlaku_untuk: "keduanya",
      garansi: "3 bulan",
      is_active: true,
    },
    {
      name: "Servis AC",
      description: "Cuci evaporator, isi freon, cek kompressor",
      kategori: "AC & Kabin",
      standard_price: 350000,
      durasi_estimasi: "2-3 jam",
      berlaku_untuk: "mobil",
      garansi: null,
      is_active: true,
    },
    {
      name: "Balancing & Spooring",
      description: "Penyeimbangan dan penyelarasan roda",
      kategori: "Lainnya",
      standard_price: 200000,
      durasi_estimasi: "1 jam",
      berlaku_untuk: "mobil",
      garansi: null,
      is_active: true,
    },
  ];

  for (const s of services) {
    try {
      const existing = await prisma.service_catalog.findFirst({
        where: { name: s.name },
      });
      if (!existing) {
        await prisma.service_catalog.create({ data: s });
      }
    } catch (e: any) {
      err(`Service: ${s.name}`, e);
    }
  }
  log("Service Catalog");
}

async function seedTransactions() {
  const customers = await prisma.customers.findMany({
    where: { deleted_at: null },
    orderBy: { id: "asc" },
  });
  const vehicles = await prisma.vehicles.findMany({ orderBy: { id: "asc" } });
  const spareParts = await prisma.spare_parts.findMany({
    where: { deleted_at: null },
    orderBy: { id: "asc" },
  });
  const users = await prisma.users.findMany({
    where: { deleted_at: null },
    orderBy: { id: "asc" },
  });

  if (
    !customers.length ||
    !vehicles.length ||
    !spareParts.length ||
    !users.length
  ) {
    console.warn("⚠️  Data prerequisite belum ada, skip Transactions");
    return;
  }

  const kasir = users[0];

  const txData = [
    {
      customer_id: customers[0].id,
      vehicle_id: vehicles[0].id,
      transaction_date: "2026-02-28",
      payment_method: "cash",
      payment_status: "lunas",
      paid_amount: 215000,
      notes: "Ganti oli + jasa tune up",
      items: [
        {
          item_type: "spare_part",
          spare_part_id: spareParts[0].id,
          item_name: spareParts[0].name,
          quantity: 2,
          unit_price: Number(spareParts[0].sell_price),
        },
        {
          item_type: "jasa",
          spare_part_id: null,
          item_name: "Jasa Tune Up",
          quantity: 1,
          unit_price: 85000,
        },
      ],
    },
    {
      customer_id: customers[1].id,
      vehicle_id: vehicles[2].id,
      transaction_date: "2026-03-01",
      payment_method: "transfer",
      payment_status: "lunas",
      paid_amount: 560000,
      notes: "Servis berkala 10.000 km",
      items: [
        {
          item_type: "spare_part",
          spare_part_id: spareParts[0].id,
          item_name: spareParts[0].name,
          quantity: 4,
          unit_price: Number(spareParts[0].sell_price),
        },
        {
          item_type: "spare_part",
          spare_part_id: spareParts[4].id,
          item_name: spareParts[4].name,
          quantity: 1,
          unit_price: Number(spareParts[4].sell_price),
        },
        {
          item_type: "jasa",
          spare_part_id: null,
          item_name: "Jasa Servis Berkala",
          quantity: 1,
          unit_price: 100000,
        },
      ],
    },
  ];

  for (let i = 0; i < txData.length; i++) {
    const t = txData[i];
    try {
      const total_amount = t.items.reduce(
        (s, item) => s + item.quantity * item.unit_price,
        0,
      );
      const dateStr = t.transaction_date.replace(/-/g, "");
      const invoice_number = `INV-${dateStr}-${String(i + 1).padStart(3, "0")}`;

      const existing = await prisma.transactions.findFirst({
        where: { invoice_number },
      });
      if (existing) continue;

      const trans = await prisma.transactions.create({
        data: {
          customer_id: t.customer_id,
          vehicle_id: t.vehicle_id,
          user_id: kasir.id,
          transaction_date: new Date(t.transaction_date),
          total_amount,
          paid_amount: t.paid_amount,
          payment_method: t.payment_method,
          payment_status: t.payment_status,
          notes: t.notes,
          invoice_number,
        },
      });

      // Insert items
      const itemsToInsert = t.items.map((item) => ({
        transaction_id: trans.id,
        item_type: item.item_type,
        spare_part_id: item.spare_part_id ?? null,
        item_name: item.item_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.quantity * item.unit_price,
      }));
      await prisma.transaction_items.createMany({ data: itemsToInsert });

      // Kurangi stok & catat movement
      for (const item of t.items) {
        if (item.item_type === "spare_part" && item.spare_part_id) {
          const part = await prisma.spare_parts.findUnique({
            where: { id: item.spare_part_id },
            select: { current_stock: true },
          });
          if (part) {
            const newStock = Math.max(0, part.current_stock - item.quantity);
            await prisma.spare_parts.update({
              where: { id: item.spare_part_id },
              data: { current_stock: newStock },
            });
            await prisma.stock_movements.create({
              data: {
                spare_part_id: item.spare_part_id,
                user_id: kasir.id,
                type: "keluar",
                quantity_change: item.quantity,
                stock_before: part.current_stock,
                stock_after: newStock,
                note: `Transaksi ${invoice_number} (seeder)`,
                reference_id: trans.id,
                reference_type: "transaction",
              },
            });
          }
        }
      }
    } catch (e: any) {
      err(`Transaction ${i + 1}`, e);
    }
  }
  log("Transactions");
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────
async function seedVehicleMasters() {
  const masters = [
    { brand: "Toyota", model: "Avanza" },
    { brand: "Toyota", model: "Innova" },
    { brand: "Toyota", model: "Fortuner" },
    { brand: "Toyota", model: "Rush" },
    { brand: "Toyota", model: "Calya" },
    { brand: "Toyota", model: "Agya" },
    { brand: "Honda", model: "Brio" },
    { brand: "Honda", model: "Mobilio" },
    { brand: "Honda", model: "HR-V" },
    { brand: "Honda", model: "CR-V" },
    { brand: "Honda", model: "Jazz" },
    { brand: "Honda", model: "Civic" },
    { brand: "Honda", model: "PCX" },
    { brand: "Honda", model: "Vario" },
    { brand: "Honda", model: "Beat" },
    { brand: "Yamaha", model: "NMAX" },
    { brand: "Yamaha", model: "Aerox" },
    { brand: "Yamaha", model: "Lexi" },
    { brand: "Yamaha", model: "Vixion" },
    { brand: "Yamaha", model: "Mio" },
    { brand: "Suzuki", model: "Ertiga" },
    { brand: "Suzuki", model: "XL7" },
    { brand: "Daihatsu", model: "Xenia" },
    { brand: "Daihatsu", model: "Terios" },
    { brand: "Daihatsu", model: "Sigra" },
    { brand: "Daihatsu", model: "Ayla" },
    { brand: "Mitsubishi", model: "Xpander" },
    { brand: "Mitsubishi", model: "Pajero Sport" },
  ];

  for (const m of masters) {
    try {
      await prisma.vehicle_masters.upsert({
        where: { brand_model: { brand: m.brand, model: m.model } },
        update: {},
        create: m,
      });
    } catch (e: any) {
      err(`VehicleMaster: ${m.brand} ${m.model}`, e);
    }
  }
  log("Vehicle Masters");
}

async function main() {
  console.log("\n🌱 Memulai proses seeding database AutoService...\n");

  await cleanDatabase();
  await seedUsers();
  await seedBengkelProfile();
  await seedCategories();
  await seedSpareParts();
  await seedCustomers();
  await seedVehicleMasters();
  await seedVehicles();
  await seedServiceCatalog();
  await seedTransactions();

  console.log("\n🎉 Seeding selesai! Database siap digunakan.\n");
  console.log("📋 Akun yang tersedia:");
  console.log("   Owner  → username: owner    / password: owner123");
  console.log("   Admin  → username: admin    / password: admin123");
  console.log("   Kasir  → username: kasir1   / password: kasir123");
}

main()
  .catch((e) => {
    console.error("💥 Seeder gagal:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

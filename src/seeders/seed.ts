import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// ─────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────
const log = (section: string) => console.log(`\n✅ [${section}] seeded`);
const err = (section: string, e: any) => console.error(`❌ [${section}] ERROR:`, e.message);

function generateSKU(categoryName: string, id: number): string {
    const prefix = categoryName.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 3);
    return `AS-${prefix}-${String(id).padStart(4, '0')}`;
}

// ─────────────────────────────────────────────
// SEEDER FUNCTIONS
// ─────────────────────────────────────────────

async function seedUsers() {
    const users = [
        { name: 'Admin Utama', email: 'admin@bengkel.com', password: 'admin123', role: 'admin' },
        { name: 'Budi Mekanik', email: 'budi@bengkel.com', password: 'mekanik123', role: 'mekanik' },
        { name: 'Dani Teknisi', email: 'dani@bengkel.com', password: 'mekanik123', role: 'mekanik' },
    ];

    for (const u of users) {
        const password_hash = bcrypt.hashSync(u.password, 10);
        const { error } = await supabase
            .from('users')
            .upsert([{ name: u.name, email: u.email, password_hash, role: u.role }], { onConflict: 'email' });
        if (error) return err('Users', error);
    }
    log('Users');
}

async function seedCategories() {
    const categories = [
        { name: 'Oli & Pelumas', description: 'Semua jenis oli mesin dan pelumas' },
        { name: 'Filter', description: 'Filter oli, udara, bensin, AC' },
        { name: 'Rem', description: 'Kampas rem, disc brake, minyak rem' },
        { name: 'Kelistrikan', description: 'Aki, busi, kabel, lampu' },
        { name: 'Pendingin Mesin', description: 'Radiator, coolant, thermostat' },
        { name: 'Suspensi', description: 'Shock absorber, per, ball joint' },
        { name: 'Belt & Rantai', description: 'Timing belt, v-belt, chain kit' },
    ];

    for (const cat of categories) {
        const { data: existing } = await supabase.from('categories').select('id').eq('name', cat.name).single();
        if (existing) continue;
        const { error: iErr } = await supabase.from('categories').insert([cat]);
        if (iErr) err(`Category: ${cat.name}`, iErr);
    }
    log('Categories');
}

async function seedSpareParts() {
    // Ambil ID kategori yang sudah ada
    const { data: cats } = await supabase.from('categories').select('id, name');
    if (!cats) return;

    const catMap: Record<string, number> = {};
    cats.forEach((c: any) => { catMap[c.name] = c.id; });

    const parts = [
        // Oli
        { category: 'Oli & Pelumas', name: 'Oli Mesin 10W-40 1L', cost: 45000, sell: 65000, stock: 50, min: 10, unit: 'liter' },
        { category: 'Oli & Pelumas', name: 'Oli Mesin 10W-40 4L', cost: 160000, sell: 220000, stock: 30, min: 5, unit: 'galon' },
        { category: 'Oli & Pelumas', name: 'Oli Transmisi Matic', cost: 55000, sell: 80000, stock: 20, min: 5, unit: 'liter' },
        { category: 'Oli & Pelumas', name: 'Oli Gardan', cost: 30000, sell: 45000, stock: 25, min: 5, unit: 'liter' },
        // Filter
        { category: 'Filter', name: 'Filter Oli Toyota Avanza', cost: 18000, sell: 30000, stock: 40, min: 10, unit: 'pcs' },
        { category: 'Filter', name: 'Filter Udara Honda Jazz', cost: 25000, sell: 45000, stock: 20, min: 5, unit: 'pcs' },
        { category: 'Filter', name: 'Filter Bensin Universal', cost: 15000, sell: 28000, stock: 30, min: 8, unit: 'pcs' },
        // Rem
        { category: 'Rem', name: 'Kampas Rem Depan Avanza', cost: 85000, sell: 130000, stock: 15, min: 4, unit: 'set' },
        { category: 'Rem', name: 'Kampas Rem Belakang Avanza', cost: 70000, sell: 110000, stock: 15, min: 4, unit: 'set' },
        { category: 'Rem', name: 'Minyak Rem DOT 3', cost: 20000, sell: 35000, stock: 20, min: 5, unit: 'botol' },
        // Kelistrikan
        { category: 'Kelistrikan', name: 'Aki Kering 45Ah', cost: 450000, sell: 580000, stock: 8, min: 2, unit: 'pcs' },
        { category: 'Kelistrikan', name: 'Busi NGK Standard', cost: 18000, sell: 28000, stock: 60, min: 12, unit: 'pcs' },
        { category: 'Kelistrikan', name: 'Busi NGK Iridium', cost: 55000, sell: 85000, stock: 20, min: 4, unit: 'pcs' },
        // Pendingin
        { category: 'Pendingin Mesin', name: 'Coolant Prestone 1L', cost: 28000, sell: 45000, stock: 25, min: 5, unit: 'liter' },
        { category: 'Pendingin Mesin', name: 'Thermostat Universal', cost: 45000, sell: 75000, stock: 10, min: 3, unit: 'pcs' },
        // Suspensi
        { category: 'Suspensi', name: 'Shock Absorber Depan Avanza', cost: 280000, sell: 380000, stock: 6, min: 2, unit: 'pcs' },
        // Belt
        { category: 'Belt & Rantai', name: 'V-Belt Honda Beat', cost: 35000, sell: 55000, stock: 20, min: 5, unit: 'pcs' },
        { category: 'Belt & Rantai', name: 'Timing Belt Toyota', cost: 120000, sell: 200000, stock: 8, min: 2, unit: 'pcs' },
    ];

    for (const p of parts) {
        const category_id = catMap[p.category];
        // Upsert by name
        const { data: existing } = await supabase.from('spare_parts').select('id').eq('name', p.name).is('deleted_at', null).single();

        if (existing) continue; // Skip jika sudah ada

        // Insert dulu tanpa SKU
        const { data: inserted, error: iErr } = await supabase
            .from('spare_parts')
            .insert([{
                category_id,
                name: p.name,
                sku: 'TEMP',
                barcode_value: 'TEMP',
                cost_price: p.cost,
                sell_price: p.sell,
                current_stock: p.stock,
                minimum_stock: p.min,
                unit: p.unit
            }])
            .select()
            .single();

        if (iErr || !inserted) { err(`SparePart: ${p.name}`, iErr || { message: 'Insert failed' }); continue; }

        // Update dengan SKU yang benar
        const sku = generateSKU(p.category, inserted.id);
        await supabase.from('spare_parts').update({ sku, barcode_value: sku }).eq('id', inserted.id);
    }

    log('Spare Parts');
}

async function seedCustomers() {
    const customers = [
        { name: 'Andi Susanto', phone: '081234567890', email: 'andi@email.com', address: 'Jl. Merdeka No. 10, Bandung' },
        { name: 'Siti Rahayu', phone: '082345678901', email: 'siti@email.com', address: 'Jl. Sudirman No. 25, Jakarta' },
        { name: 'Budi Santoso', phone: '083456789012', email: 'budi_s@email.com', address: 'Jl. Gatot Subroto No. 5, Bandung' },
        { name: 'Dewi Anggraini', phone: '084567890123', email: 'dewi@email.com', address: 'Jl. Ahmad Yani No. 88' },
        { name: 'Rizky Pratama', phone: '085678901234', email: null, address: 'Jl. Raya Cimahi No. 12' },
    ];

    for (const c of customers) {
        const { data: existing } = await supabase.from('customers').select('id').eq('phone', c.phone).is('deleted_at', null).single();
        if (existing) continue;
        const { error: iErr } = await supabase.from('customers').insert([c]);
        if (iErr) err(`Customer: ${c.name}`, iErr);
    }
    log('Customers');
}

async function seedVehicles() {
    const { data: customers } = await supabase.from('customers').select('id, name').is('deleted_at', null).order('id');
    if (!customers || customers.length === 0) return;

    const vehicles = [
        { customer_idx: 0, plate_number: 'D 1234 ABC', type: 'mobil', brand: 'Toyota', model: 'Avanza', year: 2019 },
        { customer_idx: 0, plate_number: 'D 5678 XYZ', type: 'motor', brand: 'Honda', model: 'Beat', year: 2021 },
        { customer_idx: 1, plate_number: 'B 4321 DEF', type: 'mobil', brand: 'Honda', model: 'Jazz', year: 2018 },
        { customer_idx: 2, plate_number: 'D 9999 GHI', type: 'mobil', brand: 'Suzuki', model: 'Ertiga', year: 2020 },
        { customer_idx: 3, plate_number: 'F 1111 JKL', type: 'motor', brand: 'Yamaha', model: 'NMAX', year: 2022 },
        { customer_idx: 4, plate_number: 'D 7777 MNO', type: 'mobil', brand: 'Daihatsu', model: 'Terios', year: 2017 },
    ];

    for (const v of vehicles) {
        const customer_id = customers[v.customer_idx]?.id;
        if (!customer_id) continue;

        const { error } = await supabase
            .from('vehicles')
            .upsert([{ customer_id, plate_number: v.plate_number, type: v.type, brand: v.brand, model: v.model, year: v.year }], { onConflict: 'plate_number' });

        if (error) err(`Vehicle: ${v.plate_number}`, error);
    }
    log('Vehicles');
}

async function seedSettings() {
    const { error } = await supabase
        .from('settings')
        .upsert([{
            id: 1,
            name: 'Bengkel AutoService',
            address: 'Jl. Raya Bandung No. 99, Cimahi, Jawa Barat',
            phone: '022-6123456',
            wa_gateway_token: null,
            wa_target_number: null
        }], { onConflict: 'id' });

    if (error) return err('Settings', error);
    log('Settings');
}

async function seedTransactions() {
    const { data: customers } = await supabase.from('customers').select('id').is('deleted_at', null).order('id');
    const { data: vehicles } = await supabase.from('vehicles').select('id, customer_id').order('id');
    const { data: spareParts } = await supabase.from('spare_parts').select('id, name, sell_price, current_stock').is('deleted_at', null).order('id');

    if (!customers?.length || !vehicles?.length || !spareParts?.length) {
        console.warn('⚠️  Customers/Vehicles/SpareParts belum ada, skip Transactions');
        return;
    }

    const transactions = [
        {
            customer_id: customers[0].id,
            vehicle_id: vehicles[0].id,
            transaction_date: '2026-02-28',
            payment_method: 'cash',
            payment_status: 'lunas',
            paid_amount: 215000,
            notes: 'Ganti oli + tune up',
            items: [
                { item_type: 'spare_part', spare_part_id: spareParts[0].id, item_name: spareParts[0].name, quantity: 2, unit_price: spareParts[0].sell_price },
                { item_type: 'jasa', spare_part_id: null, item_name: 'Jasa Tune Up', quantity: 1, unit_price: 85000 },
            ]
        },
        {
            customer_id: customers[1].id,
            vehicle_id: vehicles[2].id,
            transaction_date: '2026-03-01',
            payment_method: 'transfer',
            payment_status: 'lunas',
            paid_amount: 560000,
            notes: 'Servis berkala 10.000 km',
            items: [
                { item_type: 'spare_part', spare_part_id: spareParts[0].id, item_name: spareParts[0].name, quantity: 4, unit_price: spareParts[0].sell_price },
                { item_type: 'spare_part', spare_part_id: spareParts[4].id, item_name: spareParts[4].name, quantity: 1, unit_price: spareParts[4].sell_price },
                { item_type: 'jasa', spare_part_id: null, item_name: 'Jasa Servis Berkala', quantity: 1, unit_price: 100000 },
            ]
        },
        {
            customer_id: customers[2].id,
            vehicle_id: vehicles[3].id,
            transaction_date: '2026-03-02',
            payment_method: 'cash',
            payment_status: 'pending',
            paid_amount: 0,
            notes: 'Ganti kampas rem depan',
            items: [
                { item_type: 'spare_part', spare_part_id: spareParts[7].id, item_name: spareParts[7].name, quantity: 1, unit_price: spareParts[7].sell_price },
                { item_type: 'jasa', spare_part_id: null, item_name: 'Jasa Pasang Kampas Rem', quantity: 1, unit_price: 50000 },
            ]
        },
    ];

    for (let i = 0; i < transactions.length; i++) {
        const t = transactions[i];
        const total_amount = t.items.reduce((s, item) => s + (item.quantity * item.unit_price), 0);
        const dateStr = t.transaction_date.replace(/-/g, '');
        const invoice_number = `INV-${dateStr}-${String(i + 1).padStart(3, '0')}`;

        // Cek jika invoice sudah ada
        const { data: existing } = await supabase.from('transactions').select('id').eq('invoice_number', invoice_number).single();
        if (existing) continue;

        const { data: trans, error: tErr } = await supabase
            .from('transactions')
            .insert([{
                customer_id: t.customer_id,
                vehicle_id: t.vehicle_id,
                transaction_date: t.transaction_date,
                total_amount,
                paid_amount: t.paid_amount,
                payment_method: t.payment_method,
                payment_status: t.payment_status,
                notes: t.notes,
                invoice_number
            }])
            .select()
            .single();

        if (tErr || !trans) { err(`Transaction ${invoice_number}`, tErr || { message: 'failed' }); continue; }

        // Insert items & kurangi stok
        const itemsToInsert = t.items.map((item) => ({
            transaction_id: trans.id,
            item_type: item.item_type,
            spare_part_id: item.spare_part_id || null,
            item_name: item.item_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
        }));
        await supabase.from('transaction_items').insert(itemsToInsert);

        // Kurangi stok
        for (const item of t.items) {
            if (item.item_type === 'spare_part' && item.spare_part_id) {
                const { data: part } = await supabase.from('spare_parts').select('current_stock').eq('id', item.spare_part_id).single();
                if (part) {
                    const newStock = Math.max(0, part.current_stock - item.quantity);
                    await supabase.from('spare_parts').update({ current_stock: newStock }).eq('id', item.spare_part_id);
                    await supabase.from('stock_movements').insert([{
                        spare_part_id: item.spare_part_id,
                        type: 'transaction_out',
                        quantity: item.quantity,
                        note: `Transaksi ${invoice_number} (seeder)`
                    }]);
                }
            }
        }
    }

    log('Transactions');
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────
async function main() {
    console.log('🌱 Memulai proses seeding database AutoService...\n');
    console.log(`🔗 Supabase URL: ${process.env.SUPABASE_URL || '(tidak ada — cek .env)'}`);

    await seedUsers();
    await seedCategories();
    await seedSpareParts();
    await seedCustomers();
    await seedVehicles();
    await seedSettings();
    await seedTransactions();

    console.log('\n🎉 Seeding selesai! Database siap digunakan.\n');
    console.log('📋 Akun yang tersedia:');
    console.log('   Admin  → admin@bengkel.com   / admin123');
    console.log('   Mekanik→ budi@bengkel.com    / mekanik123');
    console.log('   Mekanik→ dani@bengkel.com    / mekanik123');
    process.exit(0);
}

main().catch((e) => {
    console.error('💥 Seeder gagal:', e);
    process.exit(1);
});

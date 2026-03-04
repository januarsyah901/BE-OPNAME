"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'AutoService Inventory API',
            version: '1.0.0',
            description: 'API Backend untuk AutoService Inventory Web Panel — Manajemen spare part, transaksi, stok opname, dan laporan bengkel.',
            contact: {
                name: 'AutoService Dev Team'
            }
        },
        servers: [
            {
                url: 'http://localhost:3000/api/v1',
                description: 'Local Development'
            },
            {
                url: 'https://api.autoservice.local/api/v1',
                description: 'Production'
            }
        ],
        components: {
            securitySchemes: {
                BearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Masukkan token JWT. Contoh: `eyJ...`'
                }
            },
            schemas: {
                // ────────────── Response Wrappers ──────────────
                SuccessResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        data: { type: 'object' },
                        message: { type: 'string', example: 'OK' },
                        meta: {
                            type: 'object',
                            properties: {
                                page: { type: 'integer', example: 1 },
                                total: { type: 'integer', example: 100 },
                                per_page: { type: 'integer', example: 20 }
                            }
                        }
                    }
                },
                ErrorResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: false },
                        error: {
                            type: 'object',
                            properties: {
                                code: { type: 'string', example: 'VALIDATION_ERROR' },
                                message: { type: 'string', example: 'Field name is required' },
                                details: { type: 'object' }
                            }
                        }
                    }
                },
                // ────────────── Auth ──────────────
                LoginRequest: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                        email: { type: 'string', format: 'email', example: 'admin@bengkel.com' },
                        password: { type: 'string', example: 'secret' }
                    }
                },
                // ────────────── User ──────────────
                UserRequest: {
                    type: 'object',
                    required: ['name', 'email', 'password', 'role'],
                    properties: {
                        name: { type: 'string', example: 'Budi Mekanik' },
                        email: { type: 'string', format: 'email', example: 'budi@bengkel.com' },
                        password: { type: 'string', example: 'password123' },
                        role: { type: 'string', enum: ['admin', 'mekanik'], example: 'mekanik' }
                    }
                },
                // ────────────── Customer ──────────────
                CustomerRequest: {
                    type: 'object',
                    required: ['name'],
                    properties: {
                        name: { type: 'string', example: 'Andi Susanto' },
                        phone: { type: 'string', example: '081234567890' },
                        email: { type: 'string', format: 'email', example: 'andi@email.com' },
                        address: { type: 'string', example: 'Jl. Merdeka No. 10' }
                    }
                },
                // ────────────── Vehicle ──────────────
                VehicleRequest: {
                    type: 'object',
                    required: ['plate_number', 'type'],
                    properties: {
                        plate_number: { type: 'string', example: 'B 1234 XY' },
                        type: { type: 'string', enum: ['mobil', 'motor'], example: 'mobil' },
                        brand: { type: 'string', example: 'Toyota' },
                        model: { type: 'string', example: 'Avanza' },
                        year: { type: 'integer', example: 2020 }
                    }
                },
                // ────────────── Category ──────────────
                CategoryRequest: {
                    type: 'object',
                    required: ['name'],
                    properties: {
                        name: { type: 'string', example: 'Oli & Pelumas' },
                        description: { type: 'string', example: 'Semua jenis oli mesin dan pelumas' }
                    }
                },
                // ────────────── Spare Part ──────────────
                SparePartRequest: {
                    type: 'object',
                    required: ['name', 'cost_price', 'sell_price'],
                    properties: {
                        category_id: { type: 'integer', example: 1 },
                        name: { type: 'string', example: 'Oli Mesin 1L' },
                        cost_price: { type: 'number', example: 45000 },
                        sell_price: { type: 'number', example: 65000 },
                        current_stock: { type: 'integer', example: 20 },
                        minimum_stock: { type: 'integer', example: 5 },
                        unit: { type: 'string', example: 'liter' }
                    }
                },
                // ────────────── Stock ──────────────
                StockInRequest: {
                    type: 'object',
                    required: ['spare_part_id', 'quantity'],
                    properties: {
                        spare_part_id: { type: 'integer', example: 42 },
                        quantity: { type: 'integer', example: 10 },
                        note: { type: 'string', example: 'Restock dari Supplier ABC' }
                    }
                },
                StockOutRequest: {
                    type: 'object',
                    required: ['spare_part_id', 'quantity'],
                    properties: {
                        spare_part_id: { type: 'integer', example: 42 },
                        quantity: { type: 'integer', example: 2 },
                        note: { type: 'string', example: 'Dipakai untuk servis B 1234 XY' }
                    }
                },
                // ────────────── Opname ──────────────
                OpnameRequest: {
                    type: 'object',
                    required: ['session_name'],
                    properties: {
                        session_name: { type: 'string', example: 'Opname Februari 2026' }
                    }
                },
                OpnameItemRequest: {
                    type: 'object',
                    required: ['spare_part_id', 'physical_count'],
                    properties: {
                        spare_part_id: { type: 'integer', example: 42 },
                        physical_count: { type: 'integer', example: 18 }
                    }
                },
                // ────────────── Transaction ──────────────
                TransactionRequest: {
                    type: 'object',
                    required: ['customer_id', 'vehicle_id', 'transaction_date', 'items'],
                    properties: {
                        customer_id: { type: 'integer', example: 1 },
                        vehicle_id: { type: 'integer', example: 1 },
                        transaction_date: { type: 'string', format: 'date', example: '2026-03-02' },
                        payment_method: { type: 'string', enum: ['cash', 'transfer', 'debit'], example: 'cash' },
                        notes: { type: 'string', example: 'Ganti oli + tune up' },
                        items: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    item_type: { type: 'string', enum: ['spare_part', 'jasa'], example: 'spare_part' },
                                    spare_part_id: { type: 'integer', example: 42 },
                                    item_name: { type: 'string', example: 'Oli Mesin 1L' },
                                    quantity: { type: 'integer', example: 1 },
                                    unit_price: { type: 'number', example: 65000 }
                                }
                            }
                        }
                    }
                },
                PaymentUpdateRequest: {
                    type: 'object',
                    required: ['paid_amount', 'payment_status'],
                    properties: {
                        paid_amount: { type: 'number', example: 215000 },
                        payment_status: { type: 'string', enum: ['pending', 'lunas', 'sebagian'], example: 'lunas' }
                    }
                },
                // ────────────── Settings ──────────────
                SettingsRequest: {
                    type: 'object',
                    properties: {
                        name: { type: 'string', example: 'Bengkel AutoService' },
                        address: { type: 'string', example: 'Jl. Raya Bandung No. 99' },
                        phone: { type: 'string', example: '022-123456' },
                        wa_gateway_token: { type: 'string', example: 'token_fonntes_atau_wablas' },
                        wa_target_number: { type: 'string', example: '6281234567890' }
                    }
                }
            }
        },
        security: [{ BearerAuth: [] }],
        tags: [
            { name: 'Auth', description: 'Autentikasi & manajemen sesi' },
            { name: 'Users', description: 'Manajemen pengguna (Admin only)' },
            { name: 'Customers', description: 'Manajemen data customer' },
            { name: 'Vehicles', description: 'Kendaraan milik customer' },
            { name: 'Categories', description: 'Kategori spare part' },
            { name: 'Spare Parts', description: 'Inventori spare part / barang' },
            { name: 'Stock', description: 'Pergerakan stok (masuk & keluar)' },
            { name: 'Opname', description: 'Sesi stock opname fisik' },
            { name: 'Transactions', description: 'Transaksi / nota servis' },
            { name: 'Reports', description: 'Laporan omset & stok' },
            { name: 'Notifications', description: 'Notifikasi WhatsApp' },
            { name: 'Settings', description: 'Pengaturan profil bengkel' }
        ],
        paths: {
            // ══════════════════ AUTH ══════════════════
            '/auth/login': {
                post: {
                    tags: ['Auth'],
                    summary: 'Login user',
                    security: [],
                    requestBody: {
                        required: true,
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } }
                    },
                    responses: {
                        200: {
                            description: 'Login berhasil, token dikembalikan',
                            content: {
                                'application/json': {
                                    example: {
                                        success: true,
                                        data: {
                                            token: 'eyJ...',
                                            expires_in: 86400,
                                            user: { id: 1, name: 'Admin', role: 'admin' }
                                        }
                                    }
                                }
                            }
                        },
                        401: { description: 'Kredensial tidak valid', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
                    }
                }
            },
            '/auth/logout': {
                post: {
                    tags: ['Auth'],
                    summary: 'Logout (invalidate token)',
                    responses: {
                        200: { description: 'Logout berhasil' }
                    }
                }
            },
            '/auth/me': {
                get: {
                    tags: ['Auth'],
                    summary: 'Ambil data user yang sedang login',
                    responses: {
                        200: { description: 'Data user yang login' },
                        401: { description: 'Token tidak valid', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
                    }
                }
            },
            // ══════════════════ USERS ══════════════════
            '/users': {
                get: {
                    tags: ['Users'],
                    summary: 'List semua user',
                    responses: { 200: { description: 'Daftar user' } }
                },
                post: {
                    tags: ['Users'],
                    summary: 'Buat user baru',
                    requestBody: {
                        required: true,
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/UserRequest' } } }
                    },
                    responses: {
                        201: { description: 'User berhasil dibuat' },
                        422: { description: 'Validasi gagal', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
                    }
                }
            },
            '/users/{id}': {
                get: {
                    tags: ['Users'],
                    summary: 'Detail user',
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                    responses: { 200: { description: 'Detail user' }, 404: { description: 'User tidak ditemukan' } }
                },
                put: {
                    tags: ['Users'],
                    summary: 'Update data user',
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/UserRequest' } } } },
                    responses: { 200: { description: 'User diupdate' }, 404: { description: 'User tidak ditemukan' } }
                },
                delete: {
                    tags: ['Users'],
                    summary: 'Nonaktifkan user (soft delete)',
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                    responses: { 200: { description: 'User dihapus (soft)' }, 404: { description: 'User tidak ditemukan' } }
                }
            },
            // ══════════════════ CUSTOMERS ══════════════════
            '/customers': {
                get: {
                    tags: ['Customers'],
                    summary: 'List customer (paginated)',
                    parameters: [
                        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
                        { name: 'search', in: 'query', schema: { type: 'string' } }
                    ],
                    responses: { 200: { description: 'Daftar customer' } }
                },
                post: {
                    tags: ['Customers'],
                    summary: 'Tambah customer baru',
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CustomerRequest' } } } },
                    responses: { 201: { description: 'Customer berhasil dibuat' } }
                }
            },
            '/customers/{id}': {
                get: {
                    tags: ['Customers'],
                    summary: 'Detail customer beserta daftar kendaraannya',
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                    responses: { 200: { description: 'Detail customer + kendaraan' }, 404: { description: 'Customer tidak ditemukan' } }
                },
                put: {
                    tags: ['Customers'],
                    summary: 'Update data customer',
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CustomerRequest' } } } },
                    responses: { 200: { description: 'Customer diupdate' } }
                },
                delete: {
                    tags: ['Customers'],
                    summary: 'Soft delete customer',
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                    responses: { 200: { description: 'Customer dihapus (soft)' } }
                }
            },
            '/customers/{id}/history': {
                get: {
                    tags: ['Customers'],
                    summary: 'Riwayat servis customer',
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                    responses: {
                        200: {
                            description: 'Riwayat transaksi customer',
                            content: {
                                'application/json': {
                                    example: {
                                        success: true,
                                        data: {
                                            customer: { id: 1, name: 'Andi Susanto' },
                                            transactions: [
                                                {
                                                    invoice_number: 'INV-20260302-001',
                                                    vehicle: { plate: 'B 1234 XY', type: 'mobil' },
                                                    total_amount: 350000,
                                                    payment_status: 'lunas',
                                                    transaction_date: '2026-03-01'
                                                }
                                            ]
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            // ══════════════════ VEHICLES ══════════════════
            '/customers/{id}/vehicles': {
                get: {
                    tags: ['Vehicles'],
                    summary: 'List kendaraan milik customer',
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                    responses: { 200: { description: 'Daftar kendaraan' } }
                },
                post: {
                    tags: ['Vehicles'],
                    summary: 'Tambah kendaraan untuk customer',
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/VehicleRequest' } } } },
                    responses: { 201: { description: 'Kendaraan ditambahkan' } }
                }
            },
            '/vehicles/{id}': {
                put: {
                    tags: ['Vehicles'],
                    summary: 'Update data kendaraan',
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/VehicleRequest' } } } },
                    responses: { 200: { description: 'Kendaraan diupdate' }, 404: { description: 'Kendaraan tidak ditemukan' } }
                }
            },
            // ══════════════════ CATEGORIES ══════════════════
            '/categories': {
                get: {
                    tags: ['Categories'],
                    summary: 'List semua kategori',
                    responses: { 200: { description: 'Daftar kategori' } }
                },
                post: {
                    tags: ['Categories'],
                    summary: 'Buat kategori baru',
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CategoryRequest' } } } },
                    responses: { 201: { description: 'Kategori dibuat' } }
                }
            },
            '/categories/{id}': {
                put: {
                    tags: ['Categories'],
                    summary: 'Update kategori',
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CategoryRequest' } } } },
                    responses: { 200: { description: 'Kategori diupdate' } }
                },
                delete: {
                    tags: ['Categories'],
                    summary: 'Hapus kategori',
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                    responses: { 200: { description: 'Kategori dihapus' } }
                }
            },
            // ══════════════════ SPARE PARTS ══════════════════
            '/spare-parts': {
                get: {
                    tags: ['Spare Parts'],
                    summary: 'List semua spare part / inventory item',
                    parameters: [
                        { name: 'category_id', in: 'query', schema: { type: 'integer' }, description: 'Filter berdasarkan kategori' },
                        { name: 'low_stock', in: 'query', schema: { type: 'boolean' }, description: 'Tampilkan hanya item yang stok menipis' },
                        { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Cari berdasarkan nama / SKU' }
                    ],
                    responses: { 200: { description: 'Daftar spare part' } }
                },
                post: {
                    tags: ['Spare Parts'],
                    summary: 'Tambah item baru (SKU & barcode di-generate otomatis oleh BE)',
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/SparePartRequest' } } } },
                    responses: {
                        201: {
                            description: 'Item berhasil dibuat',
                            content: {
                                'application/json': {
                                    example: {
                                        success: true,
                                        data: {
                                            id: 42, sku: 'AS-MOB-0042',
                                            barcode_value: 'AS-MOB-0042',
                                            barcode_image_url: '/storage/barcodes/AS-MOB-0042.png'
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            '/spare-parts/{id}': {
                get: {
                    tags: ['Spare Parts'],
                    summary: 'Detail item + riwayat stok',
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                    responses: { 200: { description: 'Detail spare part' }, 404: { description: 'Item tidak ditemukan' } }
                },
                put: {
                    tags: ['Spare Parts'],
                    summary: 'Update data spare part',
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/SparePartRequest' } } } },
                    responses: { 200: { description: 'Item diupdate' } }
                },
                delete: {
                    tags: ['Spare Parts'],
                    summary: 'Soft delete spare part',
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                    responses: { 200: { description: 'Item dihapus (soft)' } }
                }
            },
            '/spare-parts/{id}/barcode': {
                get: {
                    tags: ['Spare Parts'],
                    summary: 'Ambil barcode image (PNG/SVG)',
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                    responses: { 200: { description: 'Barcode image URL' } }
                }
            },
            '/spare-parts/{id}/barcode/print': {
                post: {
                    tags: ['Spare Parts'],
                    summary: 'Generate PDF barcode untuk dicetak',
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                    responses: { 200: { description: 'PDF URL untuk cetak barcode' } }
                }
            },
            // ══════════════════ STOCK ══════════════════
            '/stock-movements': {
                get: {
                    tags: ['Stock'],
                    summary: 'Log semua pergerakan stok',
                    parameters: [
                        { name: 'spare_part_id', in: 'query', schema: { type: 'integer' } },
                        { name: 'type', in: 'query', schema: { type: 'string', enum: ['in', 'out', 'opname_adjustment'] } }
                    ],
                    responses: { 200: { description: 'Daftar log pergerakan stok' } }
                }
            },
            '/stock/in': {
                post: {
                    tags: ['Stock'],
                    summary: 'Catat stok masuk (restock)',
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/StockInRequest' } } } },
                    responses: { 200: { description: 'Stok berhasil ditambah, stok terbaru dikembalikan' } }
                }
            },
            '/stock/out': {
                post: {
                    tags: ['Stock'],
                    summary: 'Catat stok keluar manual',
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/StockOutRequest' } } } },
                    responses: {
                        200: { description: 'Stok berhasil dikurangi' },
                        422: { description: 'Stok tidak cukup (STOCK_INSUFFICIENT)', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
                    }
                }
            },
            // ══════════════════ OPNAME ══════════════════
            '/opnames': {
                get: {
                    tags: ['Opname'],
                    summary: 'List semua sesi opname',
                    responses: { 200: { description: 'Daftar sesi opname' } }
                },
                post: {
                    tags: ['Opname'],
                    summary: 'Mulai sesi opname baru',
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/OpnameRequest' } } } },
                    responses: {
                        201: { description: 'Sesi opname berhasil dibuat' },
                        409: { description: 'Sudah ada sesi opname yang terbuka (OPNAME_ALREADY_OPEN)', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
                    }
                }
            },
            '/opnames/{id}': {
                get: {
                    tags: ['Opname'],
                    summary: 'Detail sesi opname beserta semua item',
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                    responses: { 200: { description: 'Detail sesi opname' }, 404: { description: 'Sesi tidak ditemukan' } }
                }
            },
            '/opnames/{id}/items': {
                post: {
                    tags: ['Opname'],
                    summary: 'Input hitungan fisik per item',
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/OpnameItemRequest' } } } },
                    responses: { 200: { description: 'Hitungan fisik tersimpan' } }
                }
            },
            '/opnames/{id}/items/{item_id}': {
                put: {
                    tags: ['Opname'],
                    summary: 'Update hitungan fisik item',
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
                        { name: 'item_id', in: 'path', required: true, schema: { type: 'integer' } }
                    ],
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/OpnameItemRequest' } } } },
                    responses: { 200: { description: 'Hitungan fisik diupdate' } }
                }
            },
            '/opnames/{id}/close': {
                post: {
                    tags: ['Opname'],
                    summary: 'Tutup sesi & apply adjustment stok otomatis',
                    description: 'BE otomatis membuat stock_movements dengan type `opname_adjustment` untuk semua item yang ada selisih.',
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                    responses: { 200: { description: 'Sesi ditutup, stok disesuaikan' } }
                }
            },
            // ══════════════════ TRANSACTIONS ══════════════════
            '/transactions': {
                get: {
                    tags: ['Transactions'],
                    summary: 'List transaksi',
                    parameters: [
                        { name: 'date', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Filter tanggal (YYYY-MM-DD)' },
                        { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending', 'lunas', 'sebagian'] } }
                    ],
                    responses: { 200: { description: 'Daftar transaksi' } }
                },
                post: {
                    tags: ['Transactions'],
                    summary: 'Buat nota / invoice baru',
                    description: 'BE otomatis: kurangi stok spare_part, hitung total, generate invoice_number.',
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/TransactionRequest' } } } },
                    responses: {
                        201: { description: 'Transaksi berhasil dibuat' },
                        422: { description: 'Stok tidak cukup', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
                    }
                }
            },
            '/transactions/{id}': {
                get: {
                    tags: ['Transactions'],
                    summary: 'Detail transaksi + semua item',
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                    responses: { 200: { description: 'Detail transaksi' }, 404: { description: 'Transaksi tidak ditemukan' } }
                }
            },
            '/transactions/{id}/payment': {
                patch: {
                    tags: ['Transactions'],
                    summary: 'Update status & jumlah pembayaran',
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/PaymentUpdateRequest' } } } },
                    responses: { 200: { description: 'Status pembayaran diupdate' } }
                }
            },
            '/transactions/{id}/pdf': {
                get: {
                    tags: ['Transactions'],
                    summary: 'Generate PDF nota/invoice',
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                    responses: { 200: { description: 'URL file PDF nota' } }
                }
            },
            // ══════════════════ REPORTS ══════════════════
            '/reports/revenue': {
                get: {
                    tags: ['Reports'],
                    summary: 'Laporan omset (harian / bulanan)',
                    parameters: [
                        { name: 'period', in: 'query', required: true, schema: { type: 'string', enum: ['daily', 'monthly'] }, example: 'monthly' },
                        { name: 'date', in: 'query', required: true, schema: { type: 'string' }, example: '2026-03', description: 'YYYY-MM untuk monthly, YYYY-MM-DD untuk daily' }
                    ],
                    responses: {
                        200: {
                            description: 'Laporan omset',
                            content: {
                                'application/json': {
                                    example: {
                                        success: true,
                                        data: {
                                            period: '2026-03',
                                            total_revenue: 12500000,
                                            total_transactions: 48,
                                            gross_profit: 4200000,
                                            daily_breakdown: [{ date: '2026-03-01', revenue: 850000 }]
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            '/reports/top-products': {
                get: {
                    tags: ['Reports'],
                    summary: 'Top spare part / produk terlaris',
                    parameters: [
                        { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } }
                    ],
                    responses: { 200: { description: 'Daftar produk terlaris' } }
                }
            },
            '/reports/low-stock': {
                get: {
                    tags: ['Reports'],
                    summary: 'Daftar barang stok menipis',
                    responses: { 200: { description: 'Barang dengan stok di bawah minimum' } }
                }
            },
            '/reports/opname/{id}': {
                get: {
                    tags: ['Reports'],
                    summary: 'Rekap hasil opname tertentu',
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                    responses: { 200: { description: 'Rekap opname' }, 404: { description: 'Opname tidak ditemukan' } }
                }
            },
            // ══════════════════ NOTIFICATIONS ══════════════════
            '/notifications/wa': {
                get: {
                    tags: ['Notifications'],
                    summary: 'Log semua notifikasi WhatsApp',
                    responses: { 200: { description: 'Daftar log notif WA' } }
                }
            },
            '/notifications/wa/test': {
                post: {
                    tags: ['Notifications'],
                    summary: 'Kirim notif WA test ke nomor owner',
                    responses: { 200: { description: 'Notif test terkirim' } }
                }
            },
            // ══════════════════ SETTINGS ══════════════════
            '/settings': {
                get: {
                    tags: ['Settings'],
                    summary: 'Ambil profil bengkel & konfigurasi',
                    responses: { 200: { description: 'Data settings bengkel' } }
                },
                put: {
                    tags: ['Settings'],
                    summary: 'Update profil bengkel + WA config',
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/SettingsRequest' } } } },
                    responses: { 200: { description: 'Settings diupdate' } }
                }
            }
        }
    },
    apis: [] // We use inline definition above, no JSDoc needed
};
const swaggerSpec = (0, swagger_jsdoc_1.default)(options);
exports.default = swaggerSpec;

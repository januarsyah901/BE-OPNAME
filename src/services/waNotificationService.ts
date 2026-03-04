import prisma from '../config/prisma';

/**
 * Cek apakah stok spare part di bawah minimum_stock.
 * Jika ya, buat record wa_notifications (status: pending).
 * Integrasi nyata ke WA Gateway (Fonnte/Wablas) harus ditambahkan di sini.
 */
export const triggerWaNotificationIfNeeded = async (sparePartId: number, currentStock: number): Promise<void> => {
    try {
        const part = await prisma.spare_parts.findUnique({
            where: { id: sparePartId },
            select: { name: true, sku: true, minimum_stock: true }
        });

        if (!part || currentStock > part.minimum_stock) return;

        // Ambil konfigurasi WA dari settings
        const settings = await prisma.settings.findFirst({
            select: { wa_target_number: true, wa_gateway_token: true }
        });

        if (!settings?.wa_target_number) return;

        const message = `⚠️ *Stok Menipis!*\n\nItem: *${part.name}*\nSKU: ${part.sku}\nStok Saat Ini: *${currentStock}*\nMinimum Stok: ${part.minimum_stock}\n\nSegera lakukan restock!`;

        // Simpan log notifikasi
        await prisma.wa_notifications.create({
            data: {
                spare_part_id: sparePartId,
                wa_number: settings.wa_target_number,
                message_body: message,
                status: 'pending'
            }
        });

        // TODO: Kirim ke WA Gateway (Fonnte/Wablas)
        // Contoh call ke Fonnte:
        // await axios.post('https://api.fonnte.com/send', {
        //   target: settings.wa_target_number,
        //   message: message
        // }, { headers: { Authorization: settings.wa_gateway_token } });
        //
        // Lalu update status notif ke 'sent':
        // await prisma.wa_notifications.update({ where: { id: notif.id }, data: { status: 'sent', sent_at: new Date() } });

    } catch (err) {
        // Tidak throw, agar tidak mengganggu flow utama
        console.error('[WA Notif] Error:', err);
    }
};

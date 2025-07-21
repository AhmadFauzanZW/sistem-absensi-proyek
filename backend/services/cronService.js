// server/services/cronService.js
const cron = require('node-cron');
const pool = require('../config/db');

// Fungsi untuk menandai pekerja yang tidak hadir sebagai 'Absen'
const tandaiPekerjaAbsen = async () => {
    console.log('Menjalankan tugas penjadwalan: Menandai pekerja absen...');
    const today = new Date().toISOString().slice(0, 10);

    try {
        // 1. Dapatkan semua ID pekerja yang aktif
        const [activeWorkers] = await pool.query(
            `SELECT pk.id_pekerja FROM pekerja pk
             JOIN pengguna p ON pk.id_pengguna = p.id_pengguna 
             WHERE p.status_pengguna = 'Aktif'`
        );
        const allWorkerIds = activeWorkers.map(p => p.id_pekerja);

        // 2. Dapatkan semua ID pekerja yang sudah punya catatan hari ini (hadir, izin, dll)
        const [attendedWorkers] = await pool.query(
            `SELECT DISTINCT id_pekerja FROM catatan_kehadiran WHERE DATE(waktu_clock_in) = ?`,
            [today]
        );
        const attendedWorkerIds = attendedWorkers.map(p => p.id_pekerja);

        // 3. Tentukan pekerja yang absen (ada di daftar aktif tapi tidak ada di daftar hadir)
        const absentWorkerIds = allWorkerIds.filter(id => !attendedWorkerIds.includes(id));

        if (absentWorkerIds.length > 0) {
            console.log(`Menemukan ${absentWorkerIds.length} pekerja absen. Memasukkan ke database...`);

            // 4. Masukkan data 'Absen' untuk setiap pekerja yang tidak hadir
            const insertPromises = absentWorkerIds.map(id_pekerja => {
                const query = `
                    INSERT INTO catatan_kehadiran (id_pekerja, waktu_clock_in, status_kehadiran, metode_verifikasi)
                    SELECT ?, ?, 'Absen', 'Sistem'
                    FROM pekerja p WHERE p.id_pekerja = ?
                `;
                // Set waktu clock-in default untuk absen, misal jam 8 pagi
                return pool.query(query, [id_pekerja, `${today} 16:00:00`, id_pekerja]);
            });

            await Promise.all(insertPromises);
            console.log('Berhasil menandai semua pekerja absen.');
        } else {
            console.log('Tidak ada pekerja yang absen hari ini.');
        }
    } catch (error) {
        console.error('Gagal menjalankan tugas penjadwalan absen:', error);
    }
};

// Jadwalkan tugas untuk berjalan setiap hari pukul 23:00 (11 malam)
cron.schedule('0 17-23 * * *', tandaiPekerjaAbsen, {
    scheduled: true,
    timezone: "Asia/Jakarta"
});

console.log('Penjadwal untuk menandai absensi telah dimulai.');
const pool = require('../config/db');
const { format } = require('date-fns');
const { id } = require('date-fns/locale');

exports.getAllPekerja = async (req, res) => {
    try {
        // Ambil semua pekerja yang memiliki foto profil
        const [pekerja] = await pool.query(`
            SELECT 
                pk.id_pekerja, 
                p.nama_pengguna, 
                pk.foto_profil_path
            FROM pekerja pk
                JOIN pengguna p ON pk.id_pengguna = p.id_pengguna
            WHERE p.status_pengguna = 'Aktif' AND pk.foto_profil_path IS NOT NULL
        `);
        res.json(pekerja);
    } catch (error) {
        console.error("Gagal mengambil data pekerja:", error);
        res.status(500).send("Server Error");
    }
};

exports.getPekerjaById = async (req, res) => {
    try {
        // Fixed: Changed from id_pekerja to id to match the route parameter
        const { id } = req.params;
        const [pekerja] = await pool.query(`
            SELECT pk.id_pekerja, p.nama_pengguna, pk.foto_profil_path, jpk.nama_pekerjaan
            FROM pekerja pk
            JOIN pengguna p ON pk.id_pengguna = p.id_pengguna
            LEFT JOIN jenis_pekerjaan jpk ON pk.id_jenis_pekerjaan = jpk.id_jenis_pekerjaan
            WHERE pk.id_pekerja = ?
        `, [id]);

        if (pekerja.length === 0) {
            return res.status(404).json({ message: 'Pekerja tidak ditemukan.' });
        }
        res.json(pekerja[0]);
    } catch (error) {
        console.error("Gagal mengambil data pekerja by ID:", error);
        res.status(500).send("Server Error");
    }
};

exports.getProfileData = async (req, res) => {
    try {
        const { id: id_pengguna } = req.user; // Ambil ID pengguna yang sedang login
        const { filter = 'bulan' } = req.query; // Filter default adalah bulanan

        // 1. Ambil Info Dasar Profil & Gaji (Tidak ada perubahan di sini)
        const profileQuery = `
            SELECT pk.id_pekerja, p.nama_pengguna, jp.nama_pekerjaan, pk.gaji_harian, pk.foto_profil_path
            FROM pekerja pk
                     JOIN pengguna p ON pk.id_pengguna = p.id_pengguna
                     LEFT JOIN jenis_pekerjaan jp ON pk.id_jenis_pekerjaan = jp.id_jenis_pekerjaan
            WHERE pk.id_pengguna = ?`;
        const [profileRows] = await pool.query(profileQuery, [id_pengguna]);

        if (profileRows.length === 0) {
            return res.status(404).json({ message: 'Profil pekerja tidak ditemukan.' });
        }
        const profileInfo = profileRows[0];
        // const profilePicture = profileInfo.foto_profil_path ? `${process.env.BASE_URL}/uploads/${profileInfo.foto_profil_path}` : null;
        const { id_pekerja, gaji_harian } = profileInfo;

        // Tentukan klausa WHERE berdasarkan filter
        let whereClause = '';
        if (filter === 'minggu') {
            whereClause = `WHERE id_pekerja = ? AND YEARWEEK(waktu_clock_in, 1) = YEARWEEK(CURDATE(), 1)`;
        } else { // default 'bulan'
            whereClause = `WHERE id_pekerja = ? AND MONTH(waktu_clock_in) = MONTH(CURDATE()) AND YEAR(waktu_clock_in) = YEAR(CURDATE())`;
        }

        // --- PERBAIKAN 1: Logika Perhitungan Gaji dan Ringkasan Kehadiran ---
        const attendanceQuery = `
            SELECT status_kehadiran, COUNT(*) as count
            FROM catatan_kehadiran ${whereClause}
            GROUP BY status_kehadiran`;
        const [attendanceRows] = await pool.query(attendanceQuery, [id_pekerja]);

        // Buat objek untuk menampung ringkasan
        const attendanceSummary = {
            Hadir: 0, Telat: 0, Izin: 0, Lembur: 0, 'Pulang Cepat': 0, Absen: 0
        };
        attendanceRows.forEach(row => {
            if (attendanceSummary.hasOwnProperty(row.status_kehadiran)) {
                attendanceSummary[row.status_kehadiran] = row.count;
            }
        });

        // Hitung total hari kerja yang dibayar (semua status kecuali Absen dan Izin)
        const totalHariKerja = (attendanceSummary.Hadir || 0) + (attendanceSummary.Telat || 0) + (attendanceSummary['Pulang Cepat'] || 0) + (attendanceSummary.Lembur || 0);

        // Kalkulasi lembur (tetap sama)
        const overtimeQuery = `
            SELECT
                SEC_TO_TIME(
                        SUM(
                                CASE
                                    -- Hanya hitung sebagai lembur jika status = 'Lembur' dan durasi kerja > 9 jam
                                    WHEN status_kehadiran = 'Lembur' AND TIME_TO_SEC(TIMEDIFF(waktu_clock_out, waktu_clock_in)) > (9 * 3600)
                                        THEN TIME_TO_SEC(TIMEDIFF(waktu_clock_out, waktu_clock_in)) - (9 * 3600)
                                    ELSE 0
                                    END
                        )
                ) AS total_jam_lembur
            FROM catatan_kehadiran ${whereClause}`;

        const [overtimeResult] = await pool.query(overtimeQuery, [id_pekerja]);
        const total_jam_lembur = overtimeResult[0].total_jam_lembur;
        const tarifLemburPerJam = (gaji_harian / 8) * 1.5;
        const totalJamLemburDecimal = (total_jam_lembur ? total_jam_lembur.split(':').reduce((acc, time) => (60 * acc) + +time) / 3600 : 0);

        const payrollInfo = {
            estimasiGajiPokok: totalHariKerja * gaji_harian,
            estimasiGajiLembur: totalJamLemburDecimal * tarifLemburPerJam,
            totalJamLembur: total_jam_lembur || '00:00:00',
            tanggalGajian: format(new Date(), "25 MMMM yyyy"),
        };
        payrollInfo.totalEstimasiGaji = payrollInfo.estimasiGajiPokok + payrollInfo.estimasiGajiLembur;

        // --- PERBAIKAN 2: Data Grafik yang Konsisten ---
        const statusList = ['Hadir', 'Telat', 'Izin', 'Lembur', 'Pulang Cepat', 'Absen'];
        const statusColors = {
            Hadir: 'rgba(75, 192, 102, 0.7)',
            Telat: 'rgba(255, 206, 86, 0.7)',
            Izin: 'rgba(54, 162, 235, 0.7)',
            Lembur: 'rgba(153, 102, 255, 0.7)',
            'Pulang Cepat': 'rgba(255, 159, 64, 0.7)',
            Absen: 'rgba(255, 99, 132, 0.7)'
        };

        const attendanceChartData = {
            labels: statusList,
            datasets: [{
                data: statusList.map(status => attendanceSummary[status] || 0),
                backgroundColor: statusList.map(status => statusColors[status])
            }]
        };

        // Mengambil data grafik performa (tetap sama)
        let performanceChartData = {};
        if(filter === 'minggu') {
            const perfQuery = `
                SELECT DAYNAME(waktu_clock_in) as label,
                       SUM(TIME_TO_SEC(TIMEDIFF(waktu_clock_out, waktu_clock_in))) / 3600 as jam_kerja,
                       SUM(CASE WHEN status_kehadiran = 'Lembur' THEN TIME_TO_SEC(TIMEDIFF(waktu_clock_out, '16:00:00')) ELSE 0 END) / 3600 as jam_lembur
                FROM catatan_kehadiran ${whereClause}
                GROUP BY DAYOFWEEK(waktu_clock_in), label ORDER BY DAYOFWEEK(waktu_clock_in)`;
            const [rows] = await pool.query(perfQuery, [id_pekerja]);
            performanceChartData = { type: 'bar', labels: rows.map(r => r.label), datasets: [
                    { label: 'Jam Kerja', data: rows.map(r => r.jam_kerja || 0), backgroundColor: 'rgba(54, 162, 235, 0.7)' },
                    { label: 'Jam Lembur', data: rows.map(r => r.jam_lembur || 0), backgroundColor: 'rgba(153, 102, 255, 0.7)' }
                ]};
        } else { // default 'bulan'
            const perfQuery = `
                SELECT DATE_FORMAT(waktu_clock_in, '%d %b') as label,
                       SUM(TIME_TO_SEC(TIMEDIFF(waktu_clock_out, waktu_clock_in))) / 3600 as jam_kerja,
                       SUM(CASE WHEN status_kehadiran = 'Lembur' THEN TIME_TO_SEC(TIMEDIFF(waktu_clock_out, '16:00:00')) ELSE 0 END) / 3600 as jam_lembur
                FROM catatan_kehadiran ${whereClause}
                GROUP BY DATE(waktu_clock_in), label ORDER BY DATE(waktu_clock_in)`;
            const [rows] = await pool.query(perfQuery, [id_pekerja]);
            performanceChartData = { type: 'line', labels: rows.map(r => r.label), datasets: [
                    { label: 'Jam Kerja', data: rows.map(r => r.jam_kerja || 0), borderColor: 'rgba(54, 162, 235, 1)', backgroundColor: 'rgba(54, 162, 235, 1)', fill: false },
                    { label: 'Jam Lembur', data: rows.map(r => r.jam_lembur || 0), borderColor: 'rgba(153, 102, 255, 1)', backgroundColor: 'rgba(153, 102, 255, 1)', fill: false }
                ]};
        }

        // Mengambil riwayat aktivitas terakhir (tetap sama)
        const historyQuery = `
            SELECT DATE_FORMAT(waktu_clock_in, '%Y-%m-%d') as tanggal,
                   DATE_FORMAT(waktu_clock_in, '%H:%i:%s') as jam_masuk,
                   DATE_FORMAT(waktu_clock_out, '%H:%i:%s') as jam_keluar,
                   status_kehadiran
            FROM catatan_kehadiran WHERE id_pekerja = ? ORDER BY waktu_clock_in DESC LIMIT 7`;
        const [recentActivities] = await pool.query(historyQuery, [id_pekerja]);

        // Kirim semua data yang sudah disempurnakan
        res.json({
            profileInfo,
            payrollInfo,
            attendanceSummary, // <-- Kirim data ringkasan baru
            attendanceChartData,
            performanceChartData,
            recentActivities
        });

    } catch (error) {
        console.error("Error fetching profile data:", error);
        res.status(500).send('Server Error');
    }
};

exports.getAttendanceHistory = async (req, res) => {
    try {
        const { id: id_pengguna } = req.user;
        const { month, page = 1, limit = 7 } = req.query; // limit 7 untuk data per minggu

        const [pekerjaRows] = await pool.query('SELECT id_pekerja FROM pekerja WHERE id_pengguna = ?', [id_pengguna]);
        if (pekerjaRows.length === 0) {
            return res.json({ activities: [], pagination: {} });
        }
        const id_pekerja = pekerjaRows[0].id_pekerja;

        let query = '';
        let countQuery = '';
        let params = [];

        const baseQuery = `
            FROM catatan_kehadiran
            WHERE id_pekerja = ?
        `;

        if (month) {
            // Mode Kalender: Ambil semua data untuk bulan yang dipilih
            const targetDate = new Date(month + '-01');
            query = `SELECT DATE_FORMAT(waktu_clock_in, '%Y-%m-%d') as tanggal, status_kehadiran ${baseQuery} AND MONTH(waktu_clock_in) = MONTH(?) AND YEAR(waktu_clock_in) = YEAR(?) ORDER BY waktu_clock_in`;
            params = [id_pekerja, targetDate, targetDate];
            const [activities] = await pool.query(query, params);
            return res.json({ activities }); // Hanya kirim aktivitas untuk kalender
        } else {
            // Mode List: Ambil data dengan paginasi
            const offset = (page - 1) * limit;
            countQuery = `SELECT COUNT(*) as total ${baseQuery}`;
            query = `
                SELECT DATE_FORMAT(waktu_clock_in, '%Y-%m-%d') as tanggal,
                       DATE_FORMAT(waktu_clock_in, '%H:%i:%s') as jam_masuk,
                       DATE_FORMAT(waktu_clock_out, '%H:%i:%s') as jam_keluar,
                       status_kehadiran
                ${baseQuery}
                ORDER BY waktu_clock_in DESC
                LIMIT ? OFFSET ?
            `;
            params = [id_pekerja];

            const [totalResult] = await pool.query(countQuery, params);
            const totalItems = totalResult[0].total;
            const totalPages = Math.ceil(totalItems / limit);

            const [activities] = await pool.query(query, [...params, parseInt(limit), parseInt(offset)]);

            res.json({
                activities,
                pagination: { currentPage: parseInt(page), totalPages, totalItems }
            });
        }
    } catch (error) {
        console.error("Error fetching attendance history:", error);
        res.status(500).send("Server Error");
    }
};

exports.getFaceData = async (req, res) => {
    try {
        // Ambil semua pekerja dengan foto profil untuk face recognition
        const [workers] = await pool.query(`
            SELECT 
                pk.id_pekerja, 
                p.nama_pengguna,
                pk.foto_profil_path as foto_profil
            FROM pekerja pk
                JOIN pengguna p ON pk.id_pengguna = p.id_pengguna
            WHERE p.status_pengguna = 'Aktif' 
            AND pk.foto_profil_path IS NOT NULL 
            AND pk.foto_profil_path != ''
            ORDER BY p.nama_pengguna
        `);
        
        console.log(`Found ${workers.length} workers with face data`);
        res.json(workers);
        
    } catch (error) {
        console.error("Error fetching face data:", error);
        res.status(500).json({ message: "Gagal mengambil data wajah pekerja" });
    }
};
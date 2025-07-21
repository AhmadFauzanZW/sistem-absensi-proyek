// server/controllers/dashboardController.js
const pool = require('../config/db');
const { format, startOfWeek, endOfWeek } = require('date-fns');
const { id } = require('date-fns/locale');

// Fungsi getDisplayPeriod dan sendEmptyResponse
const getDisplayPeriod = (filter, date) => {
    const d = new Date(date);
    if (filter === 'hari') return format(d, 'eeee, dd MMMM yy', { locale: id });
    if (filter === 'minggu') {
        const awal = format(startOfWeek(d, { weekStartsOn: 1 }), 'dd MMMM');
        const akhir = format(endOfWeek(d, { weekStartsOn: 1 }), 'dd MMMM yy');
        return `Minggu, ${awal} - ${akhir}`;
    }
    if (filter === 'bulan') return format(d, 'MMMM yy', { locale: id });
    return '';
};

// Supervisor Dashboard Functions
exports.getSupervisorSummary = async (req, res) => {
    try {
        const { filter = 'hari', date = new Date(), lokasiId = null } = req.query;
        const targetDate = new Date(date);

        let whereClause = '';
        let dateParams = [];
        switch (filter) {
            case 'minggu': whereClause = 'WHERE YEARWEEK(ck.waktu_clock_in, 1) = YEARWEEK(?, 1)'; dateParams = [targetDate]; break;
            case 'bulan': whereClause = 'WHERE MONTH(ck.waktu_clock_in) = MONTH(?) AND YEAR(ck.waktu_clock_in) = YEAR(?)'; dateParams = [targetDate, targetDate]; break;
            default: whereClause = 'WHERE DATE(ck.waktu_clock_in) = DATE(?)'; dateParams = [targetDate]; break;
        }

        const lokasiFilterClause = `AND (p.id_lokasi_penugasan = ? OR ? IS NULL)`;
        const queryParams = [...dateParams, lokasiId, lokasiId];

        // Query untuk total pekerja aktif
        const activeWorkersQuery = `SELECT COUNT(p.id_pekerja) as total_pekerja FROM pekerja p JOIN pengguna u ON p.id_pengguna = u.id_pengguna WHERE u.status_pengguna = 'Aktif' ${lokasiFilterClause.replace('p.','p.')}`; // penyesuaian alias
        const [totalPekerjaResult] = await pool.query(activeWorkersQuery, [lokasiId, lokasiId]);
        const total_pekerja = totalPekerjaResult[0].total_pekerja;

        // Query untuk ringkasan kartu
        const summaryQuery = `SELECT COUNT(DISTINCT CASE WHEN ck.status_kehadiran = 'Hadir' THEN ck.id_pekerja END) AS hadir, COUNT(DISTINCT CASE WHEN ck.status_kehadiran = 'Telat' THEN ck.id_pekerja END) AS terlambat, COUNT(DISTINCT CASE WHEN ck.status_kehadiran = 'Izin' THEN ck.id_pekerja END) AS izin, COUNT(DISTINCT CASE WHEN ck.status_kehadiran = 'Lembur' THEN ck.id_pekerja END) AS lembur, COUNT(DISTINCT CASE WHEN ck.status_kehadiran = 'Pulang Cepat' THEN ck.id_pekerja END) AS pulang_cepat, COUNT(DISTINCT CASE WHEN ck.status_kehadiran = 'Absen' THEN ck.id_pekerja END) AS absen FROM catatan_kehadiran ck JOIN pekerja p ON ck.id_pekerja = p.id_pekerja ${whereClause} ${lokasiFilterClause}`;
        const [summaryResult] = await pool.query(summaryQuery, queryParams);
        const summary = { ...summaryResult[0], total_pekerja };

        let trendData = {};
            const statusList = ['Hadir', 'Telat', 'Izin', 'Lembur', 'Pulang Cepat', 'Absen'];
            const statusColors = {
                Hadir: 'rgba(75, 192, 102, 0.7)',
                Telat: 'rgba(255, 206, 86, 0.7)',
                Izin: 'rgba(54, 162, 235, 0.7)',
                Lembur: 'rgba(153, 102, 255, 0.7)',
                'Pulang Cepat': 'rgba(255, 159, 64, 0.7)',
                Absen: 'rgba(255, 99, 132, 0.7)',
                'Belum Hadir': 'rgba(201, 203, 207, 0.7)'
            };

            if (filter === 'minggu') {
                const query = `SELECT DAYNAME(waktu_clock_in) as day, COUNT(DISTINCT ck.id_pekerja) as count FROM catatan_kehadiran ck JOIN pekerja p ON ck.id_pekerja = p.id_pekerja WHERE ck.status_kehadiran = ? AND YEARWEEK(waktu_clock_in, 1) = YEARWEEK(?, 1) AND p.id_lokasi_penugasan IN (?) GROUP BY day`;
                const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                const labels = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
                const datasets = [];
                for (const status of statusList) {
                    const [rows] = await pool.query(query, [status, targetDate, targetLokasiIds]);
                    const dataMap = new Map(rows.map(r => [r.day, r.count]));
                    datasets.push({ label: status, data: days.map(day => dataMap.get(day) || 0), backgroundColor: statusColors[status] });
                }
                trendData = { type: 'bar', title: 'Tren Kehadiran Mingguan', labels, datasets };
            } else if (filter === 'bulan') {
                const query = `SELECT DATE_FORMAT(waktu_clock_in, '%Y-%m-%d') as full_date, ck.status_kehadiran, COUNT(DISTINCT ck.id_pekerja) as count FROM catatan_kehadiran ck JOIN pekerja p ON ck.id_pekerja = p.id_pekerja ${whereClause} AND p.id_lokasi_penugasan IN (?) GROUP BY full_date, ck.status_kehadiran ORDER BY full_date`;
                const [rows] = await pool.query(query, [...dateParams, targetLokasiIds]);
                const uniqueDates = [...new Set(rows.map(r => r.full_date))];
                const dateLabels = uniqueDates.map(d => format(new Date(d), 'dd MMM'));
                const datasets = [];
                for (const status of statusList) {
                    const dataMap = new Map(rows.filter(r => r.status_kehadiran === status).map(r => [format(new Date(r.full_date), 'dd MMM'), r.count]));
                    datasets.push({ label: status, data: dateLabels.map(label => dataMap.get(label) || 0), borderColor: statusColors[status], backgroundColor: statusColors[status], fill: false, tension: 0.2 });
                }
                trendData = { type: 'line', title: 'Tren Kehadiran Bulanan', labels: dateLabels, datasets };
            } else { // 'hari'
                trendData = { type: 'pie', title: 'Ringkasan Kehadiran Hari Ini', labels: ['Hadir', 'Telat', 'Izin', 'Lembur', 'Pulang Cepat', 'Absen', 'Belum Hadir'], datasets: [{ label: 'Jumlah Pekerja', data: [summary.hadir || 0, summary.terlambat || 0, summary.izin || 0, summary.lembur || 0, summary.pulang_cepat || 0, summary.absen || 0, summary.belum_hadir], backgroundColor: [statusColors.Hadir, statusColors.Telat, statusColors.Izin, statusColors.Lembur, statusColors['Pulang Cepat'], statusColors.Absen, statusColors['Belum Hadir']], borderColor: '#ffffff', borderWidth: 2 }] };
            }

            res.json({ summary, trendData: {}, displayPeriod: getDisplayPeriod(filter, targetDate) });

        } catch (error) {
        console.error(`Error fetching supervisor summary:`, error);
        res.status(500).send('Server Error');
    }
};

exports.getSupervisorActivities = async (req, res) => {
    try {
        const { filter = 'hari', date = new Date(), page = 1, limit = 8, lokasiId = null, search = '', sortBy = 'waktu_clock_in', sortOrder = 'DESC' } = req.query;
        const targetDate = new Date(date);
        const offset = (page - 1) * limit;

        let whereClause = '';
        let dateParams = [];
        switch (filter) {
            case 'minggu': whereClause = 'WHERE YEARWEEK(ck.waktu_clock_in, 1) = YEARWEEK(?, 1)'; dateParams = [targetDate]; break;
            case 'bulan': whereClause = 'WHERE MONTH(ck.waktu_clock_in) = MONTH(?) AND YEAR(ck.waktu_clock_in) = YEAR(?)'; dateParams = [targetDate, targetDate]; break;
            default: whereClause = 'WHERE DATE(ck.waktu_clock_in) = DATE(?)'; dateParams = [targetDate]; break;
        }

        const lokasiFilterClause = `AND (pk.id_lokasi_penugasan = ? OR ? IS NULL)`;
        const searchClause = `AND (p.nama_pengguna LIKE ?)`;
        const queryParams = [...dateParams, lokasiId, lokasiId, `%${search}%`];

        const countQuery = `SELECT COUNT(ck.id_kehadiran) as total FROM catatan_kehadiran ck JOIN pekerja pk ON ck.id_pekerja = pk.id_pekerja JOIN pengguna p ON pk.id_pengguna = p.id_pengguna ${whereClause} ${lokasiFilterClause} ${searchClause}`;
        const [totalResult] = await pool.query(countQuery, queryParams);
        const totalItems = totalResult[0].total;
        const totalPages = Math.ceil(totalItems / limit);

        const safeSortBy = { 'nama_pengguna': 'p.nama_pengguna', 'waktu_clock_in': 'ck.waktu_clock_in' }[sortBy] || 'ck.waktu_clock_in';
        const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        const activityQuery = `SELECT p.nama_pengguna, DATE_FORMAT(ck.waktu_clock_in, '%Y-%m-%d') as tanggal, DATE_FORMAT(ck.waktu_clock_in, '%H:%i:%s') as jam_masuk, DATE_FORMAT(ck.waktu_clock_out, '%H:%i:%s') as jam_pulang, ck.status_kehadiran, TIMEDIFF(ck.waktu_clock_out, ck.waktu_clock_in) as total_jam_kerja FROM catatan_kehadiran ck JOIN pekerja pk ON ck.id_pekerja = pk.id_pekerja JOIN pengguna p ON pk.id_pengguna = p.id_pengguna ${whereClause} ${lokasiFilterClause} ${searchClause} ORDER BY ${safeSortBy} ${safeSortOrder} LIMIT ? OFFSET ?`;
        const [activities] = await pool.query(activityQuery, [...queryParams, parseInt(limit), parseInt(offset)]);

        res.json({ activities, pagination: { currentPage: parseInt(page), totalPages, totalItems } });

    } catch (error) {
        console.error(`Error fetching supervisor activities:`, error);
        res.status(500).send('Server Error');
    }
};


const sendEmptyResponse = (res, message, displayPeriod) => {
    res.json({
        summary: { total_pekerja: 0, hadir: 0, terlambat: 0, izin: 0, lembur: 0, pulang_cepat: 0, absen: 0, belum_hadir: 0 },
        trendData: { type: 'pie', title: 'Tidak Ada Data', labels: [], datasets: [] },
        displayPeriod: displayPeriod || message,
    });
};

const sendEmptyActivitiesResponse = (res) => {
    res.json({
        activities: [],
        pagination: { currentPage: 1, totalPages: 0, totalItems: 0 }
    });
};


// FUNGSI UTAMA YANG DIPERBAIKI
const getDashboardData = async (req, res, dataType) => {
    try {
        if (!req.user) {
            return res.status(401).send('Akses ditolak: Pengguna tidak terautentikasi.');
        }

        const { role, id: id_pengguna } = req.user;
        const { filter = 'hari', date = new Date(), lokasi = null, page = 1, limit = 8 } = req.query;
        const targetDate = new Date(date);

        let targetLokasiIds;

        // ================= LOGIKA ROLE-AWARE DIMULAI DI SINI =================
        if (role === 'Supervisor') {
            const [penugasanRows] = await pool.query(
                'SELECT id_lokasi FROM penugasan_pengawas WHERE id_pengguna_supervisor = ?',
                [id_pengguna]
            );
            const supervisedLokasiIds = penugasanRows.map(row => row.id_lokasi);

            if (supervisedLokasiIds.length === 0) {
                return dataType === 'summary' ? sendEmptyResponse(res, 'Anda tidak ditugaskan di lokasi manapun.') : sendEmptyActivitiesResponse(res);
            }

            targetLokasiIds = supervisedLokasiIds;
            if (lokasi) {
                const requestedLokasiId = parseInt(lokasi, 10);
                if (supervisedLokasiIds.includes(requestedLokasiId)) {
                    targetLokasiIds = [requestedLokasiId];
                } else {
                    return dataType === 'summary' ? sendEmptyResponse(res, 'Anda tidak memiliki akses ke lokasi ini.') : sendEmptyActivitiesResponse(res);
                }
            }
        } else if (role === 'Manager' || role === 'Direktur') {
            if (lokasi) {
                targetLokasiIds = [parseInt(lokasi, 10)];
            } else {
                const [allLokasiRows] = await pool.query("SELECT id_lokasi FROM lokasi_proyek WHERE status_proyek = 'Aktif'");
                targetLokasiIds = allLokasiRows.map(r => r.id_lokasi);
            }
        } else {
            return res.status(403).send('Peran Anda tidak diizinkan untuk melihat data ini.');
        }

        if (!targetLokasiIds || targetLokasiIds.length === 0) {
            return dataType === 'summary' ? sendEmptyResponse(res, 'Tidak ada lokasi aktif yang ditemukan.') : sendEmptyActivitiesResponse(res);
        }
        // ================= LOGIKA ROLE-AWARE SELESAI =================

        let whereClause = '';
        let dateParams = [];
        switch (filter) {
            case 'minggu': whereClause = 'WHERE YEARWEEK(waktu_clock_in, 1) = YEARWEEK(?, 1)'; dateParams = [targetDate]; break;
            case 'bulan': whereClause = 'WHERE MONTH(waktu_clock_in) = MONTH(?) AND YEAR(waktu_clock_in) = YEAR(?)'; dateParams = [targetDate, targetDate]; break;
            default: whereClause = 'WHERE DATE(waktu_clock_in) = DATE(?)'; dateParams = [targetDate]; break;
        }

        if (dataType === 'summary') {
            // Logika untuk getSupervisorSummary
            const activeWorkersQuery = `SELECT COUNT(p.id_pekerja) as total_pekerja FROM pekerja p JOIN pengguna u ON p.id_pengguna = u.id_pengguna WHERE u.status_pengguna = 'Aktif' AND p.id_lokasi_penugasan IN (?)`;
            const [totalPekerjaResult] = await pool.query(activeWorkersQuery, [targetLokasiIds]);
            const total_pekerja = totalPekerjaResult[0].total_pekerja;

            const summaryQuery = `SELECT COUNT(DISTINCT CASE WHEN ck.status_kehadiran = 'Hadir' THEN ck.id_pekerja END) AS hadir, COUNT(DISTINCT CASE WHEN ck.status_kehadiran = 'Telat' THEN ck.id_pekerja END) AS terlambat, COUNT(DISTINCT CASE WHEN ck.status_kehadiran = 'Izin' THEN ck.id_pekerja END) AS izin, COUNT(DISTINCT CASE WHEN ck.status_kehadiran = 'Lembur' THEN ck.id_pekerja END) AS lembur, COUNT(DISTINCT CASE WHEN ck.status_kehadiran = 'Pulang Cepat' THEN ck.id_pekerja END) AS pulang_cepat, COUNT(DISTINCT CASE WHEN ck.status_kehadiran = 'Absen' THEN ck.id_pekerja END) AS absen FROM catatan_kehadiran ck JOIN pekerja p ON ck.id_pekerja = p.id_pekerja ${whereClause} AND p.id_lokasi_penugasan IN (?)`;
            const [summaryResult] = await pool.query(summaryQuery, [...dateParams, targetLokasiIds]);
            const summary = summaryResult[0];
            summary.total_pekerja = total_pekerja;

            const physicallyPresentQuery = `SELECT COUNT(DISTINCT ck.id_pekerja) as total_present FROM catatan_kehadiran ck JOIN pekerja p ON ck.id_pekerja = p.id_pekerja ${whereClause} AND p.id_lokasi_penugasan IN (?)`;
            const [presentResult] = await pool.query(physicallyPresentQuery, [...dateParams, targetLokasiIds]);
            const totalHadirFisik = presentResult[0].total_present;
            summary.belum_hadir = total_pekerja - totalHadirFisik;

            // ... (Kode untuk trendData sama seperti jawaban sebelumnya, tidak diubah)
            let trendData = {};
            const statusList = ['Hadir', 'Telat', 'Izin', 'Lembur', 'Pulang Cepat', 'Absen'];
            const statusColors = {
                Hadir: 'rgba(75, 192, 102, 0.7)',
                Telat: 'rgba(255, 206, 86, 0.7)',
                Izin: 'rgba(54, 162, 235, 0.7)',
                Lembur: 'rgba(153, 102, 255, 0.7)',
                'Pulang Cepat': 'rgba(255, 159, 64, 0.7)',
                Absen: 'rgba(255, 99, 132, 0.7)',
                'Belum Hadir': 'rgba(201, 203, 207, 0.7)'
            };

            if (filter === 'minggu') {
                const query = `SELECT DAYNAME(waktu_clock_in) as day, COUNT(DISTINCT ck.id_pekerja) as count FROM catatan_kehadiran ck JOIN pekerja p ON ck.id_pekerja = p.id_pekerja WHERE ck.status_kehadiran = ? AND YEARWEEK(waktu_clock_in, 1) = YEARWEEK(?, 1) AND p.id_lokasi_penugasan IN (?) GROUP BY day`;
                const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                const labels = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
                const datasets = [];
                for (const status of statusList) {
                    const [rows] = await pool.query(query, [status, targetDate, targetLokasiIds]);
                    const dataMap = new Map(rows.map(r => [r.day, r.count]));
                    datasets.push({ label: status, data: days.map(day => dataMap.get(day) || 0), backgroundColor: statusColors[status] });
                }
                trendData = { type: 'bar', title: 'Tren Kehadiran Mingguan', labels, datasets };
            } else if (filter === 'bulan') {
                const query = `SELECT DATE_FORMAT(waktu_clock_in, '%Y-%m-%d') as full_date, ck.status_kehadiran, COUNT(DISTINCT ck.id_pekerja) as count FROM catatan_kehadiran ck JOIN pekerja p ON ck.id_pekerja = p.id_pekerja ${whereClause} AND p.id_lokasi_penugasan IN (?) GROUP BY full_date, ck.status_kehadiran ORDER BY full_date`;
                const [rows] = await pool.query(query, [...dateParams, targetLokasiIds]);
                const uniqueDates = [...new Set(rows.map(r => r.full_date))];
                const dateLabels = uniqueDates.map(d => format(new Date(d), 'dd MMM'));
                const datasets = [];
                for (const status of statusList) {
                    const dataMap = new Map(rows.filter(r => r.status_kehadiran === status).map(r => [format(new Date(r.full_date), 'dd MMM'), r.count]));
                    datasets.push({ label: status, data: dateLabels.map(label => dataMap.get(label) || 0), borderColor: statusColors[status], backgroundColor: statusColors[status], fill: false, tension: 0.2 });
                }
                trendData = { type: 'line', title: 'Tren Kehadiran Bulanan', labels: dateLabels, datasets };
            } else { // 'hari'
                trendData = { type: 'pie', title: 'Ringkasan Kehadiran Hari Ini', labels: ['Hadir', 'Telat', 'Izin', 'Lembur', 'Pulang Cepat', 'Absen', 'Belum Hadir'], datasets: [{ label: 'Jumlah Pekerja', data: [summary.hadir || 0, summary.terlambat || 0, summary.izin || 0, summary.lembur || 0, summary.pulang_cepat || 0, summary.absen || 0, summary.belum_hadir], backgroundColor: [statusColors.Hadir, statusColors.Telat, statusColors.Izin, statusColors.Lembur, statusColors['Pulang Cepat'], statusColors.Absen, statusColors['Belum Hadir']], borderColor: '#ffffff', borderWidth: 2 }] };
            }

            return res.json({ summary, trendData, displayPeriod: getDisplayPeriod(filter, targetDate) });

        } else if (dataType === 'activities') {
            // Logika untuk getSupervisorActivities
            const offset = (page - 1) * limit;
            const countQuery = `SELECT COUNT(ck.id_kehadiran) as total FROM catatan_kehadiran ck JOIN pekerja p ON ck.id_pekerja = p.id_pekerja ${whereClause} AND p.id_lokasi_penugasan IN (?)`;
            const [totalResult] = await pool.query(countQuery, [...dateParams, targetLokasiIds]);
            const totalItems = totalResult[0].total;
            const totalPages = Math.ceil(totalItems / limit);

            const activityQuery = `SELECT pengguna.nama_pengguna, DATE_FORMAT(ck.waktu_clock_in, '%Y-%m-%d') as tanggal, DATE_FORMAT(ck.waktu_clock_in, '%H:%i:%s') as jam_masuk, DATE_FORMAT(ck.waktu_clock_out, '%H:%i:%s') as jam_pulang, ck.status_kehadiran, TIMEDIFF(ck.waktu_clock_out, ck.waktu_clock_in) as total_jam_kerja FROM catatan_kehadiran ck JOIN pekerja pk ON ck.id_pekerja = pk.id_pekerja JOIN pengguna ON pk.id_pengguna = pengguna.id_pengguna ${whereClause} AND pk.id_lokasi_penugasan IN (?) ORDER BY ck.waktu_clock_in DESC LIMIT ? OFFSET ?`;
            const [activities] = await pool.query(activityQuery, [...dateParams, targetLokasiIds, parseInt(limit), parseInt(offset)]);

            return res.json({ activities, pagination: { currentPage: parseInt(page), totalPages, totalItems } });
        }
    } catch (error) {
        console.error(`Error fetching ${dataType}:`, error);
        res.status(500).send('Server Error');
    }
};

exports.getManagerDashboard = async (req, res) => {
    try {
        const { filter = 'hari', date = new Date().toISOString() } = req.query;
        const targetDate = new Date(date);

        // Siapkan klausa WHERE untuk filter waktu
        let whereClause = '';
        let dateParams = [];
        switch (filter) {
            case 'minggu':
                whereClause = 'AND YEARWEEK(ck.waktu_clock_in, 1) = YEARWEEK(?, 1)';
                dateParams = [targetDate];
                break;
            case 'bulan':
                whereClause = 'AND MONTH(ck.waktu_clock_in) = MONTH(?) AND YEAR(ck.waktu_clock_in) = YEAR(?)';
                dateParams = [targetDate, targetDate];
                break;
            default: // hari
                whereClause = 'AND DATE(ck.waktu_clock_in) = DATE(?)';
                dateParams = [targetDate];
                break;
        }

        // --- Query 1: Kartu Ringkasan Agregat (dengan filter waktu) ---
        const summaryPromises = [
            pool.query("SELECT COUNT(*) as total FROM lokasi_proyek WHERE status_proyek = 'Aktif'"),
            pool.query("SELECT COUNT(*) as total FROM pengguna WHERE id_peran = (SELECT id_peran FROM peran WHERE nama_peran = 'Supervisor') AND status_pengguna = 'Aktif'"),
            pool.query("SELECT COUNT(*) as total FROM pekerja p JOIN pengguna u ON p.id_pengguna = u.id_pengguna WHERE u.status_pengguna = 'Aktif'"),
            pool.query(`
                SELECT 
                    COUNT(DISTINCT CASE WHEN status_kehadiran IN ('Hadir', 'Lembur', 'Pulang Cepat') THEN id_pekerja END) as hadir,
                    COUNT(DISTINCT CASE WHEN status_kehadiran = 'Telat' THEN id_pekerja END) as telat,
                    COUNT(DISTINCT CASE WHEN status_kehadiran = 'Izin' THEN id_pekerja END) as izin,
                    COUNT(DISTINCT CASE WHEN status_kehadiran = 'Absen' THEN id_pekerja END) as absen
                FROM catatan_kehadiran ck WHERE 1=1 ${whereClause.replace('ck.', '')}
            `, dateParams)
        ];

        const [[proyekResult], [supervisorResult], [pekerjaResult], [kehadiranResult]] = await Promise.all(summaryPromises);

        const totalPekerja = pekerjaResult[0].total;
        const summary = kehadiranResult[0]; // Hasil query langsung dari db

        const totalHadirRiil = (summary.hadir || 0); // Query Anda sudah menghitung ini dengan benar


        let belumHadir = 0;
        if (filter === 'hari') {
            const totalTercatat = totalHadirRiil + (summary.telat || 0) + (summary.izin || 0) + (summary.absen || 0);
            belumHadir = totalPekerja - totalTercatat;
        }

        const summaryCards = {
            totalProyek: proyekResult[0].total,
            totalSupervisor: supervisorResult[0].total,
            totalPekerja: totalPekerja,
            hadir: summary.hadir || 0,
            telat: summary.telat || 0,
            izin: summary.izin || 0,
            absen: summary.absen || 0, // Ambil data 'Absen' langsung dari DB
            belum_hadir: belumHadir < 0 ? 0 : belumHadir // Pastikan tidak negatif
        };

        // --- Query 2: Data Tabel "Denyut Nadi Proyek" (dengan filter waktu) ---
        const projectPulseQuery = `
            SELECT
                lp.id_lokasi, lp.nama_lokasi,
                (SELECT p.nama_pengguna FROM pengguna p JOIN penugasan_pengawas pp ON p.id_pengguna = pp.id_pengguna_supervisor WHERE pp.id_lokasi = lp.id_lokasi LIMIT 1) AS nama_supervisor,
                COUNT(DISTINCT pk.id_pekerja) AS total_pekerja_proyek,
                (SELECT COUNT(DISTINCT ck.id_pekerja) FROM catatan_kehadiran ck WHERE ck.id_pekerja IN (SELECT id_pekerja FROM pekerja WHERE id_lokasi_penugasan = lp.id_lokasi) AND ck.status_kehadiran IN ('Hadir', 'Telat', 'Lembur', 'Pulang Cepat') ${whereClause}) AS total_hadir,
                (SELECT COUNT(DISTINCT ck.id_pekerja) FROM catatan_kehadiran ck WHERE ck.id_pekerja IN (SELECT id_pekerja FROM pekerja WHERE id_lokasi_penugasan = lp.id_lokasi) AND ck.status_kehadiran = 'Telat' ${whereClause}) AS total_telat,
                (SELECT COUNT(DISTINCT ck.id_pekerja) FROM catatan_kehadiran ck WHERE ck.id_pekerja IN (SELECT id_pekerja FROM pekerja WHERE id_lokasi_penugasan = lp.id_lokasi) AND ck.status_kehadiran = 'Izin' ${whereClause}) AS total_izin,
                (SELECT COUNT(DISTINCT ck.id_pekerja) FROM catatan_kehadiran ck WHERE ck.id_pekerja IN (SELECT id_pekerja FROM pekerja WHERE id_lokasi_penugasan = lp.id_lokasi) AND ck.status_kehadiran = 'Absen' ${whereClause}) AS total_absen
            FROM lokasi_proyek lp
            LEFT JOIN pekerja pk ON lp.id_lokasi = pk.id_lokasi_penugasan
            WHERE lp.status_proyek = 'Aktif'
            GROUP BY lp.id_lokasi, lp.nama_lokasi ORDER BY lp.nama_lokasi;
        `;
        const [projectPulse] = await pool.query(projectPulseQuery, [...dateParams, ...dateParams, ...dateParams, ...dateParams]);


        // --- Query 3: Data untuk Grafik Perbandingan Proyek ---
        const projectChartQuery = `
            SELECT 
                lp.nama_lokasi,
                COUNT(DISTINCT pk.id_pekerja) as total_pekerja,
                COUNT(DISTINCT CASE WHEN ck.status_kehadiran IN ('Hadir', 'Telat', 'Lembur', 'Pulang Cepat') THEN ck.id_pekerja END) as total_hadir
            FROM lokasi_proyek lp
            LEFT JOIN pekerja pk ON lp.id_lokasi = pk.id_lokasi_penugasan
            LEFT JOIN catatan_kehadiran ck ON pk.id_pekerja = ck.id_pekerja ${whereClause}
            WHERE lp.status_proyek = 'Aktif'
            GROUP BY lp.id_lokasi, lp.nama_lokasi
            ORDER BY lp.nama_lokasi;
        `;
        const [projectChartData] = await pool.query(projectChartQuery, dateParams);

        const chartData = {
            type: 'bar',
            labels: projectChartData.map(p => p.nama_lokasi),
            datasets: [
                {
                    label: 'Total Pekerja',
                    data: projectChartData.map(p => p.total_pekerja),
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1,
                },
                {
                    label: 'Total Hadir',
                    data: projectChartData.map(p => p.total_hadir),
                    backgroundColor: 'rgba(75, 192, 102, 0.5)',
                    borderColor: 'rgba(75, 192, 102, 1)',
                    borderWidth: 1,
                }
            ]
        };

        res.json({ summaryCards, projectPulse, chartData });

    } catch (error) {
        console.error("Error fetching manager dashboard data:", error);
        res.status(500).send("Server Error");
    }
};

exports.getDirekturDashboard = async (req, res) => {
    try {
        const { periode = new Date().toISOString().slice(0, 7) } = req.query; // Default: bulan ini, format YYYY-MM

        // Fungsi untuk menghitung KPI pada rentang tanggal tertentu
        const calculateKpis = async (startDate, endDate) => {
            const kpiQuery = `
                SELECT
                    (SELECT SUM(p.gaji_harian) FROM catatan_kehadiran ck JOIN pekerja p ON ck.id_pekerja = p.id_pekerja WHERE ck.status_kehadiran IN ('Hadir', 'Telat', 'Lembur', 'Pulang Cepat') AND ck.waktu_clock_in BETWEEN ? AND ?) as total_biaya_gaji,
                    (SELECT AVG(TIME_TO_SEC(TIMEDIFF(waktu_clock_out, waktu_clock_in))) / 3600 FROM catatan_kehadiran WHERE waktu_clock_out IS NOT NULL AND waktu_clock_in BETWEEN ? AND ?) as produktivitas_rata_rata,
                    (SELECT (COUNT(CASE WHEN status_kehadiran = 'Absen' THEN 1 END) / COUNT(*)) * 100 FROM catatan_kehadiran WHERE waktu_clock_in BETWEEN ? AND ?) as tingkat_absensi
            `;
            const [result] = await pool.query(kpiQuery, [startDate, endDate, startDate, endDate, startDate, endDate]);
            return result[0];
        };

        // Hitung untuk periode saat ini
        const currentStartDate = new Date(periode + '-01');
        const currentEndDate = new Date(currentStartDate.getFullYear(), currentStartDate.getMonth() + 1, 0);
        const currentKpis = await calculateKpis(currentStartDate, currentEndDate);

        // Hitung untuk periode sebelumnya
        const previousStartDate = new Date(currentStartDate);
        previousStartDate.setMonth(previousStartDate.getMonth() - 1);
        const previousEndDate = new Date(previousStartDate.getFullYear(), previousStartDate.getMonth() + 1, 0);
        const previousKpis = await calculateKpis(previousStartDate, previousEndDate);

        // Fungsi untuk menghitung persentase perubahan
        const getChange = (current, previous) => {
            if (previous === 0 || previous === null) return 0;
            return ((current - previous) / previous) * 100;
        };

        // Gabungkan data dengan perbandingan
        const kpisWithComparison = {
            total_biaya_gaji: { value: currentKpis.total_biaya_gaji || 0, change: getChange(currentKpis.total_biaya_gaji, previousKpis.total_biaya_gaji) },
            produktivitas_rata_rata: { value: currentKpis.produktivitas_rata_rata || 0, change: getChange(currentKpis.produktivitas_rata_rata, previousKpis.produktivitas_rata_rata) },
            tingkat_absensi: { value: currentKpis.tingkat_absensi || 0, change: getChange(currentKpis.tingkat_absensi, previousKpis.tingkat_absensi) }
        };

        // --- Query untuk Grafik (tidak berubah banyak, hanya penyesuaian tanggal) ---
        const biayaChartQuery = `
            SELECT lp.nama_lokasi, SUM(p.gaji_harian) as total_gaji
            FROM catatan_kehadiran ck
            JOIN pekerja p ON ck.id_pekerja = p.id_pekerja
            JOIN lokasi_proyek lp ON p.id_lokasi_penugasan = lp.id_lokasi
            WHERE ck.waktu_clock_in BETWEEN ? AND ?
            GROUP BY lp.id_lokasi, lp.nama_lokasi;
        `;
        const [biayaChartResult] = await pool.query(biayaChartQuery, [currentStartDate, currentEndDate]);
        const biayaChart = {
            labels: biayaChartResult.map(item => item.nama_lokasi),
            datasets: [{ label: `Biaya Gaji (Bulan Ini)`, data: biayaChartResult.map(item => item.total_gaji), backgroundColor: 'rgba(54, 162, 235, 0.6)' }]
        };

        res.json({ kpis: kpisWithComparison, biayaChart });

    } catch (error) {
        console.error("Error fetching direktur dashboard data:", error);
        res.status(500).send("Server Error");
    }
};

// Ubah exports agar lebih sederhana
exports.getSupervisorSummary = (req, res) => getDashboardData(req, res, 'summary');
exports.getSupervisorActivities = (req, res) => getDashboardData(req, res, 'activities');
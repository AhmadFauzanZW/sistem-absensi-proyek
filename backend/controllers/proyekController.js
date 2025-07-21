const pool = require('../config/db');

exports.getLokasiProyek = async (req, res) => {
    try {
        const [lokasi] = await pool.query('SELECT id_lokasi, nama_lokasi FROM lokasi_proyek WHERE status_proyek = "Aktif"');
        res.json(lokasi);
    } catch (error) {
        console.error('Gagal mengambil lokasi proyek:', error);
        res.status(500).send('Server Error');
    }
};

exports.getSupervisorAssignments = async (req, res) => {
    const { id: id_pengguna } = req.user;
    try {
        const query = `
            SELECT lp.id_lokasi, lp.nama_lokasi
            FROM penugasan_pengawas pp
            JOIN lokasi_proyek lp ON pp.id_lokasi = lp.id_lokasi
            WHERE pp.id_pengguna_supervisor = ? AND lp.status_proyek = 'Aktif'
        `;
        const [assignments] = await pool.query(query, [id_pengguna]);
        res.json(assignments);
    } catch (error) {
        console.error('Gagal mengambil data penugasan supervisor:', error);
        res.status(500).send('Server Error');
    }
};
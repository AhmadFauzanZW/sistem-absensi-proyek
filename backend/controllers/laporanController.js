// server/controllers/laporanController.js
const pool = require('../config/db');
const ExcelJS = require('exceljs');
const { format } = require('date-fns');
const { id } = require('date-fns/locale');

// --- FUNGSI UTAMA ---
exports.generateReport = async (req, res) => {
    try {
        const { reportType, lokasiId, periode, export: exportToFile } = req.body;
        let reportData;

        // Ambil nama lokasi untuk judul laporan
        const [lokasiRows] = await pool.query('SELECT nama_lokasi FROM lokasi_proyek WHERE id_lokasi = ?', [lokasiId]);
        const namaLokasi = lokasiRows.length > 0 ? lokasiRows[0].nama_lokasi : 'Lokasi Tidak Ditemukan';

        // Panggil fungsi generator yang sesuai
        if (reportType === 'kehadiran') {
            reportData = await generateLaporanKehadiran(lokasiId, periode);
        } else if (reportType === 'gaji') {
            reportData = await generateLaporanGaji(lokasiId, periode);
        } else {
            return res.status(400).json({ message: 'Jenis laporan tidak valid.' });
        }

        // Menambahkan metadata ke data laporan
        reportData.meta = {
            lokasi: namaLokasi,
            periode: format(new Date(periode + '-01'), 'MMMM yyyy', { locale: id }),
            dibuatPada: format(new Date(), 'eeee, dd MMMM yyyy HH:mm:ss', { locale: id })
        };

        if (exportToFile) {
            const buffer = await exportToExcel(reportData, reportType);
            const fileName = `Laporan_${reportType}_${namaLokasi}_${periode}.xlsx`.replace(/ /g, '_');
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            return res.send(buffer);
        }

        res.json(reportData);
    } catch (error) {
        console.error("Error generating report:", error);
        res.status(500).send("Server Error");
    }
};

// --- FUNGSI LAPORAN KEHADIRAN ---
async function generateLaporanKehadiran(lokasiId, periode) {
    const [year, month] = periode.split('-');
    const daysInMonth = new Date(year, month, 0).getDate();

    const [workers] = await pool.query(`
        SELECT pk.id_pekerja, p.nama_pengguna
        FROM pekerja pk
                 JOIN pengguna p ON pk.id_pengguna = p.id_pengguna
        WHERE pk.id_lokasi_penugasan = ?
        ORDER BY p.nama_pengguna
    `, [lokasiId]);

    const [records] = await pool.query(`
        SELECT id_pekerja, DAY(waktu_clock_in) as tanggal, status_kehadiran
        FROM catatan_kehadiran
        WHERE id_pekerja IN (?) AND MONTH(waktu_clock_in) = ? AND YEAR(waktu_clock_in) = ?
    `, [workers.map(w => w.id_pekerja), month, year]);

    // Proses data per pekerja
    const reportRows = workers.map(worker => {
        const rowData = { 'Nama Pekerja': worker.nama_pengguna };
        let totals = { H: 0, T: 0, A: 0, I: 0, L: 0, P: 0 };

        for (let day = 1; day <= daysInMonth; day++) {
            const record = records.find(r => r.id_pekerja === worker.id_pekerja && r.tanggal === day);
            const status = record ? record.status_kehadiran.charAt(0) : '-';
            rowData[day.toString()] = status;
            if (totals.hasOwnProperty(status)) totals[status]++;
        }

        rowData['Total Hadir'] = totals.H + totals.T + totals.L + totals.P;
        rowData['Total Absen'] = totals.A;
        rowData['Total Izin'] = totals.I;
        return rowData;
    });

    // Hitung total per hari
    const dailyTotals = { 'Nama Pekerja': 'TOTAL PER HARI' };
    for (let day = 1; day <= daysInMonth; day++) {
        const totalToday = reportRows.reduce((count, row) =>
            (row[day.toString()] !== '-') ? count + 1 : count, 0
        );
        dailyTotals[day.toString()] = totalToday > 0 ? totalToday : '-';
    }

    // Hitung grand total
    const grandTotals = reportRows.reduce((acc, row) => ({
        hadir: acc.hadir + row['Total Hadir'],
        absen: acc.absen + row['Total Absen'],
        izin: acc.izin + row['Total Izin']
    }), { hadir: 0, absen: 0, izin: 0 });

    const headers = [
        'Nama Pekerja',
        ...Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString()),
        'Total Hadir',
        'Total Absen',
        'Total Izin'
    ];

    return {
        title: `Laporan Kehadiran Detail`,
        headers,
        rows: reportRows,
        dailyTotals,
        grandTotals
    };
}

// --- FUNGSI LAPORAN GAJI ---
async function generateLaporanGaji(lokasiId, periode) {
    const [year, month] = periode.split('-');
    const query = `
        SELECT
            p.nama_pengguna,
            pk.gaji_harian,
            COUNT(DISTINCT CASE WHEN ck.status_kehadiran IN ('Hadir', 'Telat', 'Lembur', 'Pulang Cepat')
                                    THEN DATE(ck.waktu_clock_in) END) as total_hari_kerja,
            SEC_TO_TIME(SUM(CASE WHEN ck.status_kehadiran = 'Lembur'
                AND TIME_TO_SEC(TIMEDIFF(ck.waktu_clock_out, ck.waktu_clock_in)) > (9 * 3600)
                                     THEN TIME_TO_SEC(TIMEDIFF(ck.waktu_clock_out, ck.waktu_clock_in)) - (9 * 3600)
                                 ELSE 0 END)) as total_jam_lembur
        FROM pekerja pk
                 JOIN pengguna p ON pk.id_pengguna = p.id_pengguna
                 LEFT JOIN catatan_kehadiran ck ON pk.id_pekerja = ck.id_pekerja
            AND MONTH(ck.waktu_clock_in) = ? AND YEAR(ck.waktu_clock_in) = ?
        WHERE pk.id_lokasi_penugasan = ?
        GROUP BY pk.id_pekerja, p.nama_pengguna, pk.gaji_harian
        ORDER BY p.nama_pengguna
    `;

    const [results] = await pool.query(query, [month, year, lokasiId]);

    const reportRows = results.map(row => {
        const tarifLemburPerJam = (row.gaji_harian / 8) * 1.5;
        const totalJamLemburDecimal = row.total_jam_lembur ?
            row.total_jam_lembur.split(':').reduce((acc, time) => (60 * acc) + +time) / 3600 : 0;

        const gajiPokok = Math.round(row.total_hari_kerja * row.gaji_harian);
        const gajiLembur = Math.round(totalJamLemburDecimal * tarifLemburPerJam);

        return {
            "Nama Pekerja": row.nama_pengguna,
            "Total Hari Kerja": row.total_hari_kerja,
            "Total Jam Lembur": row.total_jam_lembur || '00:00:00',
            "Gaji Pokok (Rp)": gajiPokok,
            "Gaji Lembur (Rp)": gajiLembur,
            "Total Gaji (Rp)": gajiPokok + gajiLembur
        };
    });

    const grandTotals = reportRows.reduce((acc, row) => ({
        gajiPokok: acc.gajiPokok + row["Gaji Pokok (Rp)"],
        gajiLembur: acc.gajiLembur + row["Gaji Lembur (Rp)"],
        totalGaji: acc.totalGaji + row["Total Gaji (Rp)"]
    }), { gajiPokok: 0, gajiLembur: 0, totalGaji: 0 });

    const headers = [
        "Nama Pekerja",
        "Total Hari Kerja",
        "Total Jam Lembur",
        "Gaji Pokok (Rp)",
        "Gaji Lembur (Rp)",
        "Total Gaji (Rp)"
    ];

    return {
        title: `Laporan Rekapitulasi Gaji`,
        headers,
        rows: reportRows,
        totals: grandTotals
    };
}

// --- FUNGSI EKSPOR EXCEL ---
async function exportToExcel(reportData, reportType) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Laporan');

    // === BAGIAN 1: HEADER/JUDUL DAN KETERANGAN ===
    let currentRow = 1;

    // Judul laporan (merge cells untuk tampilan yang lebih baik)
    worksheet.mergeCells(`A${currentRow}:F${currentRow}`);
    worksheet.getCell(`A${currentRow}`).value = reportData.title;
    worksheet.getCell(`A${currentRow}`).font = {
        name: 'Calibri',
        size: 18,
        bold: true,
        color: { argb: 'FF1F2937' }
    };
    worksheet.getCell(`A${currentRow}`).alignment = {
        horizontal: 'center',
        vertical: 'middle'
    };
    worksheet.getCell(`A${currentRow}`).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE5E7EB' }
    };
    currentRow++;

    // Keterangan metadata
    worksheet.getCell(`A${currentRow}`).value = `Lokasi Proyek: ${reportData.meta.lokasi}`;
    worksheet.getCell(`A${currentRow}`).font = { name: 'Calibri', size: 12, bold: true };
    currentRow++;

    worksheet.getCell(`A${currentRow}`).value = `Periode: ${reportData.meta.periode}`;
    worksheet.getCell(`A${currentRow}`).font = { name: 'Calibri', size: 12, bold: true };
    currentRow++;

    worksheet.getCell(`A${currentRow}`).value = `Laporan Dibuat: ${reportData.meta.dibuatPada}`;
    worksheet.getCell(`A${currentRow}`).font = { name: 'Calibri', size: 12, bold: true };
    currentRow++;

    // === BAGIAN 2: JARAK KOSONG (2 BARIS) ===
    currentRow += 2;

    // === BAGIAN 3: HEADER TABEL ===
    const headerRowIndex = currentRow;

    // Set up kolom
    worksheet.columns = reportData.headers.map(header => ({
        key: header.toString(),
        width: header === 'Nama Pekerja' ? 30 :
            header.toString().includes('Gaji') || header.toString().includes('Total') ? 18 :
                header.toString().length > 4 ? 15 : 8
    }));

    // Tambahkan header row
    const headerRow = worksheet.addRow(reportData.headers);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF374151' }
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

    // Border untuk header
    headerRow.eachCell((cell) => {
        cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
    });
    currentRow++;

    // === BAGIAN 4: DATA UTAMA ===
    reportData.rows.forEach(row => {
        const dataRow = worksheet.addRow(row);

        // Styling untuk data rows
        dataRow.eachCell((cell, colNumber) => {
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };

            // Alignment berdasarkan kolom
            if (colNumber === 1) { // Nama Pekerja
                cell.alignment = { horizontal: 'left', vertical: 'middle' };
            } else {
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
            }
        });

        currentRow++;
    });

    // === BAGIAN 5: TOTAL DAN GRAND TOTAL ===
    currentRow++; // Baris kosong sebelum total

    if (reportType === 'kehadiran') {
        // Total per hari
        const dailyTotalRow = worksheet.addRow(reportData.dailyTotals);

        // Styling hanya untuk sel yang berisi data
        dailyTotalRow.eachCell((cell, colNumber) => {
            if (colNumber <= reportData.headers.length) {
                cell.font = { bold: true, color: { argb: 'FF1F2937' } };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFBBF24' }
                };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };

                if (colNumber === 1) {
                    cell.alignment = { horizontal: 'right', vertical: 'middle' };
                } else {
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                }
            }
        });
        currentRow++;

        // Grand total
        const grandTotalArray = new Array(reportData.headers.length).fill(null);
        grandTotalArray[0] = 'GRAND TOTAL';
        grandTotalArray[reportData.headers.length - 3] = reportData.grandTotals.hadir;
        grandTotalArray[reportData.headers.length - 2] = reportData.grandTotals.absen;
        grandTotalArray[reportData.headers.length - 1] = reportData.grandTotals.izin;

        const grandTotalRow = worksheet.addRow(grandTotalArray);

        // Styling hanya untuk sel yang berisi data (tidak untuk seluruh baris)
        grandTotalRow.eachCell((cell, colNumber) => {
            if (colNumber <= reportData.headers.length && grandTotalArray[colNumber - 1] !== null) {
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFDC2626' }
                };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };

                if (colNumber === 1) {
                    cell.alignment = { horizontal: 'right', vertical: 'middle' };
                } else {
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                }
            }
        });
        currentRow++;
    }

    if (reportType === 'gaji' && reportData.totals) {
        // Format currency untuk kolom gaji
        ['Gaji Pokok (Rp)', 'Gaji Lembur (Rp)', 'Total Gaji (Rp)'].forEach(header => {
            worksheet.getColumn(header).numFmt = '"Rp"#,##0;[Red]-"Rp"#,##0';
        });

        // Grand total gaji
        const totalRow = worksheet.addRow({
            'Nama Pekerja': 'GRAND TOTAL',
            'Gaji Pokok (Rp)': reportData.totals.gajiPokok,
            'Gaji Lembur (Rp)': reportData.totals.gajiLembur,
            'Total Gaji (Rp)': reportData.totals.totalGaji
        });

        // Styling hanya untuk sel yang berisi data
        totalRow.eachCell((cell, colNumber) => {
            if (colNumber <= reportData.headers.length) {
                // Cek apakah sel ini berisi data (tidak kosong/undefined)
                if (cell.value !== null && cell.value !== undefined && cell.value !== '') {
                    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFDC2626' }
                    };
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };

                    if (colNumber === 1) {
                        cell.alignment = { horizontal: 'right', vertical: 'middle' };
                    } else {
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    }
                }
            }
        });
        currentRow++;
    }

    // === BAGIAN 6: JARAK KOSONG SEBELUM LEGEND (2 BARIS) ===
    currentRow += 2;

    // === BAGIAN 7: LEGEND ===
    if (reportType === 'kehadiran') {
        // Header legend
        const legendHeaderRow = worksheet.addRow(['LEGENDA:']);
        legendHeaderRow.getCell(1).font = {
            name: 'Calibri',
            size: 14,
            bold: true,
            color: { argb: 'FF1F2937' }
        };
        legendHeaderRow.getCell(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE5E7EB' }
        };
        currentRow++;

        // Legend items
        const legendItems = [
            'H: Hadir',
            'T: Telat',
            'A: Absen',
            'I: Izin',
            'L: Lembur',
            'P: Pulang Cepat'
        ];

        legendItems.forEach(item => {
            const legendRow = worksheet.addRow([item]);
            legendRow.getCell(1).font = {
                name: 'Calibri',
                size: 11,
                color: { argb: 'FF374151' }
            };
            currentRow++;
        });
    }

    // Set height untuk baris-baris tertentu
    worksheet.getRow(1).height = 30; // Judul
    worksheet.getRow(headerRowIndex).height = 25; // Header tabel

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
}
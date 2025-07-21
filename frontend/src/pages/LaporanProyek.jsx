// src/pages/LaporanProyek.jsx

import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import axiosInstance from '../api/axiosInstance';
import DatePicker from 'react-datepicker';
import { saveAs } from 'file-saver';

const LaporanProyek = () => {
    const [filters, setFilters] = useState({
        reportType: 'kehadiran',
        lokasiId: '',
        periode: new Date()
    });
    const [metaData, setMetaData] = useState({ lokasi: [] });
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);

    // Fetch metadata (daftar lokasi) saat komponen pertama kali dimuat
    useEffect(() => {
        const fetchMeta = async () => {
            const token = localStorage.getItem('token');
            const { data } = await axiosInstance.get('/manajemen/meta-data', { headers: { Authorization: `Bearer ${token}` } });
            setMetaData(data);
            if (data.lokasi.length > 0) {
                setFilters(prev => ({ ...prev, lokasiId: data.lokasi[0].id_lokasi }));
            }
        };
        fetchMeta();
    }, []);

    const handleFilterChange = (e) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleGenerateReport = async (exportToFile = false) => {
        if (!filters.lokasiId) {
            alert("Silakan pilih lokasi proyek.");
            return;
        }
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const body = {
                ...filters,
                periode: filters.periode.toISOString().slice(0, 7), // Format YYYY-MM
                export: exportToFile
            };

            const config = {
                headers: { Authorization: `Bearer ${token}` },
                // Penting: ubah responseType jika ingin mengunduh file
                responseType: exportToFile ? 'blob' : 'json'
            };

            const response = await axiosInstance.post('/laporan/generate', body, config);

            if (exportToFile) {
                saveAs(response.data, `laporan_${filters.reportType}_${body.periode}.xlsx`);
            } else {
                setReportData(response.data);
            }

        } catch (error) {
            console.error("Gagal membuat laporan:", error);
            alert("Gagal membuat laporan.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            {/* Header Section - Improved mobile layout */}
            <div className="mb-6">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800">Buat Laporan</h1>
            </div>

            {/* Filter Section - Better mobile layout */}
            <div className="p-3 sm:p-4 md:p-6 bg-white rounded-lg shadow-md mb-6">
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Jenis Laporan</label>
                            <select
                                name="reportType"
                                value={filters.reportType}
                                onChange={handleFilterChange}
                                className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                            >
                                <option value="kehadiran">Kehadiran Detail</option>
                                <option value="gaji">Rekapitulasi Gaji</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Lokasi Proyek</label>
                            <select
                                name="lokasiId"
                                value={filters.lokasiId}
                                onChange={handleFilterChange}
                                className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                            >
                                <option value="">Pilih Lokasi</option>
                                {metaData.lokasi.map(l => <option key={l.id_lokasi} value={l.id_lokasi}>{l.nama_lokasi}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Periode (Bulan & Tahun)</label>
                            <DatePicker
                                selected={filters.periode}
                                onChange={date => setFilters(prev => ({...prev, periode: date}))}
                                dateFormat="MMMM yyyy"
                                showMonthYearPicker
                                className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                            />
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={() => handleGenerateReport(false)}
                            disabled={loading}
                            className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 sm:py-3 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 font-medium text-sm sm:text-base"
                        >
                            {loading ? 'Membuat...' : 'Buat Laporan'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Report Display Section */}
            {reportData && (
                <div className="p-3 sm:p-4 md:p-6 bg-white rounded-lg shadow-md">
                    {/* Header Laporan - Better mobile layout */}
                    <div className="flex flex-col gap-4 mb-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="flex-1">
                                <h2 className="text-lg sm:text-xl font-bold text-gray-900">{reportData.title}</h2>
                                <p className="text-sm text-gray-600 mt-1">{reportData.meta.lokasi} | {reportData.meta.periode}</p>
                                <p className="text-xs text-gray-400 mt-1">Dibuat pada: {reportData.meta.dibuatPada}</p>
                            </div>
                            <button
                                onClick={() => handleGenerateReport(true)}
                                disabled={loading}
                                className="w-full sm:w-auto bg-green-600 text-white px-4 py-2 sm:py-3 rounded-lg hover:bg-green-700 disabled:bg-green-300 font-medium text-sm sm:text-base"
                            >
                                📊 Ekspor ke Excel
                            </button>
                        </div>
                    </div>

                    {/* Mobile Card View for Report Data */}
                    <div className="block lg:hidden space-y-3 mb-4">
                        {reportData.rows.map((row, index) => (
                            <div key={index} className="bg-gray-50 p-3 rounded-lg border">
                                <div className="space-y-2">
                                    {reportData.headers.map(header => (
                                        <div key={header} className="flex justify-between items-center">
                                            <span className="text-xs font-medium text-gray-600">{header}:</span>
                                            <span className={`text-sm ${header === 'Nama Pekerja' ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                                                {typeof row[header] === 'number' && header.includes('(Rp)')
                                                    ? `Rp ${row[header].toLocaleString('id-ID')}`
                                                    : row[header]}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}

                        {/* Mobile Summary */}
                        {filters.reportType === 'kehadiran' && reportData.grandTotals && (
                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                <h4 className="font-semibold text-sm text-blue-900 mb-2">GRAND TOTAL</h4>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    <div className="text-center">
                                        <div className="font-medium text-blue-800">Hadir</div>
                                        <div className="text-blue-600">{reportData.grandTotals.hadir}</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="font-medium text-blue-800">Absen</div>
                                        <div className="text-blue-600">{reportData.grandTotals.absen}</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="font-medium text-blue-800">Izin</div>
                                        <div className="text-blue-600">{reportData.grandTotals.izin}</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {filters.reportType === 'gaji' && reportData.totals && (
                            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                                <h4 className="font-semibold text-sm text-green-900 mb-2">GRAND TOTAL</h4>
                                <div className="space-y-1 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-green-800">Gaji Pokok:</span>
                                        <span className="font-medium">Rp {reportData.totals.gajiPokok.toLocaleString('id-ID')}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-green-800">Gaji Lembur:</span>
                                        <span className="font-medium">Rp {reportData.totals.gajiLembur.toLocaleString('id-ID')}</span>
                                    </div>
                                    <div className="flex justify-between border-t border-green-300 pt-1">
                                        <span className="text-green-900 font-semibold">Total Gaji:</span>
                                        <span className="font-bold">Rp {reportData.totals.totalGaji.toLocaleString('id-ID')}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden lg:block overflow-x-auto">
                        <table className="w-full text-left text-xs table-auto">
                            <thead className="bg-gray-100">
                                <tr>
                                    {reportData.headers.map(h => <th key={h} className="p-2 border whitespace-nowrap">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                            {reportData.rows.map((row, index) => (
                                <tr key={index} className="border-b hover:bg-gray-50">
                                    {reportData.headers.map(header => (
                                        <td key={header} className={`p-2 border text-center ${header === 'Nama Pekerja' ? 'text-left font-medium' : ''}`}>
                                            {typeof row[header] === 'number' && header.includes('(Rp)') ? `Rp ${row[header].toLocaleString('id-ID')}` : row[header]}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                            </tbody>
                            <tfoot className="font-bold bg-gray-50">
                            {/* Footer for Attendance Report */}
                            {filters.reportType === 'kehadiran' && reportData.dailyTotals && (
                                <>
                                    <tr>
                                        {reportData.headers.map(header => (
                                            <td key={header} className="p-2 border text-center">
                                                {reportData.dailyTotals[header] || ''}
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td className="p-2 border text-right" colSpan={reportData.headers.length - 3}>GRAND TOTAL</td>
                                        <td className="p-2 border text-center">{reportData.grandTotals.hadir}</td>
                                        <td className="p-2 border text-center">{reportData.grandTotals.absen}</td>
                                        <td className="p-2 border text-center">{reportData.grandTotals.izin}</td>
                                    </tr>
                                </>
                            )}
                            {/* Footer for Salary Report */}
                            {filters.reportType === 'gaji' && reportData.totals && (
                                <tr>
                                    <td colSpan="3" className="p-2 border text-right">GRAND TOTAL</td>
                                    <td className="p-2 border text-center">Rp {reportData.totals.gajiPokok.toLocaleString('id-ID')}</td>
                                    <td className="p-2 border text-center">Rp {reportData.totals.gajiLembur.toLocaleString('id-ID')}</td>
                                    <td className="p-2 border text-center">Rp {reportData.totals.totalGaji.toLocaleString('id-ID')}</td>
                                </tr>
                            )}
                            </tfoot>
                        </table>
                    </div>

                    {/* Legend Section */}
                    {filters.reportType === 'kehadiran' && (
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                            <h4 className="font-semibold text-sm text-gray-800 mb-2">Legenda:</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs text-gray-600">
                                <div><span className="font-bold text-green-600">H</span>: Hadir</div>
                                <div><span className="font-bold text-yellow-600">T</span>: Telat</div>
                                <div><span className="font-bold text-red-600">A</span>: Absen</div>
                                <div><span className="font-bold text-blue-600">I</span>: Izin</div>
                                <div><span className="font-bold text-purple-600">L</span>: Lembur</div>
                                <div><span className="font-bold text-orange-600">P</span>: Pulang Cepat</div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </Layout>
    );
};

export default LaporanProyek;


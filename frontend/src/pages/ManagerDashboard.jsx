import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { Link } from 'react-router-dom';
import { StatCardSpv } from '../components/StatCard';
import { Bar } from 'react-chartjs-2'; // Hanya butuh Bar chart
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { id as indonesianLocale } from 'date-fns/locale';

const ManagerDashboard = () => {
    const { user } = useAuth();
    // State utama
    const [dashboardData, setDashboardData] = useState(null);
    const [izinUntukValidasi, setIzinUntukValidasi] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // --- STATE BARU UNTUK FILTER WAKTU ---
    const [filter, setFilter] = useState('hari');
    const [selectedDate, setSelectedDate] = useState(new Date());

    const fetchIzinData = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axiosInstance.get('/izin/validasi', {
                headers: { Authorization: `Bearer ${token}` },
            });
            setIzinUntukValidasi(response.data);
        } catch (error) {
            console.error("Gagal mengambil data validasi izin:", error);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };


            // --- Tambahkan parameter filter waktu ke API call ---
            const params = {
                filter,
                date: selectedDate.toISOString().split('T')[0],
            };

            try {
                const [managerRes, izinRes] = await Promise.all([
                    axiosInstance.get('dashboard/manager', { headers, params }),
                    axiosInstance.get('izin/validasi', { headers })
                ]);
                setDashboardData(managerRes.data);
                setIzinUntukValidasi(izinRes.data);
            } catch (err) {
                console.error("Gagal memuat data dashboard:", err);
                setError('Gagal memuat beberapa data. Coba refresh halaman.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user.role, filter, selectedDate]); // Tambahkan filter dan selectedDate sebagai dependensi

    const handleAction = async (id_pengajuan, aksi) => {
        let catatan = '';

        if (aksi === 'tolak') {
            let alasan = '';
            do {
                alasan = window.prompt('Mohon masukkan alasan penolakan:');
                if (alasan === null) return;
            } while (!alasan.trim());
            catatan = alasan;
        } else {
            const catatanOpsional = window.prompt('Tambahkan catatan (opsional):', 'Disetujui');
            if (catatanOpsional === null) return;
            catatan = catatanOpsional;
        }

        try {
            const token = localStorage.getItem('token');
            await axiosInstance.put(`/izin/${id_pengajuan}/proses`,
                { aksi, catatan }, // <-- KIRIM 'catatan' DI SINI
                { headers: { Authorization: `Bearer ${token}` } }
            );
            fetchIzinData(); // Refresh list
        } catch (error) {
            alert(`Gagal memproses. ${error.response?.data?.message || ''}`);
        }
    };

    if (loading) return <Layout><div className="text-center p-10">Memuat Dashboard...</div></Layout>;
    if (error) return <Layout><div className="text-center p-10 text-red-500">{error}</div></Layout>;

    return (
        <Layout>
            <div className="mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Dashboard {user.role}</h1>
            </div>

            {/* Filter Controls - Mobile First Design */}
            <div className="mb-6 p-3 sm:p-4 bg-gray-50 rounded-lg shadow-sm space-y-3">
                {/* Date and Period Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                    {/* Filter Tanggal */}
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
                        <DatePicker 
                            selected={selectedDate} 
                            onChange={(date) => setSelectedDate(date)} 
                            dateFormat={filter === 'bulan' ? 'MMMM yyyy' : 'dd MMMM yyyy'} 
                            showMonthYearPicker={filter === 'bulan'} 
                            locale={indonesianLocale} 
                            className="w-full p-3 border border-gray-300 rounded-lg text-center bg-white shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm" 
                        />
                    </div>
                    
                    {/* Filter Periode - Responsive buttons */}
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Periode</label>
                        <div className="grid grid-cols-3 gap-1">
                            <button 
                                onClick={() => setFilter('hari')} 
                                className={`px-2 py-3 text-xs sm:text-sm font-medium rounded-lg transition-colors ${
                                    filter === 'hari' ? 'bg-blue-600 text-white shadow' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                Harian
                            </button>
                            <button 
                                onClick={() => setFilter('minggu')} 
                                className={`px-2 py-3 text-xs sm:text-sm font-medium rounded-lg transition-colors ${
                                    filter === 'minggu' ? 'bg-blue-600 text-white shadow' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                Mingguan
                            </button>
                            <button 
                                onClick={() => setFilter('bulan')} 
                                className={`px-2 py-3 text-xs sm:text-sm font-medium rounded-lg transition-colors ${
                                    filter === 'bulan' ? 'bg-blue-600 text-white shadow' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                Bulanan
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {dashboardData && (
                <>
                    {/* Statistics Cards - Mobile Optimized Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 sm:gap-4 mb-6">
                        <StatCardSpv title="Proyek Aktif" value={dashboardData.summaryCards.totalProyek} icon="🏗️" />
                        <StatCardSpv title="Total Pekerja" value={dashboardData.summaryCards.totalPekerja} icon="👥" />
                        <StatCardSpv title={`Hadir (${filter})`} value={dashboardData.summaryCards.hadir} icon="✅" />
                        <StatCardSpv title={`Telat (${filter})`} value={dashboardData.summaryCards.telat} icon="⚠️" />
                        <StatCardSpv title={`Izin (${filter})`} value={dashboardData.summaryCards.izin} icon="📝" />
                        <StatCardSpv title={`Absen (${filter})`} value={dashboardData.summaryCards.absen} icon="❌" />
                        {filter === 'hari' && (
                            <StatCardSpv title="Belum Hadir" value={dashboardData.summaryCards.belum_hadir} icon="❓" />
                        )}
                    </div>

                    {/* Quick Actions - Mobile Optimized */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6">
                        <Link to="/manager/kelola-pekerja" className="p-4 sm:p-6 bg-blue-500 text-white rounded-lg shadow-lg hover:bg-blue-600 transition-colors flex flex-col justify-center">
                            <h2 className="text-lg sm:text-2xl font-bold">Kelola Pekerja</h2>
                            <p className="mt-1 text-sm sm:text-base">Tambah, edit, dan atur penugasan pekerja.</p>
                        </Link>
                        <Link to="/manager/laporan" className="p-4 sm:p-6 bg-green-500 text-white rounded-lg shadow-lg hover:bg-green-600 transition-colors flex flex-col justify-center">
                            <h2 className="text-lg sm:text-2xl font-bold">Laporan Proyek</h2>
                            <p className="mt-1 text-sm sm:text-base">Buat laporan kehadiran dan penggajian.</p>
                        </Link>
                    </div>

                    {/* Data Tables and Charts - Mobile Optimized */}
                    <div className="space-y-6">
                        {/* Project Summary Table */}
                        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
                            <h2 className="font-semibold text-lg sm:text-xl mb-4">Ringkasan Data per Lokasi Proyek ({filter})</h2>
                            
                            {/* Mobile Card View */}
                            <div className="block lg:hidden space-y-3">
                                {dashboardData.projectPulse.map((proyek) => (
                                    <div key={proyek.id_lokasi} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                        <h3 className="font-medium text-gray-900 text-sm mb-3">{proyek.nama_lokasi}</h3>
                                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                                            <div className="flex justify-between col-span-2">
                                                <span className="font-medium">Pekerja:</span>
                                                <span>{proyek.total_pekerja_proyek}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="font-medium text-green-600">Hadir:</span>
                                                <span className="text-green-600 font-semibold">{proyek.total_hadir}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="font-medium text-yellow-600">Telat:</span>
                                                <span className="text-yellow-600 font-semibold">{proyek.total_telat}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="font-medium text-blue-600">Izin:</span>
                                                <span className="text-blue-600 font-semibold">{proyek.total_izin}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="font-medium text-red-600">Absen:</span>
                                                <span className="text-red-600 font-semibold">{proyek.total_absen}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Desktop Table View */}
                            <div className="hidden lg:block overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="border-b-2 bg-gray-50">
                                        <tr>
                                            <th className="p-3 font-semibold">Nama Proyek</th>
                                            <th className="p-3 font-semibold text-center">Pekerja</th>
                                            <th className="p-3 font-semibold text-center">Hadir</th>
                                            <th className="p-3 font-semibold text-center">Telat</th>
                                            <th className="p-3 font-semibold text-center">Izin</th>
                                            <th className="p-3 font-semibold text-center">Absen</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dashboardData.projectPulse.map((proyek) => (
                                            <tr key={proyek.id_lokasi} className="border-b hover:bg-gray-50 transition-colors">
                                                <td className="p-3 font-medium">{proyek.nama_lokasi}</td>
                                                <td className="p-3 text-center">{proyek.total_pekerja_proyek}</td>
                                                <td className="p-3 text-center text-green-600 font-semibold">{proyek.total_hadir}</td>
                                                <td className="p-3 text-center text-yellow-600 font-semibold">{proyek.total_telat}</td>
                                                <td className="p-3 text-center text-blue-600 font-semibold">{proyek.total_izin}</td>
                                                <td className="p-3 text-center text-red-600 font-semibold">{proyek.total_absen}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Chart Section */}
                        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
                            <h2 className="font-semibold text-lg sm:text-xl mb-4">Perbandingan Kehadiran Antar Proyek ({filter})</h2>
                            <div className="h-64 sm:h-80">
                                <Bar options={{ responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }} data={dashboardData.chartData} />
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Approval Section - Mobile Optimized */}
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md mt-6">
                <h2 className="font-semibold text-lg sm:text-xl mb-4">Izin Membutuhkan Persetujuan Anda</h2>
                {izinUntukValidasi.length > 0 ? (
                    <div className="space-y-4">
                        {izinUntukValidasi.map((izin) => (
                            <div key={izin.id_pengajuan} className="border border-gray-200 p-4 rounded-lg bg-gray-50">
                                <div className="space-y-3">
                                    <div>
                                        <p className="font-medium text-gray-900">{izin.nama_pengguna}</p>
                                        <p className="text-sm text-gray-600">Jenis: {izin.jenis_izin}</p>
                                        <p className="text-sm text-gray-600">Alasan: {izin.keterangan}</p>
                                    </div>
                                    
                                    {/* Lampiran (jika ada) */}
                                    {izin.file_bukti_path && (
                                        <div>
                                            <a
                                                href={`http://localhost:5000/uploads/${izin.file_bukti_path}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-block bg-gray-200 text-gray-700 px-3 py-2 text-sm rounded hover:bg-gray-300 transition"
                                            >
                                                Lihat Lampiran
                                            </a>
                                        </div>
                                    )}
                                    
                                    {/* Action Buttons - Mobile Optimized */}
                                    <div className="flex flex-col sm:flex-row gap-2 pt-2">
                                        <button
                                            onClick={() => handleAction(izin.id_pengajuan, 'tolak')}
                                            className="w-full sm:w-auto bg-red-100 text-red-700 px-4 py-2 rounded hover:bg-red-200 transition text-sm font-medium"
                                        >
                                            Tolak
                                        </button>
                                        <button
                                            onClick={() => handleAction(izin.id_pengajuan, 'setuju')}
                                            className="w-full sm:w-auto bg-green-100 text-green-700 px-4 py-2 rounded hover:bg-green-200 transition text-sm font-medium"
                                        >
                                            Setujui
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        <p className="italic">Tidak ada pengajuan izin yang menunggu persetujuan.</p>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default ManagerDashboard;
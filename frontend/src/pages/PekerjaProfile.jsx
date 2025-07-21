import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { Bar, Line, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css'; // Jangan lupa import CSS
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend);

// Komponen Kartu Statistik (seperti di SupervisorDashboard)
const StatCard = ({ title, value, color }) => (
    <div className={`p-4 rounded-lg shadow-md text-center ${color}`}>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
);

// Komponen Badge Status Berwarna
const StatusBadge = ({ status }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'Hadir': return 'bg-green-100 text-green-800';
      case 'Telat': return 'bg-yellow-100 text-yellow-800';
      case 'Izin': return 'bg-cyan-100 text-cyan-800';
      case 'Lembur': return 'bg-indigo-100 text-indigo-800';
      case 'Pulang Cepat': return 'bg-orange-100 text-orange-800';
      case 'Absen': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor()}`}>{status}</span>;
};


const PekerjaProfile = () => {
  const { user } = useAuth();
  // State untuk data utama
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('bulan');

  // --- STATE BARU UNTUK RIWAYAT INTERAKTIF ---
  const [viewMode, setViewMode] = useState('list'); // 'list' atau 'calendar'
  const [history, setHistory] = useState({ activities: [], pagination: {} });
  const [historyLoading, setHistoryLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState([]);

  // --- FUNGSI BARU UNTUK MENGAMBIL DATA RIWAYAT ---
  const fetchHistory = useCallback(async (page, mode) => {
    setHistoryLoading(true);
    try {
      const token = localStorage.getItem('token');
      let params = {};
      if (mode === 'list') {
        params = { page, limit: 7 }; // Paginasi per 7 hari (mingguan)
      } else { // mode 'calendar'
        params = { month: format(calendarDate, 'yyyy-MM') };
      }

      const res = await axiosInstance.get('/pekerja/history', {
        headers: { Authorization: `Bearer ${token}` },
        params
      });

      if (mode === 'list') {
        setHistory(res.data);
      } else {
        setCalendarData(res.data.activities);
      }

    } catch (err) {
      console.error("Gagal mengambil data riwayat:", err);
    } finally {
      setHistoryLoading(false);
    }
  }, [calendarDate]); // Dependensi pada calendarDate untuk fetch ulang saat bulan ganti

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await axiosInstance.get('/pekerja/profil', {
          headers: { Authorization: `Bearer ${token}` },
          params: { filter }
        });
        setProfileData(res.data);
      } catch (err) {
        setError('Gagal memuat data profil.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user, filter]);

  // Fetch data riwayat sesuai viewMode dan halaman
  useEffect(() => {
    if (viewMode === 'list') {
      fetchHistory(currentPage, 'list');
    } else { // 'calendar'
      fetchHistory(1, 'calendar');
    }
  }, [viewMode, currentPage, fetchHistory]);

  if (loading) return <Layout><div className="text-center p-10">Memuat data profil...</div></Layout>;
  if (error) return <Layout><div className="text-center p-10 text-red-500">{error}</div></Layout>;
  if (!profileData) return <Layout><div className="text-center p-10">Tidak ada data untuk ditampilkan.</div></Layout>;

  const { profileInfo, payrollInfo, attendanceSummary, attendanceChartData, performanceChartData, recentActivities } = profileData;

  // --- FUNGSI UNTUK MEWARNAI KALENDER ---
  const getTileClassName = ({ date, view }) => {
    if (view === 'month') {
      const dateString = format(date, 'yyyy-MM-dd');
      const record = calendarData.find(d => d.tanggal === dateString);
      if (record) {
        return record.status_kehadiran.toLowerCase().replace(' ', '-');
      }
    }
    return '';
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true, // --- MENAMPILKAN LEGEND ---
        position: 'top',
      },
    },
  };

  const pieData = {
    labels: attendanceChartData.labels,
    datasets: attendanceChartData.datasets,
  };

  // --- RENDER KOMPONEN UTAMA ---
  return (
      <Layout>
        {/* Header Profil - Improved mobile layout */}
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md mb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
            <img
                src={profileInfo.foto_profil_path ? `http://localhost:5000/uploads/${profileInfo.foto_profil_path}` : 'https://placehold.co/100x100'}
                alt="Foto Profil"
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-blue-200 object-cover"
            />
            <div className="text-center sm:text-left">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800">{profileInfo.nama_pengguna}</h1>
              <p className="text-base sm:text-lg text-gray-600">{profileInfo.nama_pekerjaan}</p>
              <p className="text-sm text-gray-500">ID: {profileInfo.id_pekerja}</p>
            </div>
          </div>
        </div>

        {/* Filter Buttons - Better mobile layout */}
        <div className="flex justify-center sm:justify-end mb-4">
          <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setFilter('minggu')}
              className={`px-3 sm:px-4 py-2 text-sm rounded-md transition-colors ${
                filter === 'minggu' ? 'bg-blue-600 text-white shadow' : 'bg-transparent text-gray-700 hover:bg-gray-200'
              }`}
            >
              Mingguan
            </button>
            <button
              onClick={() => setFilter('bulan')}
              className={`px-3 sm:px-4 py-2 text-sm rounded-md transition-colors ${
                filter === 'bulan' ? 'bg-blue-600 text-white shadow' : 'bg-transparent text-gray-700 hover:bg-gray-200'
              }`}
            >
              Bulanan
            </button>
          </div>
        </div>

        {/* Main Grid - Better responsive layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Left Column */}
          <div className="lg:col-span-1 flex flex-col gap-4 sm:gap-6">
            {/* Salary Calculation - Better mobile layout */}
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
              <h3 className="font-semibold text-base sm:text-lg mb-3">
                Estimasi Pendapatan ({filter === 'minggu' ? 'Minggu Ini' : 'Bulan Ini'})
              </h3>
              <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-green-600 mb-3">
                Rp {Math.round(payrollInfo.totalEstimasiGaji).toLocaleString('id-ID')}
              </p>
              <div className="text-xs sm:text-sm text-gray-500 space-y-1">
                <p>Gaji Pokok: Rp {Math.round(payrollInfo.estimasiGajiPokok).toLocaleString('id-ID')}</p>
                <p>Gaji Lembur: Rp {Math.round(payrollInfo.estimasiGajiLembur).toLocaleString('id-ID')} ({payrollInfo.totalJamLembur})</p>
                <p className="font-semibold pt-2">Gajian Berikutnya: {payrollInfo.tanggalGajian}</p>
              </div>
            </div>

            {/* Attendance Summary - Better mobile grid */}
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
              <h3 className="font-semibold text-base sm:text-lg mb-4">
                Ringkasan Kehadiran ({filter === 'minggu' ? 'Mingguan' : 'Bulanan'})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 sm:gap-4">
                <StatCard title="Hadir" value={attendanceSummary.Hadir} color="bg-green-100" />
                <StatCard title="Telat" value={attendanceSummary.Telat} color="bg-yellow-100" />
                <StatCard title="Izin" value={attendanceSummary.Izin} color="bg-cyan-100" />
                <StatCard title="Absen" value={attendanceSummary.Absen} color="bg-red-100" />
                <StatCard title="Lembur" value={attendanceSummary.Lembur} color="bg-indigo-100" />
                <StatCard title="Pulang Cepat" value={attendanceSummary['Pulang Cepat']} color="bg-orange-100" />
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-2 flex flex-col gap-4 sm:gap-6">
            {/* Charts Section - Better mobile layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
                <h3 className="font-semibold text-base sm:text-lg mb-4">Distribusi Kehadiran</h3>
                <div className="h-48 sm:h-64">
                  <Pie options={pieOptions} data={pieData} />
                </div>
              </div>
              <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
                <h3 className="font-semibold text-base sm:text-lg mb-4">Performa Jam Kerja</h3>
                <div className="h-48 sm:h-64">
                  {performanceChartData.type === 'bar' && <Bar options={{ responsive: true, maintainAspectRatio: false }} data={{ labels: performanceChartData.labels, datasets: performanceChartData.datasets }} />}
                  {performanceChartData.type === 'line' && <Line options={{ responsive: true, maintainAspectRatio: false }} data={{ labels: performanceChartData.labels, datasets: performanceChartData.datasets }} />}
                </div>
              </div>
            </div>

            {/* Attendance History - MAJOR MOBILE IMPROVEMENTS */}
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                <h3 className="font-semibold text-base sm:text-lg">Riwayat Kehadiran</h3>
                <div className='flex items-center gap-2 bg-gray-100 p-1 rounded-lg'>
                  <span className="text-xs sm:text-sm font-medium text-gray-700 hidden sm:inline">Tampilan:</span>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded transition-colors ${
                      viewMode === 'list' ? 'bg-blue-600 text-white shadow' : 'bg-transparent text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    📋 Daftar
                  </button>
                  <button
                    onClick={() => setViewMode('calendar')}
                    className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded transition-colors ${
                      viewMode === 'calendar' ? 'bg-blue-600 text-white shadow' : 'bg-transparent text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    📅 Kalender
                  </button>
                </div>
              </div>

              {historyLoading ? (
                <div className="text-center p-8 text-gray-500">Memuat riwayat...</div>
              ) : (
                viewMode === 'list' ? (
                  <>
                    {/* Mobile Card View for Attendance History */}
                    <div className="block md:hidden space-y-3">
                      {history.activities.length > 0 ? (
                        history.activities.map((h, i) => (
                          <div key={i} className="bg-gray-50 p-3 rounded-lg border">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1">
                                <div className="font-medium text-gray-900 text-sm">
                                  {format(new Date(h.tanggal), 'eeee, dd MMM yyyy', { locale: id })}
                                </div>
                              </div>
                              <StatusBadge status={h.status_kehadiran} />
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                              <div>
                                <span className="font-medium">Jam Masuk:</span>
                                <br />{h.jam_masuk || '-'}
                              </div>
                              <div>
                                <span className="font-medium">Jam Keluar:</span>
                                <br />{h.jam_keluar || '-'}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500 text-sm">
                          Tidak ada data kehadiran.
                        </div>
                      )}
                    </div>

                    {/* Desktop Table View for Attendance History */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b-2 border-gray-200">
                            <th className="py-2 px-3 font-medium text-gray-700">Tanggal</th>
                            <th className="py-2 px-3 font-medium text-gray-700">Jam Masuk</th>
                            <th className="py-2 px-3 font-medium text-gray-700">Jam Keluar</th>
                            <th className="py-2 px-3 font-medium text-gray-700">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {history.activities.length > 0 ? (
                            history.activities.map((h, i) => (
                              <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="py-3 px-3 font-medium">
                                  {format(new Date(h.tanggal), 'eeee, dd MMM yyyy', { locale: id })}
                                </td>
                                <td className="py-3 px-3 text-gray-600">{h.jam_masuk || '-'}</td>
                                <td className="py-3 px-3 text-gray-600">{h.jam_keluar || '-'}</td>
                                <td className="py-3 px-3"><StatusBadge status={h.status_kehadiran} /></td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="4" className="text-center py-8 text-gray-500">
                                Tidak ada data kehadiran.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination - Better mobile layout */}
                    {history.pagination && history.pagination.totalPages > 1 && (
                      <div className="flex flex-col sm:flex-row justify-between items-center mt-4 pt-4 border-t gap-3">
                        <button
                          onClick={() => setCurrentPage(p => p - 1)}
                          disabled={currentPage === 1}
                          className="w-full sm:w-auto px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-300 text-sm font-medium"
                        >
                          Sebelumnya
                        </button>
                        <span className="text-xs sm:text-sm text-gray-600 order-first sm:order-none">
                          Halaman {currentPage} dari {history.pagination.totalPages}
                        </span>
                        <button
                          onClick={() => setCurrentPage(p => p + 1)}
                          disabled={currentPage === history.pagination.totalPages}
                          className="w-full sm:w-auto px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-300 text-sm font-medium"
                        >
                          Berikutnya
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  /* Calendar View - Better mobile responsive */
                  <div className="calendar-container">
                    <style jsx>{`
                      .calendar-container .react-calendar {
                        width: 100%;
                        background: white;
                        border: 1px solid #e5e7eb;
                        border-radius: 0.5rem;
                        font-family: inherit;
                      }
                      .calendar-container .react-calendar__navigation {
                        display: flex;
                        height: 44px;
                        margin-bottom: 1em;
                      }
                      .calendar-container .react-calendar__navigation button {
                        min-width: 44px;
                        background: none;
                        font-size: 16px;
                        margin-top: 8px;
                      }
                      .calendar-container .react-calendar__month-view__weekdays {
                        text-align: center;
                        text-transform: uppercase;
                        font-weight: bold;
                        font-size: 0.75em;
                        padding: 8px 0;
                      }
                      .calendar-container .react-calendar__tile {
                        max-width: 100%;
                        padding: 8px 4px;
                        background: none;
                        text-align: center;
                        line-height: 16px;
                        font-size: 0.875em;
                      }
                      .calendar-container .react-calendar__tile:enabled:hover,
                      .calendar-container .react-calendar__tile:enabled:focus {
                        background-color: #e6f3ff;
                      }
                      @media (max-width: 640px) {
                        .calendar-container .react-calendar__tile {
                          padding: 6px 2px;
                          font-size: 0.75em;
                        }
                        .calendar-container .react-calendar__navigation button {
                          font-size: 14px;
                        }
                      }
                      .calendar-container .hadir { background-color: #dcfce7 !important; color: #166534; }
                      .calendar-container .telat { background-color: #fef3c7 !important; color: #92400e; }
                      .calendar-container .izin { background-color: #cffafe !important; color: #155e75; }
                      .calendar-container .lembur { background-color: #e0e7ff !important; color: #3730a3; }
                      .calendar-container .pulang-cepat { background-color: #fed7aa !important; color: #9a3412; }
                      .calendar-container .absen { background-color: #fecaca !important; color: #991b1b; }
                    `}</style>
                    <Calendar
                        locale="id-ID"
                        activeStartDate={calendarDate}
                        onActiveStartDateChange={({ activeStartDate }) => setCalendarDate(activeStartDate)}
                        tileClassName={getTileClassName}
                    />
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </Layout>
  );
};

export default PekerjaProfile;


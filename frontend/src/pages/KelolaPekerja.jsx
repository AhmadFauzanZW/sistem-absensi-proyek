// src/pages/KelolaPekerja.jsx

import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import axiosInstance from '../api/axiosInstance';
import PekerjaFormModal from '../components/PekerjaFormModal';
import FaceRegistrationModal from '../components/FaceRegistrationModal';
import QrGenerationModal from '../components/QrGenerationModal';

const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
};

const KelolaPekerja = () => {
    const [workers, setWorkers] = useState([]);
    const [pagination, setPagination] = useState({});
    const [metaData, setMetaData] = useState({ lokasi: [], jabatan: [] });
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedWorker, setSelectedWorker] = useState(null);
    const [isFaceModalOpen, setIsFaceModalOpen] = useState(false);
    const [isQrModalOpen, setIsQrModalOpen] = useState(false);
    const [selectedWorkerForFace, setSelectedWorkerForFace] = useState(null);
    const [selectedWorkerForQr, setSelectedWorkerForQr] = useState(null);

    const [queryParams, setQueryParams] = useState({
        search: '',
        lokasi: '',
        jabatan: '',
        page: 1,
        sortBy: 'nama_pengguna',
        sortOrder: 'ASC'
    });

    const debouncedSearch = useDebounce(queryParams.search, 500); // 500ms delay

    const fetchData = useCallback(async () => {
        setLoading(true);
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        try {
            // Mengirim semua parameter ke backend
            const { data } = await axiosInstance.get('/manajemen/pekerja', { headers, params: { ...queryParams, search: debouncedSearch } });
            setWorkers(data.workers);
            setPagination(data.pagination);
        } catch (error) {
            console.error("Gagal mengambil data pekerja:", error);
        } finally {
            setLoading(false);
        }
    }, [queryParams, debouncedSearch]); // Fetch ulang jika ada perubahan

    // Fetch data
    useEffect(() => {
        fetchData();

        const fetchMeta = async () => {
            const token = localStorage.getItem('token');
            const { data } = await axiosInstance.get('/manajemen/meta-data', { headers: { Authorization: `Bearer ${token}` } });
            setMetaData(data);
        }
        fetchMeta();
    }, [fetchData]);

    const handleQueryChange = (e) => {
        setQueryParams(prev => ({ ...prev, [e.target.name]: e.target.value, page: 1 }));
    };

    const handleSort = (field) => {
        const newSortOrder = queryParams.sortBy === field && queryParams.sortOrder === 'ASC' ? 'DESC' : 'ASC';
        setQueryParams(prev => ({ ...prev, sortBy: field, sortOrder: newSortOrder, page: 1 }));
    }

    const handleOpenModal = (worker = null) => {
        setSelectedWorker(worker);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedWorker(null);
    };

    const handleSubmit = async (formData) => {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        try {
            if (selectedWorker) { // Edit mode
                await axiosInstance.put(`/manajemen/pekerja/${selectedWorker.id_pekerja}`, { ...formData, id_pengguna: selectedWorker.id_pengguna }, { headers });
            } else { // Add mode
                await axiosInstance.post('/manajemen/pekerja', formData, { headers });
            }
            // Refresh data
            const { data } = await axiosInstance.get('/manajemen/pekerja', { headers });
            setWorkers(data);
            handleCloseModal();
        } catch (error) {
            console.error("Gagal menyimpan data pekerja:", error);
            alert(error.response?.data?.message || 'Terjadi kesalahan');
        }
    };

    const handleStatusChange = async (id_pengguna, currentStatus) => {
        if (window.confirm(`Anda yakin ingin mengubah status pekerja ini menjadi ${currentStatus === 'Aktif' ? 'Nonaktif' : 'Aktif'}?`)) {
            const token = localStorage.getItem('token');
            const newStatus = currentStatus === 'Aktif' ? 'Nonaktif' : 'Aktif';
            try {
                await axiosInstance.patch(`/manajemen/pekerja/status/${id_pengguna}`, { status: newStatus }, { headers: { Authorization: `Bearer ${token}` } });
                // Refresh data
                const { data } = await axiosInstance.get('/manajemen/pekerja', { headers: { Authorization: `Bearer ${token}` } });
                setWorkers(data);
            } catch (error) {
                console.error("Gagal mengubah status:", error);
            }
        }
    };

    // Handle Face Registration Modal
    const handleOpenFaceModal = (worker) => {
        setSelectedWorkerForFace(worker);
        setIsFaceModalOpen(true);
    };

    const handleCloseFaceModal = () => {
        setIsFaceModalOpen(false);
        setSelectedWorkerForFace(null);
    };

    // Handle QR Generation Modal
    const handleOpenQrModal = (worker) => {
        setSelectedWorkerForQr(worker);
        setIsQrModalOpen(true);
    };

    const handleCloseQrModal = () => {
        setIsQrModalOpen(false);
        setSelectedWorkerForQr(null);
    };

    // Generate QR Code for worker
    const handleGenerateQR = async (workerId, qrCodeValue) => {
        const token = localStorage.getItem('token');
        try {
            const response = await axiosInstance.post(`/manajemen/pekerja/${workerId}/generate-qr`, {
                qr_code: qrCodeValue
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (response.data.success) {
                alert('QR Code berhasil disimpan!');
                fetchData(); // Refresh data
                handleCloseQrModal();
            }
        } catch (error) {
            console.error("Gagal simpan QR:", error);
            alert(error.response?.data?.message || 'Gagal menyimpan QR Code');
        }
    };

    // Handle Face Registration
    const handleFaceRegistration = async (faceData) => {
        const token = localStorage.getItem('token');
        try {
            // Use the correct endpoint that matches your backend routes
            const response = await axiosInstance.patch(`/manajemen/pekerja/${selectedWorkerForFace.id_pekerja}/face-registration`, {
                nama_pengguna: selectedWorkerForFace.nama_pengguna,
                face_image: faceData.faceImage // Base64 image
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                alert('Wajah berhasil didaftarkan!');
                fetchData(); // Refresh data
                handleCloseFaceModal();
            }
        } catch (error) {
            console.error("Gagal daftar wajah:", error);
            alert(error.response?.data?.message || 'Gagal mendaftarkan wajah');
        }
    };

    return (
        <Layout>
            {/* Header Section - Improved mobile layout */}
            <div className="flex flex-col gap-4 mb-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex-1">
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800">Kelola Data Pekerja</h1>
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 sm:py-3 rounded-lg font-bold hover:bg-blue-700 text-sm sm:text-base"
                    >
                        + Tambah Pekerja
                    </button>
                </div>
            </div>

            {/* Filter and Search Section - Better mobile layout */}
            <div className="mb-6 p-3 sm:p-4 bg-gray-50 rounded-lg shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div className="order-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cari Pekerja</label>
                        <input
                            type="text"
                            name="search"
                            placeholder="Nama atau email..."
                            value={queryParams.search}
                            onChange={handleQueryChange}
                            className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                    </div>
                    <div className="order-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Lokasi</label>
                        <select
                            name="lokasi"
                            value={queryParams.lokasi}
                            onChange={handleQueryChange}
                            className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                        >
                            <option value="">Semua Lokasi</option>
                            {metaData.lokasi.map(l => <option key={l.id_lokasi} value={l.id_lokasi}>{l.nama_lokasi}</option>)}
                        </select>
                    </div>
                    <div className="order-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Jabatan</label>
                        <select
                            name="jabatan"
                            value={queryParams.jabatan}
                            onChange={handleQueryChange}
                            className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                        >
                            <option value="">Semua Jabatan</option>
                            {metaData.jabatan.map(j => <option key={j.id_jenis_pekerjaan} value={j.id_jenis_pekerjaan}>{j.nama_pekerjaan}</option>)}
                        </select>
                    </div>
                    <div className="order-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Urutkan</label>
                        <select
                            name="sortBy"
                            value={queryParams.sortBy + '_' + queryParams.sortOrder}
                            onChange={(e) => {
                                const [sortBy, sortOrder] = e.target.value.split('_');
                                setQueryParams(prev => ({...prev, sortBy, sortOrder, page: 1}))
                            }}
                            className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                        >
                            <option value="nama_pengguna_ASC">Nama (A-Z)</option>
                            <option value="nama_pengguna_DESC">Nama (Z-A)</option>
                            <option value="waktu_dibuat_DESC">Tanggal Masuk (Terbaru)</option>
                            <option value="waktu_dibuat_ASC">Tanggal Masuk (Terlama)</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-white p-3 sm:p-4 md:p-6 rounded-lg shadow-md">
                {/* Mobile Card View */}
                <div className="block lg:hidden space-y-4">
                    {loading ? (
                        <div className="text-center p-8 text-gray-500">Memuat data...</div>
                    ) : workers.length === 0 ? (
                        <div className="text-center p-8 text-gray-500">Tidak ada data pekerja</div>
                    ) : (
                        workers.map(w => (
                            <div key={w.id_pekerja} className="bg-gray-50 p-4 rounded-lg border">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-900">{w.nama_pengguna}</h3>
                                        <p className="text-sm text-gray-600">{w.email}</p>
                                        <p className="text-sm text-gray-600">{w.nama_pekerjaan} • {w.nama_lokasi}</p>
                                    </div>
                                    <span className={`px-2 py-1 text-xs rounded-full ${w.status_pengguna === 'Aktif' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {w.status_pengguna}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">Wajah:</span>
                                        <span className={`px-2 py-1 rounded-full ${w.face_registered ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                                            {w.face_registered ? '✓ Ada' : '⚠ Belum'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">QR:</span>
                                        <span className={`px-2 py-1 rounded-full ${w.kode_qr ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                                            {w.kode_qr ? '✓ Ada' : '⚠ Belum'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => handleOpenModal(w)}
                                        className="flex-1 bg-blue-500 text-white text-xs px-3 py-2 rounded hover:bg-blue-600 transition-colors"
                                    >
                                        ✏️ Edit
                                    </button>
                                    <button
                                        onClick={() => handleOpenFaceModal(w)}
                                        className="flex-1 bg-purple-500 text-white text-xs px-3 py-2 rounded hover:bg-purple-600 transition-colors"
                                    >
                                        📷 {w.face_registered ? 'Update' : 'Daftar'}
                                    </button>
                                    <button
                                        onClick={() => handleOpenQrModal(w)}
                                        className="flex-1 bg-indigo-500 text-white text-xs px-3 py-2 rounded hover:bg-indigo-600 transition-colors"
                                    >
                                        📱 {w.kode_qr ? 'Update' : 'Buat QR'}
                                    </button>
                                    <button
                                        onClick={() => handleStatusChange(w.id_pengguna, w.status_pengguna)}
                                        className={`flex-1 text-xs px-3 py-2 rounded transition-colors ${
                                            w.status_pengguna === 'Aktif'
                                                ? 'bg-red-500 text-white hover:bg-red-600'
                                                : 'bg-green-500 text-white hover:bg-green-600'
                                        }`}
                                    >
                                        {w.status_pengguna === 'Aktif' ? '🔴 Nonaktif' : '🟢 Aktif'}
                                    </button>
                                </div>

                                <div className="mt-2 text-xs text-gray-500">
                                    Bergabung: {new Date(w.waktu_dibuat).toLocaleDateString('id-ID')}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="p-3 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('nama_pengguna')}>
                                    Nama {queryParams.sortBy === 'nama_pengguna' && (queryParams.sortOrder === 'ASC' ? '▲' : '▼')}
                                </th>
                                <th className="p-3">Email</th>
                                <th className="p-3">Jabatan</th>
                                <th className="p-3">Lokasi</th>
                                <th className="p-3 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('waktu_dibuat')}>
                                    Tgl Dibuat {queryParams.sortBy === 'waktu_dibuat' && (queryParams.sortOrder === 'ASC' ? '▲' : '▼')}
                                </th>
                                <th className="p-3 text-center">Status</th>
                                <th className="p-3 text-center">Wajah</th>
                                <th className="p-3 text-center">QR Code</th>
                                <th className="p-3 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                        {loading ? (
                            <tr><td colSpan="9" className="text-center p-4">Memuat data...</td></tr>
                        ) : workers.length === 0 ? (
                            <tr><td colSpan="9" className="text-center p-4 text-gray-500">Tidak ada data pekerja</td></tr>
                        ) : (
                            workers.map(w => (
                                <tr key={w.id_pekerja} className="border-b hover:bg-gray-50">
                                    <td className="p-3 font-medium">{w.nama_pengguna}</td>
                                    <td className="p-3 text-gray-600">{w.email}</td>
                                    <td className="p-3">{w.nama_pekerjaan}</td>
                                    <td className="p-3 text-gray-600">{w.nama_lokasi}</td>
                                    <td className="p-3 text-gray-600">{new Date(w.waktu_dibuat).toLocaleDateString('id-ID')}</td>
                                    <td className="p-3 text-center">
                                        <span className={`px-2 py-1 text-xs rounded-full ${w.status_pengguna === 'Aktif' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {w.status_pengguna}
                                        </span>
                                    </td>
                                    <td className="p-3 text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <span className={`px-2 py-1 text-xs rounded-full ${w.face_registered ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                                                {w.face_registered ? '✓ Ada' : '⚠ Belum'}
                                            </span>
                                            <button
                                                onClick={() => handleOpenFaceModal(w)}
                                                className="bg-purple-500 text-white text-xs px-2 py-1 rounded hover:bg-purple-600 transition-colors"
                                                title={w.face_registered ? 'Update Wajah' : 'Daftar Wajah'}
                                            >
                                                {w.face_registered ? '🔄 Update' : '📷 Daftar'}
                                            </button>
                                        </div>
                                    </td>
                                    <td className="p-3 text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <span className={`px-2 py-1 text-xs rounded-full ${w.kode_qr ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                                                {w.kode_qr ? '✓ Ada' : '⚠ Belum'}
                                            </span>
                                            <button
                                                onClick={() => handleOpenQrModal(w)}
                                                className="bg-indigo-500 text-white text-xs px-2 py-1 rounded hover:bg-indigo-600 transition-colors"
                                                title={w.kode_qr ? 'Generate Ulang QR' : 'Generate QR'}
                                            >
                                                {w.kode_qr ? '🔄 Generate' : '📱 Buat QR'}
                                            </button>
                                        </div>
                                    </td>
                                    <td className="p-3 text-center">
                                        <div className="flex flex-col gap-1">
                                        <button
                                            onClick={() => handleOpenModal(w)}
                                            className="bg-blue-500 text-white text-xs px-3 py-1 rounded cursor-pointer hover:bg-blue-600 transition-colors"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleStatusChange(w.id_pengguna, w.status_pengguna)}
                                            className={`text-xs px-3 py-1 rounded cursor-pointer transition-colors ${
                                                w.status_pengguna === 'Aktif'
                                                    ? 'bg-red-500 text-white hover:bg-red-600'
                                                    : 'bg-green-500 text-white hover:bg-green-600'
                                            }`}
                                        >
                                            {w.status_pengguna === 'Aktif' ? 'Nonaktif' : 'Aktif'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination - Better mobile layout */}
                {!loading && pagination.totalPages > 0 && (
                    <div className="flex flex-col sm:flex-row justify-between items-center mt-4 pt-4 border-t gap-3">
                        <span className="text-xs sm:text-sm text-gray-600 order-first sm:order-none">
                            Menampilkan {workers.length} dari {pagination.totalItems} pekerja
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setQueryParams(prev => ({...prev, page: prev.page - 1}))}
                                disabled={pagination.currentPage === 1}
                                className="px-3 py-2 bg-gray-200 rounded cursor-pointer disabled:opacity-50 hover:bg-gray-300 text-sm font-medium"
                            >
                                Sebelumnya
                            </button>
                            <span className="text-xs sm:text-sm px-2">
                                Hal {pagination.currentPage} dari {pagination.totalPages}
                            </span>
                            <button
                                onClick={() => setQueryParams(prev => ({...prev, page: prev.page + 1}))}
                                disabled={pagination.currentPage === pagination.totalPages}
                                className="px-3 py-2 bg-gray-200 rounded cursor-pointer disabled:opacity-50 hover:bg-gray-300 text-sm font-medium"
                            >
                                Berikutnya
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <PekerjaFormModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSubmit={handleSubmit}
                initialData={selectedWorker}
                metaData={metaData}
            />

            <FaceRegistrationModal
                isOpen={isFaceModalOpen}
                onClose={handleCloseFaceModal}
                onSubmit={handleFaceRegistration}
                worker={selectedWorkerForFace}
            />

            <QrGenerationModal
                isOpen={isQrModalOpen}
                onClose={handleCloseQrModal}
                onGenerate={handleGenerateQR}
                worker={selectedWorkerForQr}
            />
        </Layout>
    );
};

export default KelolaPekerja;


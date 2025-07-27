import { useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import Layout from '../components/Layout';

const PengajuanIzin = () => {
    const [formData, setFormData] = useState({
        jenis_izin: 'Sakit',
        tanggal_mulai: '',
        tanggal_selesai: '',
        keterangan: ''
    });
    const [file, setFile] = useState(null);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && selectedFile.size > 5 * 1024 * 1024) {
            setError('Ukuran file tidak boleh lebih dari 5MB.');
            setFile(null);
        } else {
            setFile(selectedFile);
            setError('');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');

        // Validasi tanggal
        const startDate = new Date(formData.tanggal_mulai);
        const endDate = new Date(formData.tanggal_selesai);

        if (startDate > endDate) {
            setError('Tanggal selesai harus setelah tanggal mulai.');
            return;
        }

        // Siapkan FormData untuk dikirim
        const data = new FormData();
        data.append('jenis_izin', formData.jenis_izin);
        data.append('tanggal_mulai', formData.tanggal_mulai);
        data.append('tanggal_selesai', formData.tanggal_selesai);
        data.append('keterangan', formData.keterangan);

        if (file) {
            data.append('bukti', file); // Pastikan nama field sesuai multer di backend
        }

        try {
            const token = localStorage.getItem('token');
            await axiosInstance.post('/izin', data, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            setMessage('Pengajuan izin berhasil dikirim.');
            setFormData({
                jenis_izin: 'Sakit',
                tanggal_mulai: '',
                tanggal_selesai: '',
                keterangan: ''
            });
            setFile(null);
        } catch (err) {
            console.error("Error saat mengirim izin:", err);
            setError(err.response?.data?.message || 'Terjadi kesalahan saat mengirim pengajuan.');
        }
    };

    return (
        <Layout>
            <div className="max-w-2xl mx-auto">
                {/* Header - Mobile Optimized */}
                <div className="mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 text-center sm:text-left">Buat Pengajuan Izin</h1>
                </div>

                {/* Form Container */}
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
                    <form onSubmit={handleSubmit} encType="multipart/form-data" className="space-y-6">
                        {/* Jenis Izin */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Jenis Izin</label>
                            <select
                                name="jenis_izin"
                                value={formData.jenis_izin}
                                onChange={handleChange}
                                className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                            >
                                <option>Sakit</option>
                                <option>Cuti</option>
                                <option>Izin Penting</option>
                            </select>
                        </div>

                        {/* Rentang Tanggal */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Rentang Tanggal</label>
                            <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-4">
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1 sm:sr-only">Tanggal Mulai</label>
                                    <input
                                        type="date"
                                        name="tanggal_mulai"
                                        value={formData.tanggal_mulai}
                                        onChange={handleChange}
                                        required
                                        placeholder="Tanggal mulai"
                                        className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1 sm:sr-only">Tanggal Selesai</label>
                                    <input
                                        type="date"
                                        name="tanggal_selesai"
                                        value={formData.tanggal_selesai}
                                        onChange={handleChange}
                                        required
                                        placeholder="Tanggal selesai"
                                        className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Keterangan */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Keterangan</label>
                            <textarea
                                name="keterangan"
                                value={formData.keterangan}
                                onChange={handleChange}
                                rows="4"
                                required
                                placeholder="Jelaskan alasan izin Anda..."
                                className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
                            ></textarea>
                        </div>

                        {/* Lampiran Bukti */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Lampiran Bukti (Opsional)</label>
                            <div className="relative">
                                <input
                                    type="file"
                                    name="bukti"
                                    onChange={handleFileChange}
                                    accept="image/*,.pdf,.doc,.docx"
                                    className="w-full p-3 border border-gray-300 rounded-lg shadow-sm text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                                />
                                {file && (
                                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                                        <p className="text-sm text-green-700">📎 {file.name}</p>
                                    </div>
                                )}
                            </div>
                            <p className="mt-1 text-xs text-gray-500">Format yang didukung: JPG, PNG, PDF, DOC (Max: 5MB)</p>
                        </div>

                        {/* Pesan feedback */}
                        {message && (
                            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                <p className="text-green-700 text-sm">✅ {message}</p>
                            </div>
                        )}
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-red-700 text-sm">❌ {error}</p>
                            </div>
                        )}

                        {/* Tombol Submit */}
                        <button
                            type="submit"
                            className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors duration-200 text-sm sm:text-base"
                        >
                            Kirim Pengajuan
                        </button>
                    </form>
                </div>
            </div>
        </Layout>
    );
};

export default PengajuanIzin;
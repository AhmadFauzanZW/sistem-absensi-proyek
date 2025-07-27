// src/api/axiosInstance.js

import axios from 'axios';

// const API_BASE_URL = `http://localhost:3000/api`;
const API_BASE_URL = `https://api.absenproyek.biz.id/api`;
const axiosInstance = axios.create({
    // baseURL: 'https://api.absenproyek.biz.id/api', // Use HTTPS for API
    baseURL: API_BASE_URL,
    timeout: 10000,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    }
});
// -------------------------------------------------------------------

// Interceptor untuk setiap PERMINTAAN (REQUEST)
axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Interceptor untuk setiap RESPONS (RESPONSE)
axiosInstance.interceptors.response.use(
    (response) => {
        // Jika respons sukses (status 2xx), langsung kembalikan
        return response;
    },
    (error) => {
        // Cek jika error adalah karena token tidak valid (401)
        if (error.response?.status === 401 && error.config?.url !== '/api/auth/login') {
            // Hapus data yang tidak valid
            localStorage.removeItem('token');
            localStorage.removeItem('user');

            // Arahkan ke halaman login
            // Beri pesan (opsional)
            alert('Sesi Anda telah berakhir. Silakan login kembali.');
            // Gunakan window.location agar halaman refresh total dan state kembali bersih
            window.location.href = '/login';
        }

        // Kembalikan error agar bisa ditangani oleh .catch() jika perlu
        return Promise.reject(error);
    }
);

export default axiosInstance;
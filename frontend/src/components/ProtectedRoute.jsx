/*
 * Sistem Absensi Proyek
 * Copyright (c) 2025 Ahmad Fauzan
 * 
 * Licensed for PERSONAL and INTERNAL USE ONLY.
 * Redistribution, publication, or COMMERCIAL USE without prior written permission is strictly prohibited.
 * 
 * For commercial licensing requests, please contact: [email@example.com]
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, token } = useAuth();
  const location = useLocation();

  // 1. Cek apakah pengguna sudah login (punya token)
  if (!token) {
    // Jika belum, alihkan ke halaman login.
    // `replace` digunakan agar pengguna tidak bisa kembali ke halaman sebelumnya dengan tombol back browser.
    // `state` digunakan untuk menyimpan halaman asal, agar setelah login bisa kembali ke sana.
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // 2. Cek apakah peran pengguna diizinkan untuk mengakses halaman ini
  // `allowedRoles` adalah array peran yang kita definisikan di App.jsx
  if (!allowedRoles.includes(user.role)) {
    // Jika peran tidak sesuai, alihkan ke halaman "Unauthorized"
    return <Navigate to="/unauthorized" replace />;
  }

  // 3. Jika semua pengecekan lolos, tampilkan halaman yang diminta
  return children;
};

export default ProtectedRoute;
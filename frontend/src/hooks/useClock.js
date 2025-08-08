/*
 * Sistem Absensi Proyek
 * Copyright (c) 2025 Ahmad Fauzan
 * 
 * Licensed for PERSONAL and INTERNAL USE ONLY.
 * Redistribution, publication, or COMMERCIAL USE without prior written permission is strictly prohibited.
 * 
 * For commercial licensing requests, please contact: [email@example.com]
 */

import { useState, useEffect } from 'react';

export const useClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    // Update waktu setiap detik
    const timerId = setInterval(() => {
      setTime(new Date());
    }, 1000);

    // Membersihkan interval saat komponen di-unmount
    return () => clearInterval(timerId);
  }, []);

  return time;
};
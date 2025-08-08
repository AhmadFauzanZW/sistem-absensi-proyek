/*
 * Sistem Absensi Proyek
 * Copyright (c) 2025 Ahmad Fauzan
 * 
 * Licensed for PERSONAL and INTERNAL USE ONLY.
 * Redistribution, publication, or COMMERCIAL USE without prior written permission is strictly prohibited.
 * 
 * For commercial licensing requests, please contact: [email@example.com]
 */

import { useState } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const Layout = ({ children }) => {
    // State untuk membuka/menutup sidebar di mode mobile
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    const toggleSidebar = () => {
        setSidebarOpen(!isSidebarOpen);
    };

    return (
        <div className="flex h-screen bg-gray-100">
        {/* Kirim state dan fungsi toggle ke Sidebar */}
        <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

        <div className="flex-1 flex flex-col">
            {/* Kirim fungsi toggle ke Navbar untuk tombol hamburger */}
            <Navbar toggleSidebar={toggleSidebar} />

            <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
            {children}
            </main>
        </div>
        </div>
    );
};

export default Layout;
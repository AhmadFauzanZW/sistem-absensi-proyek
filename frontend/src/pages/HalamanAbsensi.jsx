// src/pages/HalamanAbsensi.jsx

import { useState } from 'react';
import Layout from '../components/Layout';
import AttendanceModal from '../components/absensi/AttendanceModal';
import DailyStatusTable from '../components/absensi/DailyStatusTable';
import WeeklyReport from '../components/absensi/WeeklyReport';
import { useAttendanceData } from '../hooks/useAttendanceData';

const HalamanAbsensi = () => {
    // State untuk Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalConfig, setModalConfig] = useState({ mode: '', worker: null, actionType: 'clock_in' });

    // Use custom hook for data management
    const {
        workerStatusList,
        isLoading,
        systemSetupMessage,
        absensiMingguan,
        reportLoading,
        selectedDate,
        setSelectedDate,
        handleActionComplete
    } = useAttendanceData();

    const openModal = (mode, worker = null, actionType) => {
        setModalConfig({ mode, worker, actionType });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
    };

    if (isLoading && workerStatusList.length === 0) {
        return (
            <Layout>
                <p className="p-10 text-center text-lg font-semibold animate-pulse">
                    {systemSetupMessage}
                </p>
            </Layout>
        );
    }

    return (
        <Layout>
            {/* Header Section - Mobile Optimized */}
            <div className="mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4">Manajemen Absensi Harian</h1>
                
                {/* Action Buttons - Mobile First */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <button
                        onClick={() => openModal('face', null, 'smart')}
                        className="w-full bg-teal-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-teal-700 transition-colors text-sm sm:text-base"
                    >
                        🤳 Absensi Wajah
                    </button>
                    <button
                        onClick={() => openModal('qr', null, 'smart')}
                        className="w-full bg-sky-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-sky-700 transition-colors text-sm sm:text-base"
                    >
                        📱 Pindai QR Code
                    </button>
                </div>
            </div>

            {/* Daily Status Table */}
            <DailyStatusTable 
                workerStatusList={workerStatusList}
                isLoading={isLoading}
                onOpenModal={openModal}
            />

            {/* Weekly Report */}
            <WeeklyReport 
                absensiMingguan={absensiMingguan}
                reportLoading={reportLoading}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
            />

            {/* Attendance Modal */}
            <AttendanceModal
                isOpen={isModalOpen}
                onClose={closeModal}
                onComplete={handleActionComplete}
                {...modalConfig}
            />
        </Layout>
    );
};

export default HalamanAbsensi;

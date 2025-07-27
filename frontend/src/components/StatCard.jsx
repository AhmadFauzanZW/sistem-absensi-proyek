import React from 'react';

// Komponen kecil untuk menampilkan perubahan (▲ atau ▼)
const ChangeIndicator = ({ value }) => {
    if (value === null || isNaN(value) || !isFinite(value)) return null;

    const isPositive = value > 0;
    const color = isPositive ? 'text-red-500' : 'text-green-500';
    const icon = isPositive ? '▲' : '▼';

    return (
        <span className={`text-xs font-semibold ml-2 ${color}`}>
            {icon} {Math.abs(value).toFixed(1)}%
        </span>
    );
};

const StatCard = ({ title, value, icon, change, unit = '' }) => {
    return (
        <div className="bg-white p-4 rounded-lg shadow-md flex items-start">
            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg mr-4 text-2xl">
                {icon}
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500">{title}</p>
                <div className="flex items-baseline">
                    <p className="text-2xl font-bold text-gray-800">{value}{unit}</p>
                    <ChangeIndicator value={change} />
                </div>
            </div>
        </div>
    );
};

const StatCardSpv = ({ title, value, icon, color }) => {
    return (
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow-md flex flex-col justify-between min-h-[100px] sm:min-h-[120px]">
            <div className="mb-2">
                <p className="text-xs sm:text-sm font-medium text-gray-500 truncate" title={title}>{title}</p>
            </div>
            <div className={`flex justify-between items-end ${color}`}>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800">{value}</p>
                <span className="text-lg sm:text-xl lg:text-2xl">{icon}</span>
            </div>
        </div>
    );
};

export { StatCard as default, StatCardSpv };
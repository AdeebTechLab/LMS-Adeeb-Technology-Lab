import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    PointElement,
    LineElement,
    Filler,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    PointElement,
    LineElement,
    Filler
);

// Bar Chart Component
export const BarChart = ({
    data,
    options = {},
    height = 300,
}) => {
    const defaultOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                backgroundColor: '#1E293B',
                titleFont: { size: 13 },
                bodyFont: { size: 12 },
                padding: 12,
                cornerRadius: 8,
            },
        },
        scales: {
            x: {
                grid: {
                    display: false,
                },
                ticks: {
                    color: '#64748B',
                    font: { size: 11 },
                },
            },
            y: {
                grid: {
                    color: '#F1F5F9',
                },
                ticks: {
                    color: '#64748B',
                    font: { size: 11 },
                },
            },
        },
    };

    return (
        <div style={{ height }}>
            <Bar data={data} options={{ ...defaultOptions, ...options }} />
        </div>
    );
};

// Doughnut Chart Component
export const DoughnutChart = ({
    data,
    options = {},
    height = 250,
}) => {
    const defaultOptions = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    padding: 20,
                    usePointStyle: true,
                    pointStyle: 'circle',
                    font: { size: 12 },
                    color: '#64748B',
                },
            },
            tooltip: {
                backgroundColor: '#1E293B',
                titleFont: { size: 13 },
                bodyFont: { size: 12 },
                padding: 12,
                cornerRadius: 8,
            },
        },
    };

    return (
        <div style={{ height }}>
            <Doughnut data={data} options={{ ...defaultOptions, ...options }} />
        </div>
    );
};

// Line Chart Component
export const LineChart = ({
    data,
    options = {},
    height = 300,
}) => {
    const defaultOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'top',
                align: 'end',
                labels: {
                    usePointStyle: true,
                    pointStyle: 'circle',
                    padding: 20,
                    font: { size: 12 },
                    color: '#64748B',
                },
            },
            tooltip: {
                backgroundColor: '#1E293B',
                titleFont: { size: 13 },
                bodyFont: { size: 12 },
                padding: 12,
                cornerRadius: 8,
            },
        },
        scales: {
            x: {
                grid: {
                    display: false,
                },
                ticks: {
                    color: '#64748B',
                    font: { size: 11 },
                },
            },
            y: {
                grid: {
                    color: '#F1F5F9',
                },
                ticks: {
                    color: '#64748B',
                    font: { size: 11 },
                },
            },
        },
        elements: {
            line: {
                tension: 0.4,
            },
            point: {
                radius: 4,
                hoverRadius: 6,
            },
        },
    };

    return (
        <div style={{ height }}>
            <Line data={data} options={{ ...defaultOptions, ...options }} />
        </div>
    );
};

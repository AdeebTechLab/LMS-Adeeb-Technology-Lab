import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sun, Loader2, Check, Calendar } from 'lucide-react';
import { attendanceAPI } from '../../../services/api';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SHORT_DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const HolidaySettings = () => {
    const [holidayDays, setHolidayDays] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    useEffect(() => {
        fetchHolidays();
    }, []);

    const fetchHolidays = async () => {
        try {
            const response = await attendanceAPI.getGlobalHolidays();
            setHolidayDays(response.data.holidayDays || []);
        } catch (err) {
            console.error('Error fetching holidays:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleDay = async (dayIndex) => {
        setIsSaving(true);
        setSaveSuccess(false);

        const newHolidayDays = holidayDays.includes(dayIndex)
            ? holidayDays.filter(d => d !== dayIndex)
            : [...holidayDays, dayIndex];

        try {
            await attendanceAPI.updateGlobalHolidays(newHolidayDays);
            setHolidayDays(newHolidayDays);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2000);
        } catch (err) {
            console.error('Error saving holidays:', err);
            alert('Failed to update holiday settings');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
        >
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900">Weekly Off Days</h3>
                        <p className="text-xs text-gray-500">Set days when attendance won't be marked (applies to all courses)</p>
                    </div>
                </div>
                {saveSuccess && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-1 text-emerald-600 text-sm font-medium"
                    >
                        <Check className="w-4 h-4" />
                        Saved
                    </motion.div>
                )}
            </div>

            <div className="grid grid-cols-7 gap-2">
                {SHORT_DAY_NAMES.map((day, index) => (
                    <button
                        key={day}
                        onClick={() => toggleDay(index)}
                        disabled={isSaving}
                        className={`relative p-3 rounded-xl font-bold text-center transition-all ${holidayDays.includes(index)
                                ? 'bg-yellow-400 text-yellow-900 shadow-md ring-2 ring-yellow-500/30'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            } ${isSaving ? 'opacity-50 cursor-not-allowed' : 'active:scale-95 cursor-pointer'}`}
                    >
                        <span className="text-sm">{day}</span>
                        {holidayDays.includes(index) && (
                            <Sun className="w-3 h-3 absolute top-1 right-1 text-yellow-700" />
                        )}
                    </button>
                ))}
            </div>

            <div className="mt-4 bg-yellow-50 rounded-xl p-3 border border-yellow-200">
                <div className="flex items-start gap-2">
                    <Sun className="w-4 h-4 text-yellow-600 mt-0.5" />
                    <div className="text-xs text-yellow-800">
                        <p className="font-bold mb-1">How it works:</p>
                        <ul className="space-y-0.5 text-yellow-700">
                            <li>• Selected days are marked as off days for all courses</li>
                            <li>• Attendance cannot be marked on these days</li>
                            <li>• Off days don't count toward total attendance</li>
                            <li>• Auto-save at 12AM skips these days</li>
                        </ul>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default HolidaySettings;

import { motion } from 'framer-motion';

const StatCard = ({
    title,
    value,
    change,
    changeType = 'positive',
    icon: Icon,
    iconBg = 'bg-emerald-100',
    iconColor = 'text-emerald-600',
    className = '',
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4 }}
            className={`bg-white rounded-2xl p-6 shadow-sm border border-gray-100 transition-all duration-300 hover:shadow-lg ${className}`}
        >
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
                    <p className="text-3xl font-bold text-gray-900">{value}</p>
                    {change && (
                        <div className="flex items-center mt-2">
                            <span
                                className={`text-sm font-medium ${changeType === 'positive' ? 'text-emerald-600' : 'text-red-500'
                                    }`}
                            >
                                {changeType === 'positive' ? '+' : ''}{change}
                            </span>
                            <span className="text-xs text-gray-400 ml-1">vs last month</span>
                        </div>
                    )}
                </div>
                {Icon && (
                    <div className={`p-3 rounded-xl ${iconBg}`}>
                        <Icon className={`w-6 h-6 ${iconColor}`} />
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default StatCard;

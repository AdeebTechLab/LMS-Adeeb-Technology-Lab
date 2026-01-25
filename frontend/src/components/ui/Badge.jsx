const Badge = ({
    children,
    variant = 'default',
    size = 'md',
    className = '',
}) => {
    const variants = {
        default: 'bg-gray-100 text-gray-700',
        success: 'bg-emerald-100 text-emerald-700',
        warning: 'bg-amber-100 text-amber-700',
        error: 'bg-red-100 text-red-700',
        info: 'bg-blue-100 text-blue-700',
        primary: 'bg-[#0D2818]/10 text-[#0D2818]',
    };

    const sizes = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-1 text-xs',
        lg: 'px-3 py-1.5 text-sm',
    };

    return (
        <span
            className={`inline-flex items-center font-medium rounded-full ${variants[variant]} ${sizes[size]} ${className}`}
        >
            {children}
        </span>
    );
};

export default Badge;

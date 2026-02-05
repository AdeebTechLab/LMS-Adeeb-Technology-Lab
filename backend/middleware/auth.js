const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                console.log(`❌ Auth failed: User not found for token`);
                return res.status(401).json({ success: false, message: 'User not found' });
            }

            console.log(`🔐 Auth OK: ${req.user.name} (${req.user.role}) - ${req.method} ${req.originalUrl}`);
            next();
        } catch (error) {
            console.log(`❌ Auth failed: Token verification error - ${error.message}`);
            return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        console.log(`❌ Auth failed: No token provided for ${req.method} ${req.originalUrl}`);
        return res.status(401).json({ success: false, message: 'Not authorized, no token' });
    }
};

// Role-based access control
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            console.log(`🚫 Authorization denied - User role: '${req.user.role}', Required roles: [${roles.join(', ')}]`);
            return res.status(403).json({
                success: false,
                message: `Role '${req.user.role}' is not authorized to access this resource`
            });
        }
        next();
    };
};

module.exports = { protect, authorize };

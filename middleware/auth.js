const jwt = require('jsonwebtoken');
require('dotenv').config();
const { GetQuery } = require('../db/database');
const secretKey = process.env.JWT_SECRET;

const requireAuth = (req, res, next) => {
    const token = req.cookies?.jwt_token;
    if (!token) {
        GetQuery('INSERT INTO logs (log, status, ip) VALUES (?, ?, ?)', ["Unauthorized: No token provided", 401, req.ip]);
        return res.status(401).json({ message: "Unauthorized: No token provided" });
    }
    try {
        req.user = jwt.verify(token, secretKey);
        next();
    } catch (err) {
        GetQuery('INSERT INTO logs (log, status, ip) VALUES (?, ?, ?)', ["Unauthorized: Invalid token", 401, req.ip]);
        return res.status(401).json({ message: "Unauthorized: Invalid token" });
    }
};

const requireRole = (role) => {
    return (req, res, next) => {
        if (!req.user) {
            GetQuery('INSERT INTO logs (log, status, ip) VALUES (?, ?, ?)', ["Unauthorized: No user information", 401, req.ip]);
            return res.status(401).json({ message: "Unauthorized: No user information" });
        }

        if (req.user.role !== role) {
            GetQuery('INSERT INTO logs (log, status, ip) VALUES (?, ?, ?)', ["User doesn't have an Admin permission to do something", 403, req.ip]);
            return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
        }
        next();
    };
};

module.exports = { requireAuth, requireRole, secretKey };
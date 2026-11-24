const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
const { connectToDatabase } = require('../database/connection');

const ADMIN_PAGES = new Set([
    '/home', '/categories', '/categories_add', '/menu_dishes', '/menu_dishes_add',
    '/orders', '/imguploader', '/imguploader_add', '/reports', '/settings',
    '/messages', '/users', '/qr_code', '/table_qr',
]);

function safeAdminReturnTo(value) {
    if (typeof value !== 'string' || value.length > 2048) return '/Home';
    try {
        const url = new URL(value, 'http://admin.local');
        if (!value.startsWith('/') || url.origin !== 'http://admin.local' || !ADMIN_PAGES.has(url.pathname.toLowerCase())) return '/Home';
        return url.pathname + url.search;
    } catch { return '/Home'; }
}

function buildAdminSessionUser(user) {
    return { _id: String(user._id), Restaurant_name: user.Restaurant_name, username: user.username, email: user.email };
}

function createAdminSession(secret, store) {
    function middlewareFor(sessionStore) {
        sessionStore.on('error', error => console.error('Session storage error:', error.message));
        return session({
        secret,
        store: sessionStore,
        resave: false,
        saveUninitialized: false,
        rolling: true,
        cookie: { httpOnly: true, sameSite: 'lax', secure: 'auto', maxAge: 7 * 24 * 60 * 60 * 1000 },
        });
    }
    if (store || process.env.NODE_ENV === 'test') return middlewareFor(store || new session.MemoryStore());
    let middleware;
    return async (req, res, next) => {
        try {
            // Wait for a successful connection before creating the shared store.
            // A temporary database outage can then recover on a later request.
            await connectToDatabase();
            if (!middleware) middleware = middlewareFor(MongoStore.create({
                client: mongoose.connection.getClient(),
                dbName: mongoose.connection.name,
                collectionName: 'sessions',
                ttl: 7 * 24 * 60 * 60,
                touchAfter: 60 * 60,
            }));
            middleware(req, res, next);
        } catch (error) { next(error); }
    };
}

function requireAdminPage(req, res, next) {
    if (req.method === 'GET' && ADMIN_PAGES.has(req.path.toLowerCase()) && !req.session?.user) {
        return res.redirect(`/login?returnTo=${encodeURIComponent(safeAdminReturnTo(req.originalUrl))}`);
    }
    next();
}

module.exports = { createAdminSession, requireAdminPage, safeAdminReturnTo, buildAdminSessionUser };

process.env.NODE_ENV = 'test';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const MongoStore = require('connect-mongo');
const connectionPath = require.resolve('../server/database/connection');
require.cache[connectionPath] = { id: connectionPath, filename: connectionPath, loaded: true, exports: { connectToDatabase: async () => {} } };
const { createAdminSession, requireAdminPage, safeAdminReturnTo } = require('../server/utils/adminSession');

test('login destinations stay inside the admin application', () => {
    assert.equal(safeAdminReturnTo('/Menu_Dishes_add?id=abc'), '/Menu_Dishes_add?id=abc');
    for (const value of ['https://example.com', '//example.com/Home', '/\\example.com/Home', '/login', '/UserMenu', null]) assert.equal(safeAdminReturnTo(value), '/Home');
});

test('the session cookie survives a second application instance using a new MongoStore, then signout revokes it', async () => {
    // Real connect-mongo serialization and independent store instances; isolated database adapter.
    const persisted = new Map();
    const collection = {
        async findOne(query) {
            const row = persisted.get(query._id);
            return row && (!row.expires || row.expires > new Date()) ? structuredClone(row) : null;
        },
        async updateOne(query, update) {
            const existed = persisted.has(query._id);
            persisted.set(query._id, { ...persisted.get(query._id), ...structuredClone(update.$set) });
            return { upsertedCount: existed ? 0 : 1, matchedCount: existed ? 1 : 0 };
        },
        async deleteOne(query) { return { deletedCount: Number(persisted.delete(query._id)) }; },
    };
    const client = { db: () => ({ collection: () => collection }) };
    const stores = [];
    const servers = [];
    const start = async () => {
        const app = express();
        app.set('trust proxy', 1);
        const store = MongoStore.create({ client, autoRemove: 'disabled' });
        stores.push(store);
        app.use(createAdminSession('test-only-secret-shared-between-instances', store));
        app.use(requireAdminPage);
        app.post('/test-login', (req, res) => {
            req.session.user = { _id: 'test-admin' };
            req.session.save(error => error ? res.sendStatus(500) : res.sendStatus(204));
        });
        app.get('/Menu_Dishes_add', (req, res) => res.json({ user: req.session.user._id }));
        app.post('/test-signout', (req, res) => req.session.destroy(() => res.sendStatus(204)));
        const server = await new Promise(resolve => { const value = app.listen(0, '127.0.0.1', () => resolve(value)); });
        servers.push(server);
        return `http://127.0.0.1:${server.address().port}`;
    };
    try {
        const first = await start();
        const anonymous = await fetch(`${first}/Menu_Dishes_add?id=123`, { redirect: 'manual' });
        assert.equal(anonymous.status, 302);
        assert.equal(anonymous.headers.get('location'), '/login?returnTo=%2FMenu_Dishes_add%3Fid%3D123');
        const login = await fetch(`${first}/test-login`, { method: 'POST' });
        const setCookie = login.headers.get('set-cookie');
        assert.ok(setCookie.includes('HttpOnly'));
        assert.ok(setCookie.includes('SameSite=Lax'));
        assert.ok(setCookie.includes('Expires='));
        const cookie = setCookie.split(';')[0];
        await new Promise(resolve => servers[0].close(resolve));
        const second = await start();
        assert.notEqual(stores[0], stores[1]);
        const restored = await fetch(`${second}/Menu_Dishes_add?id=123`, { headers: { Cookie: cookie } });
        assert.equal(restored.status, 200);
        assert.deepEqual(await restored.json(), { user: 'test-admin' });
        const https = await fetch(`${second}/test-login`, { method: 'POST', headers: { 'X-Forwarded-Proto': 'https' } });
        assert.ok(https.headers.get('set-cookie').includes('Secure'));
        await fetch(`${second}/test-signout`, { method: 'POST', headers: { Cookie: cookie } });
        assert.equal((await fetch(`${second}/Menu_Dishes_add`, { headers: { Cookie: cookie }, redirect: 'manual' })).status, 302);
    } finally {
        await Promise.all(servers.filter(server => server.listening).map(server => new Promise(resolve => server.close(resolve))));
    }
});

process.env.NODE_ENV = 'test';
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { sortMenuCategories } = require('../server/utils/categoryOrder');
const connectionPath = require.resolve('../server/database/connection');
require.cache[connectionPath] = { id: connectionPath, filename: connectionPath, loaded: true, exports: { connectToDatabase: async () => {} } };
const Category = require('../server/models/category');
const MenuItem = require('../server/models/MenuItems');
const TableConfig = require('../server/models/tableConfig');
const Settings = require('../server/models/settings');
const DailyOffer = require('../server/models/dailyOffer');
const User = require('../server/models/registerUsers');
let categories = Array.from({ length: 6 }, (_, index) => ({ _id: String(index + 1).padStart(24, '0'), title: `Sélection ${index + 1}`, description: 'Une catégorie du menu' }));
let failWrite = false;
Category.find = () => ({ session() { return this; }, lean: async () => categories.map(category => ({ ...category })) });
Category.bulkWrite = async operations => {
    for (const operation of operations) {
        const category = categories.find(value => value._id === operation.updateOne.filter._id);
        category.menuOrder = operation.updateOne.update.$set.menuOrder;
        if (failWrite) throw new Error('Simulated write failure');
    }
};
mongoose.connection.transaction = async callback => {
    const snapshot = structuredClone(categories);
    try { return await callback({}); }
    catch (error) { categories = snapshot; throw error; }
};
MenuItem.find = () => ({ lean: async () => [] });
TableConfig.find = () => ({ sort: () => ({ lean: async () => [] }) });
Settings.findOne = () => ({ lean: async () => ({ restaurantName: 'Le Patio', currency: 'TND' }) });
DailyOffer.findOne = () => ({ lean: async () => null });
User.countDocuments = async () => 1;
User.findOne = async () => ({ _id: 'test-admin', email: 'test@example.com', password: 'test-only' });
const app = require('../server/Server');
const listening = new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
after(async () => { await new Promise(resolve => app.server.close(resolve)); });

test('legacy category order is preserved, saved positions take priority and new categories appear last', () => {
    const legacy = [{ _id: 'b' }, { _id: 'a', menuOrder: null }];
    assert.deepEqual(sortMenuCategories(legacy), legacy);
    assert.deepEqual(sortMenuCategories([{ _id: 'new' }, { _id: 'last', menuOrder: 2 }, { _id: 'first', menuOrder: 0 }]).map(value => value._id), ['first', 'last', 'new']);
});

test('only complete authenticated category orders persist atomically and control the public menu layout', async () => {
    await listening;
    const base = `http://127.0.0.1:${app.server.address().port}`;
    const original = categories.map(value => value._id);
    const desired = [...original].reverse();
    const put = (categoryIds, cookie) => fetch(`${base}/api/categories/order`, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify({ categoryIds }) });
    assert.equal((await put(desired)).status, 401);
    const login = await fetch(`${base}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'test@example.com', password: 'test-only' }), redirect: 'manual' });
    const cookie = login.headers.get('set-cookie').split(';')[0];
    assert.equal((await put('invalid', cookie)).status, 400);
    assert.equal((await put(['bad'], cookie)).status, 400);
    assert.equal((await put([...original, original[0]], cookie)).status, 400);
    assert.equal((await put(original.slice(1), cookie)).status, 409);
    assert.equal((await put([...original.slice(1), 'ffffffffffffffffffffffff'], cookie)).status, 409);
    assert.ok(categories.every(category => category.menuOrder === undefined));
    failWrite = true;
    assert.equal((await put(desired, cookie)).status, 500);
    assert.ok(categories.every(category => category.menuOrder === undefined));
    failWrite = false;
    const response = await put(desired, cookie);
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).categoryIds, desired);
    assert.deepEqual(sortMenuCategories(categories).map(value => value._id), desired);
    const admin = await (await fetch(`${base}/Categories`, { headers: { Cookie: cookie } })).text();
    assert.deepEqual([...admin.matchAll(/<tr data-id="([^"]+)"/g)].map(match => match[1]), desired);
    assert.ok(admin.includes('id="saveCategoryOrder"'));
    const publicMenu = await (await fetch(`${base}/UserMenu`)).text();
    const list = publicMenu.match(/<ul class="universe-list"[\s\S]*?<\/ul>/)[0];
    const links = [...list.matchAll(/data-universe-link="([^"]+)"/g)].map(match => match[1]);
    assert.deepEqual(links, [6, 5, 4, 3, 2, 1].map(number => `rubrique-selection-${number}`));
    assert.equal((list.match(/data-extra-category hidden/g) || []).length, 2);
    // A category added after this screen loaded must not be dropped by a stale save.
    categories.push({ _id: 'ffffffffffffffffffffffff', title: 'Nouvelle sélection', description: 'Nouvelle catégorie' });
    assert.equal((await put(desired, cookie)).status, 409);
    assert.equal(sortMenuCategories(categories).at(-1).title, 'Nouvelle sélection');
});

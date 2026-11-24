process.env.NODE_ENV = 'test';
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { restaurantDay, isValidDay } = require('../server/utils/dailyOffers');
const { buildCategoryCards } = require('../server/utils/menuUniverses');

// Exercise the real HTTP handlers and templates with isolated in-memory data.
// Never write test offers or users into the restaurant database.
const connectionPath = require.resolve('../server/database/connection');
require.cache[connectionPath] = { id: connectionPath, filename: connectionPath, loaded: true, exports: { connectToDatabase: async () => {} } };
const MenuItem = require('../server/models/MenuItems');
const Category = require('../server/models/category');
const TableConfig = require('../server/models/tableConfig');
const Settings = require('../server/models/settings');
const DailyOffer = require('../server/models/dailyOffer');
const User = require('../server/models/registerUsers');
const items = [
    { _id: '000000000000000000000001', title: 'Café du jour', price: 4, category: 'Café', description: 'Café fraîchement moulu.\nLait, noisettes et chocolat <maison>.', size: 'Grande tasse', isAvailable: true },
    { _id: '000000000000000000000002', title: 'Produit épuisé', price: 8, category: 'Café', isAvailable: false },
];
const offers = new Map();
MenuItem.find = () => ({ lean: async () => items.map(item => ({ ...item })) });
MenuItem.countDocuments = async query => items.filter(item => query._id.$in.includes(item._id)).length;
Category.find = () => ({ lean: async () => [{ _id: 'cafe', title: 'Café' }, { _id: 'empty', title: 'Nouvelle catégorie' }] });
TableConfig.find = () => ({ sort: () => ({ lean: async () => [] }) });
Settings.findOne = () => ({ lean: async () => ({ restaurantName: 'Le Patio', currency: 'TND' }) });
DailyOffer.findOne = ({ day }) => ({ lean: async () => offers.has(day) ? { itemIds: [...offers.get(day)] } : null });
DailyOffer.findOneAndUpdate = async ({ day }, update) => { offers.set(day, update.$set.itemIds); };
User.countDocuments = async () => 1;
User.findOne = async () => ({ _id: 'admin-test', email: 'test@example.com', password: 'test-only' });
const app = require('../server/Server');
const listening = new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
after(async () => { await new Promise(resolve => app.server.close(resolve)); });

test('restaurant day rolls over at Tunis midnight, and invalid calendar dates are rejected', () => {
    assert.equal(restaurantDay(new Date('2026-11-24T23:30:00Z')), '2026-11-25');
    assert.equal(isValidDay('2026-02-30'), false);
    assert.equal(isValidDay('2026-13-01'), false);
    assert.equal(isValidDay('2028-02-29'), true);
});

test('every category, including empty and duplicate titles, gets a unique card; extras collapse after four', () => {
    const cards = buildCategoryCards(Array.from({ length: 7 }, (_, index) => ({ title: index < 2 ? 'Café' : `Catégorie ${index}`, sectionId: `cat-${index}`, itemCount: 0, items: [] })));
    assert.equal(cards.length, 7);
    assert.equal(new Set(cards.map(card => card.slug)).size, 7);
    assert.equal(cards.filter(card => card.isExtra).length, 3);
});

test('admin selection persists through API readback and renders available products only on the chosen day', async () => {
    await listening;
    const base = `http://127.0.0.1:${app.server.address().port}`;
    const day = restaurantDay();
    const put = (body, cookie) => fetch(`${base}/api/daily-offers`, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(body) });
    assert.equal((await put({ day, itemIds: [] })).status, 401);
    const login = await fetch(`${base}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'test@example.com', password: 'test-only' }), redirect: 'manual' });
    assert.equal(login.status, 302);
    const cookie = login.headers.get('set-cookie').split(';')[0];
    assert.equal((await put({ day: '2026-02-30', itemIds: [] }, cookie)).status, 400);
    assert.equal((await put({ day, itemIds: ['bad'] }, cookie)).status, 400);
    assert.equal((await put({ day, itemIds: ['ffffffffffffffffffffffff'] }, cookie)).status, 400);
    const ids = items.map(item => item._id);
    assert.equal((await put({ day, itemIds: [...ids, ids[0]] }, cookie)).status, 200);
    const read = await fetch(`${base}/api/daily-offers?day=${day}`, { headers: { Cookie: cookie } });
    assert.deepEqual((await read.json()).itemIds, ids);
    const html = await (await fetch(`${base}/UserMenu`)).text();
    const offerSection = html.match(/<section class="daily-offers"[\s\S]*?<\/section>/)?.[0];
    assert.ok(offerSection);
    assert.ok(offerSection.includes('Café du jour'));
    assert.ok(!offerSection.includes('Produit épuisé'));
    assert.ok(offerSection.includes('data-price="4.00"'));
    assert.ok(html.includes('rubrique-nouvelle-categorie'));
    const deepLink = await fetch(`${base}/UserMenu/categorie/rubrique-cafe`);
    assert.equal(deepLink.status, 200);
    assert.ok((await deepLink.text()).includes('data-initial-view="rubrique-cafe"'));
    assert.equal((await put({ day, itemIds: [] }, cookie)).status, 200);
    assert.ok(!(await (await fetch(`${base}/UserMenu`)).text()).includes('<section class="daily-offers"'));
    await put({ day: '2099-01-01', itemIds: ids }, cookie);
    assert.ok(!(await (await fetch(`${base}/UserMenu`)).text()).includes('<section class="daily-offers"'));
});

test('product links open a full detail page with description, price, size, cart data and table-aware category return', async () => {
    await listening;
    const base = `http://127.0.0.1:${app.server.address().port}`;
    const id = items[0]._id;
    const category = (await (await fetch(`${base}/UserMenu/categorie/rubrique-cafe?table=5`)).text()).replace(/&#x3D;/g, '=');
    assert.ok(category.includes(`class="product-detail-link" href="/UserMenu/article/${id}?table=5"`));
    const response = await fetch(`${base}/UserMenu/article/${id}?table=5`);
    assert.equal(response.status, 200);
    const html = (await response.text()).replace(/&#x3D;/g, '=');
    assert.ok(html.includes('data-initial-view="article"'));
    assert.ok(html.includes('id="productTitle">Café du jour</h1>'));
    assert.ok(html.includes('Lait, noisettes et chocolat &lt;maison&gt;.'));
    assert.ok(html.includes('Grande tasse'));
    assert.ok(html.includes('class="product-back" href="/UserMenu/categorie/rubrique-cafe?table=5"'));
    assert.ok(html.includes('data-price="4.00"'));
    assert.ok(html.includes(`src="/menu-image/${id}"`));
    const unavailable = await (await fetch(`${base}/UserMenu/article/${items[1]._id}`)).text();
    assert.ok(unavailable.includes('class="add-to-cart-btn product-detail-add" disabled'));
    assert.equal((await fetch(`${base}/UserMenu/article/not-an-id`)).status, 404);
    assert.equal((await fetch(`${base}/UserMenu/article/ffffffffffffffffffffffff`)).status, 404);
});

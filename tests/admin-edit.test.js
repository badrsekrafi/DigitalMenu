const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const connectionPath = require.resolve('../server/database/connection');
require.cache[connectionPath] = { id: connectionPath, filename: connectionPath, loaded: true, exports: { connectToDatabase: async () => {} } };
const Category = require('../server/models/category');
const MenuItem = require('../server/models/MenuItems');
const User = require('../server/models/registerUsers');
const categoryId = '000000000000000000000011';
const otherId = '000000000000000000000012';
const itemId = '000000000000000000000021';
const categories = new Map([
    [categoryId, { _id: categoryId, title: 'Burger', description: 'Nos burgers' }],
    [otherId, { _id: otherId, title: 'Desserts', description: 'Nos desserts' }],
]);
const products = new Map([[itemId, { _id: itemId, title: 'Chicken burger', description: 'Poulet, tomate', price: 10.5, size: 'Normal', category: 'Burger', isAvailable: true, image: { data: Buffer.from('original-photo'), contentType: 'image/jpeg' } }]]);
function doc(map, id) {
    const value = map.get(String(id));
    return value ? { ...value, save: async function () { const { save, ...data } = this; map.set(String(id), data); } } : null;
}
function query(value) {
    return { lean: async () => value, session: async () => value, then: (yes, no) => Promise.resolve(value).then(yes, no) };
}
Category.find = () => query([...categories.values()]);
Category.findById = id => query(doc(categories, id));
Category.findOne = filter => query([...categories.values()].find(value => value.title === filter.title && value._id !== filter._id.$ne) || null);
MenuItem.findById = (id, projection) => {
    const item = doc(products, id);
    if (item && projection?.image === 0) delete item.image;
    return query(item);
};
let failRename = false;
MenuItem.updateMany = async (filter, update) => {
    if (failRename) throw new Error('Simulated database failure');
    for (const item of products.values()) if (item.category === filter.category) item.category = update.$set.category;
};
mongoose.connection.transaction = async callback => {
    const before = structuredClone([...categories]);
    try { return await callback({}); }
    catch (error) { categories.clear(); before.forEach(([id, value]) => categories.set(id, value)); throw error; }
};
User.countDocuments = async () => 1;
User.findOne = async () => ({ _id: 'admin-test', email: 'test@example.com', password: 'test-only' });
const app = require('../server/Server');
const listening = new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
after(async () => { await new Promise(resolve => app.server.close(resolve)); });

test('edit forms preload existing values and update in place, retaining images and category associations', async () => {
    await listening;
    const base = `http://127.0.0.1:${app.server.address().port}`;
    const productPage = await (await fetch(`${base}/Menu_Dishes_add?id=${itemId}`)).text();
    assert.ok(productPage.includes('<h1>Modifier l’article</h1>'));
    assert.ok(productPage.includes('value="Chicken burger"'));
    assert.ok(productPage.includes(`value="${categoryId}" selected`));
    assert.ok(productPage.includes('Laissez ce champ vide pour la conserver.'));
    assert.ok(!productPage.includes('onclick="addNewItem()"'));
    const categoryPage = await (await fetch(`${base}/Categories_add?id=${categoryId}`)).text();
    assert.ok(categoryPage.includes('<h1>Modifier la catégorie</h1>'));
    assert.ok(categoryPage.includes('value="Burger"'));
    assert.ok((await (await fetch(`${base}/Menu_Dishes_add`)).text()).includes('<h1>Nouvel article</h1>'));
    assert.equal((await fetch(`${base}/Menu_Dishes_add?id=invalid`)).status, 404);
    assert.equal((await fetch(`${base}/Categories_add?id=ffffffffffffffffffffffff`)).status, 404);
    assert.equal((await fetch(`${base}/api/menu-items/${itemId}`, { method: 'PUT' })).status, 401);
    const login = await fetch(`${base}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'test@example.com', password: 'test-only' }), redirect: 'manual' });
    const cookie = login.headers.get('set-cookie').split(';')[0];
    const editProduct = (price, image, available) => {
        const form = new FormData();
        Object.entries({ title: 'Chicken burger maison', description: 'Poulet, tomate, fromage', price, size: 'Grand', category: categoryId }).forEach(([key, value]) => form.append(key, value));
        if (image) form.append('image', image, 'new-photo.png');
        if (available !== undefined) form.append('isAvailable', String(available));
        return fetch(`${base}/api/menu-items/${itemId}`, { method: 'PUT', headers: { Cookie: cookie }, body: form });
    };
    assert.equal((await editProduct('-1')).status, 400);
    assert.equal((await editProduct('12.75')).status, 200);
    assert.equal(products.size, 1);
    assert.equal(products.get(itemId).price, 12.75);
    assert.equal(products.get(itemId).image.data.toString(), 'original-photo');
    assert.equal(products.get(itemId).isAvailable, true);
    assert.equal((await editProduct('12.75', undefined, false)).status, 200);
    assert.equal(products.get(itemId).isAvailable, false);
    const unavailablePage = await (await fetch(`${base}/Menu_Dishes_add?id=${itemId}`)).text();
    assert.ok(unavailablePage.includes('id="dishAvailabilityLabel">Épuisé</span>'));
    assert.ok(!unavailablePage.match(/id="dishAvailability"[^>]*checked/));
    assert.equal((await editProduct('12.75', undefined, true)).status, 200);
    assert.equal(products.get(itemId).isAvailable, true);
    assert.equal((await editProduct('12.75', undefined, 'invalid')).status, 400);
    assert.equal((await editProduct('12.75', new Blob(['new-photo'], { type: 'image/png' }))).status, 200);
    assert.equal(products.get(itemId).image.data.toString(), 'new-photo');
    assert.ok(products.get(itemId).imageUpdatedAt instanceof Date);
    const editCategory = title => fetch(`${base}/api/categories/${categoryId}`, { method: 'PUT', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ title, description: 'Description modifiée' }) });
    assert.equal((await editCategory('Desserts')).status, 409);
    failRename = true;
    assert.equal((await editCategory('Burgers maison')).status, 500);
    assert.equal(categories.get(categoryId).title, 'Burger');
    failRename = false;
    assert.equal((await editCategory('Burgers maison')).status, 200);
    assert.equal(categories.size, 2);
    assert.equal(products.get(itemId).category, 'Burgers maison');
    const readback = await (await fetch(`${base}/Menu_Dishes_add?id=${itemId}`)).text();
    assert.ok(readback.includes('value="12.75"'));
    assert.ok(readback.includes('Poulet, tomate, fromage'));
    assert.ok(readback.includes(`value="${categoryId}" selected`));
});

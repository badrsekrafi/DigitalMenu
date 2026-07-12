
const express = require("express");
const session = require('express-session');
const path = require("path");
const crypto = require('crypto');
const app = express();
const http = require('http');
const socketIO = require('socket.io');
const server = http.createServer(app);
const io = socketIO(server);
const hbs = require("hbs");
const multer = require('multer');
const Handlebars = require('handlebars');
require("./database/connection");

const secretKey = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
if (!process.env.SESSION_SECRET) {
    console.warn("SESSION_SECRET is not set; using an ephemeral session secret.");
}

const user = require("./models/registerUsers");
const Category = require("./models/category");
const MyCategory = require('./models/categoryCount');
const MenuItem = require('./models/MenuItems');
const Image = require('./models/ImgUploader');
const UserNew = require('./models/UserMenu_SignUp');
const Order = require('./models/order');
const TableConfig = require('./models/tableConfig');

const PORT = process.env.PORT || 5000;
const MENU_AUTH_COOKIE = 'kaffa_menu_user';
const MENU_AUTH_COOKIE_MAX_AGE = 1000 * 60 * 60 * 24 * 30;

const static_path = path.join(__dirname, "../server/public");
const templates_path = path.join(__dirname, "../server/templates/views");
const partials_path = path.join(__dirname, "../server/templates/partials");

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(express.static(static_path));
app.use("/vendor/qrious", express.static(path.join(__dirname, "../node_modules/qrious/dist")));
app.set("view engine", "hbs");
app.set("views", templates_path);
hbs.registerPartials(partials_path);

// Use the 'express-session' middleware
app.use(session({
    secret: secretKey, 
    resave: false,
    saveUninitialized: true,
}));

Handlebars.registerHelper('formatCurrency', function (value) {
    return value.toFixed(2);
});

function getServiceTypeLabel(serviceType) {
    return serviceType === 'reservation' ? 'Reservation' : 'Sur place';
}

function formatReservationLabel(order) {
    if (order.serviceType !== 'reservation') {
        return '';
    }

    if (order.reservationDate && order.reservationTime) {
        return `${order.reservationDate} ${order.reservationTime}`;
    }

    if (order.reservationAt) {
        return new Date(order.reservationAt).toLocaleString('fr-FR', {
            dateStyle: 'short',
            timeStyle: 'short',
        });
    }

    return '';
}

function getDefaultFloorTables() {
    return [
        { number: 1, zone: 'Terrace', seats: 4, shape: 'round' },
        { number: 2, zone: 'Terrace', seats: 4, shape: 'round' },
        { number: 3, zone: 'Terrace', seats: 4, shape: 'round' },
        { number: 4, zone: 'Terrace', seats: 4, shape: 'round' },
        { number: 5, zone: 'Terrace', seats: 2, shape: 'round' },
        { number: 6, zone: 'Terrace', seats: 2, shape: 'round' },
        { number: 7, zone: 'Main room', seats: 4, shape: 'square' },
        { number: 8, zone: 'Main room', seats: 4, shape: 'square' },
        { number: 9, zone: 'Main room', seats: 4, shape: 'square' },
        { number: 10, zone: 'Main room', seats: 4, shape: 'square' },
        { number: 11, zone: 'Main room', seats: 6, shape: 'square' },
        { number: 12, zone: 'Main room', seats: 6, shape: 'square' },
        { number: 13, zone: 'Window side', seats: 2, shape: 'round' },
        { number: 14, zone: 'Window side', seats: 2, shape: 'round' },
        { number: 15, zone: 'Window side', seats: 4, shape: 'round' },
        { number: 16, zone: 'Window side', seats: 4, shape: 'round' },
        { number: 17, zone: 'Family corner', seats: 6, shape: 'square' },
        { number: 18, zone: 'Family corner', seats: 6, shape: 'square' },
        { number: 19, zone: 'Family corner', seats: 4, shape: 'square' },
        { number: 20, zone: 'Family corner', seats: 4, shape: 'square' },
    ];
}

function normalizeTableConfig(table) {
    const number = Number(table.number);
    const seats = Number(table.seats);
    const shape = table.shape === 'round' ? 'round' : 'square';
    const zone = String(table.zone || 'Main room').trim() || 'Main room';

    return {
        number,
        zone,
        seats: Number.isInteger(seats) && seats > 0 ? seats : 4,
        shape,
    };
}

async function getConfiguredFloorTables() {
    const configuredTables = await TableConfig.find().sort({ number: 1 }).lean();

    if (configuredTables.length === 0) {
        return getDefaultFloorTables();
    }

    return configuredTables.map(normalizeTableConfig);
}

async function seedDefaultTableConfig() {
    const defaultTables = getDefaultFloorTables();
    await TableConfig.deleteMany({});
    await TableConfig.insertMany(defaultTables);
    return defaultTables;
}

async function ensureTableConfigSeeded() {
    const count = await TableConfig.countDocuments();

    if (count === 0) {
        await TableConfig.insertMany(getDefaultFloorTables());
    }
}

function parsePositiveInteger(value) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function buildTableConfigPayload(body, requireNumber) {
    const number = parsePositiveInteger(body.number);
    const seats = parsePositiveInteger(body.seats);
    const zone = String(body.zone || '').trim();
    const shape = body.shape === 'round' ? 'round' : body.shape === 'square' ? 'square' : '';

    if ((requireNumber || body.number !== undefined) && !number) {
        return { error: 'Please enter a valid table number.' };
    }

    if (!seats) {
        return { error: 'Please enter a valid seats number.' };
    }

    if (!zone) {
        return { error: 'Please enter a table zone.' };
    }

    if (!shape) {
        return { error: 'Please choose a valid table shape.' };
    }

    return {
        payload: {
            number,
            seats,
            zone,
            shape,
        },
    };
}

function buildGeneratedTableConfig(number, existingTablesByNumber, defaultTablesByNumber, defaultSeats) {
    const existingTable = existingTablesByNumber.get(number);

    if (existingTable) {
        return normalizeTableConfig(existingTable);
    }

    const defaultTable = defaultTablesByNumber.get(number);

    if (defaultTable) {
        return { ...defaultTable };
    }

    return {
        number,
        zone: 'Main room',
        seats: defaultSeats,
        shape: 'square',
    };
}

// ============ Admin Login Page ================
app.get("/health", (req, res) => {
    res.status(200).send("ok");
});

app.get("/", (req, res) => {
    res.render("login");
});

app.get("/login", (req, res) => {
    res.render("login");
})
app.post("/login", async (req, res) => {
    try {
        // const check = await user.findOne({ email: req.body.email })
        // if (check.password === req.body.password) {
        //     res.status(201).render("Home");
        // } else {
        //     res.send("Invalid login Details");
        // }
        const {email,password} = req.body;
        const userModel = await user.findOne({email});
        if (!userModel || userModel.password !== password) {
            return res.send("Invalid login details");
        }
        // Store user's session upon successful login
        req.session.user = userModel;
        // Pass user data to the Home template
        res.render("Home");
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal server error");
    }
})

// ============== Admin Registration Page ===============
app.get("/index", (req, res) => {
    res.render("index");
})

app.post("/index", async (req, res) => {

    const data = {
        Restaurant_name: req.body.name,
        email: req.body.email,
        password: req.body.password
    }
    await user.insertMany([data])
    res.render("login")

    // try {
    //     const { name, email, password } = req.body;
    //     const newUser = new user({ Restaurant_name: name, email, password });
    //     await newUser.save();
    //     res.render("login");
    // } catch (error) {
    //     console.error(error);
    //     res.status(500).send("Internal Server Error");
    // }

});

// =========== Home Page =============
app.get("/Home", async (req, res) => {
    try {
        const categories = await Category.find();
        const categoryCount = await MyCategory.countDocuments(); // Update this line
        const orders = await Order.find();

        res.render("Home", { categories, categoryCount, orders });
    } catch (error) {
        res.status(500).send("Error in Fetching");
    }
})


app.get('/getCategoryCount', async (req, res) => {
    try {
        const categoryCount = await Category.countDocuments();
        res.json({ categoryCount });
    } catch (error) {
        console.error('Error fetching category count:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/getMenuItemCount', async (req, res) => {
    try {
        const menuItemCount = await MenuItem.countDocuments();
        res.json({ menuItemCount });
    } catch (error) {
        console.error('Error fetching menu item count:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/getorderCount', async (req, res) => {
    try {
        const orderCount = await Order.countDocuments();
        res.json({ OrderCount: orderCount });
    } catch (error) {
        console.error('Error fetching order count:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


// ==============  Categories Page =================
app.get("/categories", async (req, res) => {
    try {
        const categories = await Category.find();
        const categoryCount = categories.length; // Get the count of categories
        res.render("Categories", { categories, categoryCount });
    } catch (error) {
        res.status(500).send("Error Fetching Categories.");
    }
})

app.delete('/deleteCategory/:id', async (req, res) => {
    const categoryId = req.params.id;
    try {
        await Category.findByIdAndDelete(categoryId);
        const categories = await Category.find();  // Retrieve the updated category list
        res.json({ success: true, categories });   // Send back the updated categories
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: 'Error deleting category.' });
    }
});

app.get("/Categories_add", (req, res) => {
    res.render("Categories_add");
})

app.post("/Categories_add", async (req, res) => {
    const { title, description } = req.body;

    try {
        const category = new Category({ title, description });
        await category.save();
        console.log('Category added:', category);
        res.send('Category added Successfully.');
    } catch (error) {
        console.log('Error:', error);
        res.status(500).send('Error adding category.');
    }
});

// ================ Menu_Dishes Page ==================
app.get("/Menu_Dishes", async (req, res) => {
    try {
        const MenuItems = await MenuItem.find({}, { image: 0 }).lean();
        MenuItems.forEach(item => {
            item.imageUrl = `/menu-image/${item._id}`;
        });
        res.render("Menu_Dishes", { MenuItems });

    } catch (error) {
        console.error('Error fetching menu items:', error);
        res.status(500).send('Error Fetching Menu Items.');
    }
})

app.get('/menu-image/:id', async (req, res) => {
    try {
        const item = await MenuItem.findById(req.params.id, { image: 1 }).lean();
        if (!item || !item.image || !item.image.data) {
            return res.status(404).send('Image not found.');
        }

        const imageData = Buffer.isBuffer(item.image.data)
            ? item.image.data
            : Buffer.from(item.image.data.buffer || item.image.data);

        res.set('Content-Type', item.image.contentType || 'application/octet-stream');
        res.set('Cache-Control', 'public, max-age=86400');
        res.send(imageData);
    } catch (error) {
        console.error('Error fetching menu image:', error);
        res.status(500).send('Error fetching menu image.');
    }
});

app.delete('/deleteMenuItem/:id', async (req, res) => {
    const itemId = req.params.id;
    try {
        const deletedItem = await MenuItem.findByIdAndDelete(itemId);
        if (deletedItem) {
            res.json({ success: true });
        } else {
            res.status(404).json({ success: false, error: 'Menu item not found.' });
        }
    } catch (error) {
        console.error('Error deleting menu item:', error);
        res.status(500).json({ success: false, error: 'Failed to delete item. Please try again later.' });
    }
});

app.get("/Menu_Dishes_add", async (req, res) => {
    try {
        // Fetch categories from your database
        const categories = await Category.find();
        res.render("Menu_Dishes_add", { categories });
    } catch (error) {
        console.log('Error:', error);
        res.status(500).send('Error rendering Menu_Dishes_add page.');
    }
})

// Define storage for uploaded files
const storage = multer.memoryStorage(); // Store as binary data in memory
// Initialize multer with the defined storage
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files are allowed.'));
        }
        cb(null, true);
    }
});

app.post("/Menu_Dishes_add", (req, res) => {
    upload.single('image')(req, res, async (uploadError) => {
        if (uploadError) {
            const message = uploadError.code === 'LIMIT_FILE_SIZE'
                ? 'Image is too large. Please choose an image under 5 MB.'
                : uploadError.message;
            return res.status(400).send(message);
        }

        const { title, description, price, size } = req.body;
        const image = req.file;
        const categoryID = req.body.category;

        if (!title || !description || !price || !categoryID) {
            return res.status(400).send('Please fill title, description, price, and category.');
        }
        if (!image) {
            return res.status(400).send('No image file provided. Please select an image to upload.');
        }

        try {
            const category = await Category.findById(categoryID);
            if (!category) {
                return res.status(400).send('Invalid Category Selected.');
            }

            const newItem = new MenuItem({
                title,
                description,
                price,
                size,
                category: category.title,
                image: {
                    data: image.buffer,
                    contentType: image.mimetype,
                },
            });
            await newItem.save();
            console.log('Item added:', {
                id: newItem._id,
                title: newItem.title,
                category: newItem.category,
                imageBytes: image.size,
                contentType: image.mimetype,
            });
            res.send('Item added successfully.');
        } catch (error) {
            console.log('Error:', error);
            res.status(500).send('Error adding New Item.');
        }
    });
});

app.get("/Orders", async (req, res) => {
    try {
        // Fetch all orders from the database
        const orders = await Order.find().sort({ createdAt: -1 }).lean();
        const formattedOrders = orders.map((order) => {
            const isReservation = order.serviceType === 'reservation';
            const createdAt = order.createdAt ? new Date(order.createdAt) : null;

            return {
                ...order,
                orderIdDisplay: String(order._id || '').slice(-6).toUpperCase() || '-',
                serviceTypeLabel: getServiceTypeLabel(order.serviceType),
                serviceTypeClass: isReservation ? 'reservation' : 'dine-in',
                seatCount: order.seatCount || 1,
                tableDisplay: order.TableNumber || '-',
                reservationLabel: formatReservationLabel(order) || '-',
                statusLabel: order.status === 'closed' ? 'Closed' : 'Active',
                totalPriceDisplay: Number(order.totalPrice || 0).toFixed(2),
                createdAtDisplay: createdAt && !Number.isNaN(createdAt.getTime())
                    ? createdAt.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
                    : '-',
            };
        });

        // Render the Orders page with the fetched orders
        res.render("Orders", { orders: formattedOrders });
    } catch (error) {
        console.error('Error Fetching Orders:', error);
        res.status(500).send('Error fetching orders.');
    }
})

app.get("/Messages", (req, res) => {
    res.render("Messages");
})

app.get("/QR_Code", async (req, res) => {
    try {
        const tables = await getConfiguredFloorTables();
        res.render("QR_Code", { tables, tableCount: tables.length });
    } catch (error) {
        console.error('Error fetching QR table config:', error);
        res.status(500).send('Error fetching QR table config.');
    }
})


app.get("/ImgUploader", async (req, res) => {
    try {
        const images = await Image.find();
        images.forEach(img => {
            img.base64Image = img.image.data.toString('base64');
        });
        res.render("ImgUploader", { images });
    } catch (error) {
        res.status(500).send('Error Fetching Image:', error);
    }

})


app.delete('/deleteImage/:id', async (req, res) => {
    const imageId = req.params.id;
    try {
        const deletedImage = await Image.findByIdAndDelete(imageId);

        if (deletedImage) {
            // Get the latest image after deletion
            const latestImage = await Image.findOne().sort({ updatedAt: -1 });

            if (latestImage) {
                latestImageIdentifier = latestImage.title;
            } else {
                latestImageIdentifier = null; // No images left
            }

            res.status(200).json({ success: true });
        } else {
            res.status(404).json({ success: false, error: 'Image not found.' });
        }
    } catch (error) {
        console.error('Error deleting image:', error);
        res.status(500).json({ success: false, error: 'Failed to delete image. Please try again later.' });
    }
});

app.put('/updateImage/:id', upload.single('image'), async (req, res) => {
    const imageId = req.params.id;
    const newTitle = req.body.title;
    const newImage = req.file;

    try {
        const existingImage = await Image.findById(imageId);

        if (!existingImage) {
            return res.status(404).json({ success: false, error: 'Image not found.' });
        }

        // Update the title if needed
        if (newTitle) {
            existingImage.title = newTitle;
        }

        // Update the image if a new image was uploaded
        if (newImage) {
            existingImage.image.data = newImage.buffer;
            existingImage.image.contentType = newImage.mimetype;
        }

        await existingImage.save();

        // Send a success response with the updated image
        res.status(200).json({ success: true, updatedImage: existingImage });
    } catch (error) {
        console.error('Error updating image:', error);
        res.status(500).json({ success: false, error: 'Failed to update image. Please try again later.' });
    }
});


app.get('/ImgUploader_add', async (req, res) => {
    try {
        const floorTables = await getConfiguredFloorTables();
        const activeOrders = await Order.find({ status: { $ne: 'closed' } }).lean();
        const ordersByTable = new Map();

        activeOrders.forEach((order) => {
            const tableNumber = Number(order.TableNumber);
            if (!Number.isInteger(tableNumber) || tableNumber < 1) {
                return;
            }
            if (!ordersByTable.has(tableNumber)) {
                ordersByTable.set(tableNumber, []);
            }
            ordersByTable.get(tableNumber).push(order);
        });

        const floorByNumber = new Map(floorTables.map((table) => [table.number, table]));
        ordersByTable.forEach((orders, tableNumber) => {
            if (!floorByNumber.has(tableNumber)) {
                const extraTable = {
                    number: tableNumber,
                    zone: 'Extra tables',
                    seats: 4,
                    shape: 'square',
                };
                floorTables.push(extraTable);
                floorByNumber.set(tableNumber, extraTable);
            }
        });

        const tables = floorTables
            .sort((a, b) => a.number - b.number)
            .map((table) => {
                const orders = ordersByTable.get(table.number) || [];
                const isReserved = orders.length > 0;
                const itemNames = orders
                    .flatMap((order) => order.items || [])
                    .map((item) => item.itemName)
                    .filter(Boolean);
                const orderTotal = orders.reduce((sum, order) => sum + Number(order.totalPrice || 0), 0);
                const activeSeatCount = orders.reduce((sum, order) => {
                    const orderSeats = Number(order.seatCount);
                    return sum + (orderSeats > 0 ? orderSeats : table.seats);
                }, 0);
                const orderKindSummary = [...new Set(orders.map((order) => getServiceTypeLabel(order.serviceType)))].join(' / ');
                const reservationLabels = orders
                    .map((order) => formatReservationLabel(order))
                    .filter(Boolean);
                const reservationSummary = reservationLabels.length > 2
                    ? `${reservationLabels.slice(0, 2).join(' | ')} +${reservationLabels.length - 2}`
                    : reservationLabels.join(' | ');
                const visibleItems = itemNames.slice(0, 3).join(', ');
                const itemSummary = itemNames.length > 3
                    ? `${visibleItems} +${itemNames.length - 3}`
                    : visibleItems;

                return {
                    ...table,
                    seatsClass: `seats-${table.seats}`,
                    shapeClass: `shape-${table.shape}`,
                    isReserved,
                    statusClass: isReserved ? 'reserved' : 'free',
                    statusLabel: isReserved ? 'Reserved' : 'Free',
                    orderCount: orders.length,
                    activeSeatCount,
                    orderTotal: orderTotal.toFixed(2),
                    orderKindSummary,
                    reservationSummary,
                    itemSummary,
                };
            });

        const preferredZoneOrder = ['Terrace', 'Main room', 'Window side', 'Family corner'];
        const dynamicZones = [...new Set(tables.map((table) => table.zone))]
            .filter((zone) => !preferredZoneOrder.includes(zone) && zone !== 'Extra tables');
        const zoneOrder = [...preferredZoneOrder, ...dynamicZones, 'Extra tables'];
        const tableSections = zoneOrder
            .map((zone) => {
                const zoneTables = tables.filter((table) => table.zone === zone);
                return {
                    title: zone,
                    tables: zoneTables,
                    totalCount: zoneTables.length,
                    freeCount: zoneTables.filter((table) => !table.isReserved).length,
                    reservedCount: zoneTables.filter((table) => table.isReserved).length,
                };
            })
            .filter((section) => section.tables.length > 0);

        res.render('ImgUploader_add', {
            tableSections,
            tableStats: {
                totalTables: tables.length,
                freeTables: tables.filter((table) => !table.isReserved).length,
                reservedTables: tables.filter((table) => table.isReserved).length,
                activeOrders: activeOrders.length,
            },
        });
    } catch (error) {
        console.error('Error fetching table map:', error);
        res.status(500).send('Error fetching table map.');
    }
});

app.post('/tables/config', async (req, res) => {
    const { payload, error } = buildTableConfigPayload(req.body, true);

    if (error) {
        return res.status(400).json({ success: false, error });
    }

    try {
        await ensureTableConfigSeeded();

        const existingTable = await TableConfig.findOne({ number: payload.number }).lean();
        if (existingTable) {
            return res.status(409).json({
                success: false,
                error: 'This table already exists. Use edit to change it.',
            });
        }

        const table = await TableConfig.create(payload);
        res.status(201).json({ success: true, table: normalizeTableConfig(table) });
    } catch (error) {
        console.error('Error creating table config:', error);
        res.status(500).json({ success: false, error: 'Error creating table.' });
    }
});

app.post('/tables/config/count', async (req, res) => {
    const tableCount = parsePositiveInteger(req.body.tableCount);
    const defaultSeats = parsePositiveInteger(req.body.defaultSeats) || 4;

    if (!tableCount) {
        return res.status(400).json({ success: false, error: 'Please enter a valid table count.' });
    }

    try {
        await ensureTableConfigSeeded();

        const blockedTables = await Order.distinct('TableNumber', {
            TableNumber: { $gt: tableCount },
            status: { $ne: 'closed' },
        });

        if (blockedTables.length > 0) {
            return res.status(409).json({
                success: false,
                error: `Close active orders on table ${blockedTables.join(', ')} before reducing the count.`,
            });
        }

        const existingTables = await TableConfig.find().lean();
        const existingTablesByNumber = new Map(existingTables.map((table) => [Number(table.number), table]));
        const defaultTablesByNumber = new Map(getDefaultFloorTables().map((table) => [table.number, table]));
        const nextTables = Array.from({ length: tableCount }, (_, index) => {
            const number = index + 1;
            return buildGeneratedTableConfig(number, existingTablesByNumber, defaultTablesByNumber, defaultSeats);
        });

        await TableConfig.deleteMany({});
        await TableConfig.insertMany(nextTables);

        res.json({ success: true, tables: nextTables });
    } catch (error) {
        console.error('Error setting table count:', error);
        res.status(500).json({ success: false, error: 'Error setting table count.' });
    }
});

app.patch('/tables/config/:tableNumber', async (req, res) => {
    const currentNumber = parsePositiveInteger(req.params.tableNumber);
    const { payload, error } = buildTableConfigPayload(req.body, true);

    if (!currentNumber) {
        return res.status(400).json({ success: false, error: 'Invalid table number.' });
    }

    if (error) {
        return res.status(400).json({ success: false, error });
    }

    try {
        await ensureTableConfigSeeded();

        const table = await TableConfig.findOne({ number: currentNumber });
        if (!table) {
            return res.status(404).json({ success: false, error: 'Table not found.' });
        }

        if (payload.number !== currentNumber) {
            const duplicateTable = await TableConfig.findOne({ number: payload.number }).lean();
            if (duplicateTable) {
                return res.status(409).json({
                    success: false,
                    error: 'Another table already uses this number.',
                });
            }
        }

        table.number = payload.number;
        table.seats = payload.seats;
        table.zone = payload.zone;
        table.shape = payload.shape;
        await table.save();

        if (payload.number !== currentNumber) {
            await Order.updateMany(
                { TableNumber: currentNumber, status: { $ne: 'closed' } },
                { $set: { TableNumber: payload.number } }
            );
        }

        res.json({ success: true, table: normalizeTableConfig(table) });
    } catch (error) {
        console.error('Error updating table config:', error);
        res.status(500).json({ success: false, error: 'Error updating table.' });
    }
});

app.delete('/tables/config/:tableNumber', async (req, res) => {
    const tableNumber = parsePositiveInteger(req.params.tableNumber);

    if (!tableNumber) {
        return res.status(400).json({ success: false, error: 'Invalid table number.' });
    }

    try {
        await ensureTableConfigSeeded();

        const activeOrderCount = await Order.countDocuments({
            TableNumber: tableNumber,
            status: { $ne: 'closed' },
        });

        if (activeOrderCount > 0) {
            return res.status(409).json({
                success: false,
                error: 'Close active orders before deleting this table.',
            });
        }

        const deletedTable = await TableConfig.findOneAndDelete({ number: tableNumber });

        if (!deletedTable) {
            return res.status(404).json({ success: false, error: 'Table not found.' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting table config:', error);
        res.status(500).json({ success: false, error: 'Error deleting table.' });
    }
});

app.post('/tables/config/reset', async (req, res) => {
    try {
        const tables = await seedDefaultTableConfig();
        res.json({ success: true, tables });
    } catch (error) {
        console.error('Error resetting table config:', error);
        res.status(500).json({ success: false, error: 'Error resetting tables.' });
    }
});

app.patch('/tables/:tableNumber/free', async (req, res) => {
    const tableNumber = Number(req.params.tableNumber);
    if (!Number.isInteger(tableNumber) || tableNumber < 1) {
        return res.status(400).json({ success: false, error: 'Invalid table number.' });
    }

    try {
        const result = await Order.updateMany(
            { TableNumber: tableNumber, status: { $ne: 'closed' } },
            { $set: { status: 'closed', closedAt: new Date() } }
        );
        res.json({
            success: true,
            modifiedCount: result.modifiedCount || result.nModified || 0,
        });
    } catch (error) {
        console.error('Error freeing table:', error);
        res.status(500).json({ success: false, error: 'Error freeing table.' });
    }
});


let latestImageIdentifier = null;

function getSafeMenuReturnTo(value) {
    const fallback = '/UserMenu';
    const rawValue = String(value || '').trim();

    if (!rawValue || !rawValue.startsWith('/') || rawValue.startsWith('//') || rawValue.includes('\\')) {
        return fallback;
    }

    try {
        const parsedUrl = new URL(rawValue, 'http://digital-menu.local');

        if (parsedUrl.origin !== 'http://digital-menu.local') {
            return fallback;
        }

        if (parsedUrl.pathname === '/UserMenu_loginpage' || parsedUrl.pathname === '/UserMenu_SignUp') {
            return fallback;
        }

        return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
    } catch (error) {
        return fallback;
    }
}

function getMenuSessionUser(req) {
    if (req.session && req.session.menuUser) {
        return req.session.menuUser;
    }

    const cookieUser = readMenuAuthCookie(req);
    if (cookieUser && req.session) {
        req.session.menuUser = cookieUser;
    }

    return cookieUser;
}

function buildMenuSessionUser(userDocument) {
    return {
        id: String(userDocument._id),
        username: userDocument.username,
        email: userDocument.email,
        phonenumber: userDocument.phonenumber,
    };
}

function parseCookies(req) {
    return String(req.headers.cookie || '')
        .split(';')
        .map((cookie) => cookie.trim())
        .filter(Boolean)
        .reduce((cookies, cookie) => {
            const separatorIndex = cookie.indexOf('=');
            if (separatorIndex === -1) {
                return cookies;
            }

            const key = cookie.slice(0, separatorIndex);
            const value = cookie.slice(separatorIndex + 1);
            try {
                cookies[key] = decodeURIComponent(value);
            } catch (error) {
                cookies[key] = value;
            }
            return cookies;
        }, {});
}

function signMenuCookiePayload(payload) {
    return crypto
        .createHmac('sha256', secretKey)
        .update(payload)
        .digest('base64url');
}

function createMenuAuthCookieValue(menuUser) {
    const payload = Buffer.from(JSON.stringify(menuUser)).toString('base64url');
    const signature = signMenuCookiePayload(payload);
    return `${payload}.${signature}`;
}

function readMenuAuthCookie(req) {
    const cookieValue = parseCookies(req)[MENU_AUTH_COOKIE];

    if (!cookieValue || !cookieValue.includes('.')) {
        return null;
    }

    const [payload, signature] = cookieValue.split('.');
    const expectedSignature = signMenuCookiePayload(payload);
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (signatureBuffer.length !== expectedBuffer.length) {
        return null;
    }

    if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
        return null;
    }

    try {
        const parsedUser = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));

        if (!parsedUser || !parsedUser.id || !parsedUser.email) {
            return null;
        }

        return parsedUser;
    } catch (error) {
        return null;
    }
}

function getMenuAuthCookieOptions() {
    return {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: MENU_AUTH_COOKIE_MAX_AGE,
    };
}

function setMenuAuth(req, res, menuUser) {
    if (req.session) {
        req.session.menuUser = menuUser;
    }

    res.cookie(MENU_AUTH_COOKIE, createMenuAuthCookieValue(menuUser), getMenuAuthCookieOptions());
}

function clearMenuAuth(req, res) {
    if (req.session) {
        delete req.session.menuUser;
    }

    const { maxAge, ...cookieOptions } = getMenuAuthCookieOptions();
    res.clearCookie(MENU_AUTH_COOKIE, cookieOptions);
}

async function buildUserMenuViewData(req) {
    const categories = await Category.find().lean();
    const MenuItems = await MenuItem.find({}, { image: 0 }).lean();

    MenuItems.forEach(item => {
        item.imageUrl = `/menu-image/${item._id}`;
    });

    const slugify = (value) => String(value || "other")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "other";
    const sectionsByCategory = new Map(categories.map((category) => [
        category.title,
        {
            title: category.title,
            sectionId: `category-${category._id}`,
            items: [],
        },
    ]));
    const extraSections = new Map();

    MenuItems.forEach((item) => {
        const section = sectionsByCategory.get(item.category);
        if (section) {
            section.items.push(item);
            return;
        }

        const fallbackTitle = item.category || "Other";
        if (!extraSections.has(fallbackTitle)) {
            extraSections.set(fallbackTitle, {
                title: fallbackTitle,
                sectionId: `category-${slugify(fallbackTitle)}`,
                items: [],
            });
        }
        extraSections.get(fallbackTitle).items.push(item);
    });

    const categorySections = [
        ...sectionsByCategory.values(),
        ...extraSections.values(),
    ]
        .filter((section) => section.items.length > 0)
        .map((section) => ({
            ...section,
            itemCount: section.items.length,
        }));

    let latestImage = null;
    if (latestImageIdentifier) {
        latestImage = await Image.findOne({ title: latestImageIdentifier });

        if (latestImage) {
            latestImage.base64Image = `data:${latestImage.image.contentType};base64,${latestImage.image.data.toString('base64')}`;
        }
    }

    return {
        categories,
        latestImage,
        MenuItems,
        categorySections,
        totalItems: MenuItems.length,
        tables: await getConfiguredFloorTables(),
        menuUser: getMenuSessionUser(req),
    };
}

app.post("/ImgUploader_add", upload.single('image'), async (req, res) => {
    const title = req.body.title;
    const image = req.file;
    if (!image) {
        return res.status(400).send('No image file provided. Pleaes select an image to upload.');
    }

    try {
        const newImage = new Image({
            title,
            image: {
                data: image.buffer,
                contentType: image.mimetype,
            },
        });

        await newImage.save();
        latestImageIdentifier = newImage.title;
        console.log('Image is Uploaded :', newImage);
        res.send('Image Uploaded Successfully');
    } catch (error) {
        console.log('Error:', error);
        res.status(500).send('Error to Upload Image.');
    }
})

app.get("/UserMenu", async (req, res) => {
    try {
        res.render("UserMenu", await buildUserMenuViewData(req));
    } catch (error) {
        console.error('Error fetching menu items for UserMenu:', error);
        res.status(500).send('Error fetching menu items for UserMenu.');
    }
});

app.get("/Order_Details", async (req, res) => {
    try {
        res.render("Order_Details", { tables: await getConfiguredFloorTables() });
    } catch (error) {
        console.error('Error fetching checkout table config:', error);
        res.status(500).send('Error fetching checkout table config.');
    }
});

app.post('/Order_Details', async (req, res) => {
    try {
        const {
            name,
            PhoneNumber,
            email,
            TableNumber,
            serviceType,
            seatCount,
            reservationDate,
            reservationTime,
            items,
            totalPrice,
        } = req.body;

        const normalizedServiceType = serviceType === 'reservation' ? 'reservation' : 'dine-in';
        const parsedSeatCount = Number(seatCount);
        const parsedTableNumber = Number(TableNumber);

        if (!Number.isInteger(parsedSeatCount) || parsedSeatCount < 1) {
            return res.status(400).send('Please enter the number of seats / people.');
        }

        if (normalizedServiceType === 'dine-in' && (!Number.isInteger(parsedTableNumber) || parsedTableNumber < 1)) {
            return res.status(400).send('Please enter your table number for commande sur place.');
        }

        if (normalizedServiceType === 'reservation' && (!reservationDate || !reservationTime)) {
            return res.status(400).send('Please choose the reservation date and time.');
        }

        const orderData = {
            name,
            PhoneNumber,
            email,
            serviceType: normalizedServiceType,
            seatCount: parsedSeatCount,
            TableNumber: normalizedServiceType === 'dine-in' ? parsedTableNumber : undefined,
            items: Array.isArray(items) ? items : [],
            totalPrice: Number(totalPrice || 0),
        };

        if (normalizedServiceType === 'reservation') {
            const reservationAt = new Date(`${reservationDate}T${reservationTime}:00`);
            orderData.reservationDate = reservationDate;
            orderData.reservationTime = reservationTime;
            if (!Number.isNaN(reservationAt.getTime())) {
                orderData.reservationAt = reservationAt;
            }
        }

        // items is already parsed as an array, no need for JSON.parse
        const order = new Order(orderData);

        await order.save();

        // Clear the cart after successful order submission
        // localStorage.removeItem("cart");

        // Redirect to a success page or send a success response
        res.status(201).send('Order submitted successfully.');
    } catch (error) {
        console.error('Error submitting order:', error);
        res.status(500).send('Internal Server Error');
    }
});



app.get("/UserMenu_loginpage", (req, res) => {
    const returnTo = getSafeMenuReturnTo(req.query.returnTo);
    res.render("UserMenu_loginpage", {
        returnTo,
        returnToQuery: encodeURIComponent(returnTo),
    });
});

app.post("/UserMenu_loginpage", async (req, res) => {
    const returnTo = getSafeMenuReturnTo(req.body.returnTo || req.query.returnTo);

    try {
        // const { email, password } = req.body;

        // Check if the user exists
        const user = await UserNew.findOne({ email: String(req.body.email || '').toLowerCase().trim() });

        if (!user) {
            return res.status(400).render("UserMenu_loginpage", {
                loginError: 'User not found. Please check your email and try again.',
                returnTo,
                returnToQuery: encodeURIComponent(returnTo),
            });
        }

        // Check if the password is correct
        if (user.password === req.body.password) {
            setMenuAuth(req, res, buildMenuSessionUser(user));
            return res.redirect(303, returnTo);
        }

        res.status(401).render("UserMenu_loginpage", {
            loginError: 'Invalid login details.',
            returnTo,
            returnToQuery: encodeURIComponent(returnTo),
        });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get("/UserMenu_SignUp", (req, res) => {
    const returnTo = getSafeMenuReturnTo(req.query.returnTo);
    res.render("UserMenu_SignUp", {
        returnTo,
        returnToQuery: encodeURIComponent(returnTo),
    });
});

app.post("/UserMenu_SignUp", async (req, res) => {
    const { username, phonenumber, email, password } = req.body;
    const returnTo = getSafeMenuReturnTo(req.body.returnTo || req.query.returnTo);

    try {
        // Check if the user already exists
        const existingUser = await UserNew.findOne({ email: String(email || '').toLowerCase().trim() });

        if (existingUser) {
            return res.status(400).render("UserMenu_SignUp", {
                registerError: 'User with this email already exists.',
                returnTo,
                returnToQuery: encodeURIComponent(returnTo),
            });
        }

        // Create a new user
        const newUser = new UserNew({
            username,
            phonenumber,
            email: String(email || '').toLowerCase().trim(),
            password,
        });
        await newUser.save();
        setMenuAuth(req, res, buildMenuSessionUser(newUser));
        res.redirect(303, returnTo);
        // res.status(201).send('User registered successfully.');
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/UserMenu_logout', (req, res) => {
    clearMenuAuth(req, res);
    res.redirect(getSafeMenuReturnTo(req.query.returnTo));
});

app.get('/signout', (req, res) => {
    // Destroy the user's session to sign them out
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        }
        // Redirect the user to the login page after signing out
        res.redirect('/login');
    });
});


if (require.main === module) {
    server.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

module.exports = app;
module.exports.server = server;






















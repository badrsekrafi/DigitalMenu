
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

const PORT = process.env.PORT || 5000;

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

function getFloorTables() {
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

app.get("/QR_Code", (req, res) => {
    const tables = getFloorTables();
    res.render("QR_Code", { tables, tableCount: tables.length });
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
        const floorTables = getFloorTables();
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

        const zoneOrder = ['Terrace', 'Main room', 'Window side', 'Family corner', 'Extra tables'];
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

        res.render("UserMenu", {
            categories,
            latestImage,
            MenuItems,
            categorySections,
            totalItems: MenuItems.length,
            tables: getFloorTables(),
        });
    } catch (error) {
        console.error('Error fetching categories for UserMenu:', error);
        console.error('Error fetching menu items for UserMenu:', error);
        res.status(500).send('Error fetching menu items for UserMenu.');
    }
});

app.get("/Order_Details", (req, res) => {
    res.render("Order_Details", { tables: getFloorTables() });
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
    res.render("UserMenu_loginpage");
});

app.post("/UserMenu_loginpage", async (req, res) => {
    try {
        // const { email, password } = req.body;

        // Check if the user exists
        const user = await UserNew.findOne({ email: req.body.email });

        if (!user) {
            return res.status(400).send('User not found. Please check your email and try again.');
        }

        // Check if the password is correct
        if (user.password === req.body.password) {
            return res.status(201).render("UserMenu");
        } else {
            res.send("Invalid login Details");
        }

    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get("/UserMenu_SignUp", (req, res) => {
    res.render("UserMenu_SignUp");
});

app.post("/UserMenu_SignUp", async (req, res) => {
    const { username, phonenumber, email, password } = req.body;

    try {
        // Check if the user already exists
        const existingUser = await UserNew.findOne({ email });

        if (existingUser) {
            return res.status(400).send('User with this email already exists.');
        }

        // Create a new user
        const newUser = new UserNew({ username, phonenumber, email, password });
        await newUser.save();
        res.render("UserMenu_loginpage");
        // res.status(201).send('User registered successfully.');
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).send('Internal Server Error');
    }
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






















/*
 * Le Patio Djerba — client cart
 *
 * Storage format is unchanged and shared with /Order_Details:
 *   localStorage.cart = { items: [{ name, price, img }], subtotal, total }
 * One entry per unit: quantities are displayed by grouping identical entries.
 *
 * Event delegation is used so that buttons rendered later (search results)
 * work without re-binding.
 */
document.addEventListener("DOMContentLoaded", function () {
    const deliveryFee = 0;
    const drawer = document.getElementById("cartDrawer");
    const orderItemsContainer = document.querySelector(".order-items-container");
    const subtotalElement = document.querySelector(".subtotal");
    const grandTotalElement = document.getElementById("grand-total");
    const checkoutLink = document.getElementById("checkoutLink");
    const countBadges = Array.from(document.querySelectorAll("[data-cart-count]"));
    const cartToast = document.getElementById("cartToast");
    const cartToastText = document.getElementById("cartToastText");
    let lastFocused = null;
    let toastTimer = null;

    const t = (key, fallback) => (window.patioT ? window.patioT(key, fallback) : fallback);
    const currency = () => window.RESTAURANT_CURRENCY || "DT";
    const formatPrice = (value) => `${Number(value || 0).toFixed(2)} ${currency()}`;

    let cart = loadCart();

    function normalizeCart(rawCart) {
        const items = Array.isArray(rawCart && rawCart.items) ? rawCart.items : [];
        const subtotal = items.reduce((sum, item) => sum + Number(item.price || 0), 0);
        return { items, subtotal, total: subtotal + deliveryFee };
    }

    function loadCart() {
        try {
            const cartData = localStorage.getItem("cart");
            return normalizeCart(cartData ? JSON.parse(cartData) : { items: [] });
        } catch (error) {
            console.error("Error loading cart:", error);
            return normalizeCart({ items: [] });
        }
    }

    function saveCart() {
        cart = normalizeCart(cart);
        localStorage.setItem("cart", JSON.stringify(cart));
    }

    function groupItems() {
        const groups = new Map();
        cart.items.forEach((item) => {
            const key = `${item.name}__${Number(item.price || 0).toFixed(2)}`;
            if (!groups.has(key)) {
                groups.set(key, { key, name: item.name, price: Number(item.price || 0), img: item.img, qty: 0 });
            }
            groups.get(key).qty += 1;
        });
        return Array.from(groups.values());
    }

    function addItem(item) {
        cart.items.push({ name: item.name, price: Number(item.price || 0), img: item.img });
        saveCart();
        render(true);
    }

    function removeOne(name, price) {
        for (let i = cart.items.length - 1; i >= 0; i -= 1) {
            const entry = cart.items[i];
            if (entry.name === name && Number(entry.price || 0).toFixed(2) === Number(price).toFixed(2)) {
                cart.items.splice(i, 1);
                break;
            }
        }
        saveCart();
        render();
    }

    function updateBadges(bump) {
        const count = cart.items.length;
        countBadges.forEach((badge) => {
            badge.textContent = count;
            badge.classList.toggle("is-empty", count === 0);
            if (bump && count > 0) {
                badge.classList.remove("is-bumping");
                void badge.offsetWidth; // restart the animation
                badge.classList.add("is-bumping");
            }
        });
    }

    function render(bump = false) {
        updateBadges(bump);
        if (!orderItemsContainer) return;

        orderItemsContainer.innerHTML = "";
        const groups = groupItems();

        if (groups.length === 0) {
            const empty = document.createElement("div");
            empty.className = "cart-empty";
            empty.innerHTML = '<span class="cart-empty-icon"><i class="fas fa-shopping-basket" aria-hidden="true"></i></span>';
            const text = document.createElement("p");
            text.textContent = t("emptyCart", "Votre panier est vide.");
            empty.appendChild(text);
            orderItemsContainer.appendChild(empty);
        }

        groups.forEach((group) => {
            const row = document.createElement("div");
            row.className = "cart-item";

            const img = document.createElement("img");
            img.src = group.img || "/images/logo.png";
            img.alt = "";
            img.loading = "lazy";
            img.className = "cart-item-image";

            const info = document.createElement("div");
            info.className = "cart-item-info";
            const name = document.createElement("span");
            name.className = "item-name";
            name.textContent = group.name;
            const price = document.createElement("span");
            price.className = "item-price";
            price.textContent = formatPrice(group.price * group.qty);
            info.append(name, price);

            const qty = document.createElement("div");
            qty.className = "cart-qty";
            const minus = document.createElement("button");
            minus.type = "button";
            minus.className = "qty-btn";
            minus.setAttribute("aria-label", `${t("removeOne", "Retirer")} ${group.name}`);
            minus.innerHTML = group.qty === 1
                ? '<i class="fas fa-trash-alt" aria-hidden="true"></i>'
                : '<i class="fas fa-minus" aria-hidden="true"></i>';
            minus.addEventListener("click", () => removeOne(group.name, group.price));
            const value = document.createElement("span");
            value.className = "qty-value";
            value.textContent = group.qty;
            const plus = document.createElement("button");
            plus.type = "button";
            plus.className = "qty-btn";
            plus.setAttribute("aria-label", `${t("addOne", "Ajouter")} ${group.name}`);
            plus.innerHTML = '<i class="fas fa-plus" aria-hidden="true"></i>';
            plus.addEventListener("click", () => addItem(group));
            qty.append(minus, value, plus);

            row.append(img, info, qty);
            orderItemsContainer.appendChild(row);
        });

        if (subtotalElement) subtotalElement.textContent = formatPrice(cart.subtotal);
        if (grandTotalElement) grandTotalElement.textContent = formatPrice(cart.total);
        if (checkoutLink) {
            const isEmpty = cart.items.length === 0;
            checkoutLink.classList.toggle("is-disabled", isEmpty);
            checkoutLink.setAttribute("aria-disabled", String(isEmpty));
        }
    }

    function showToast(name) {
        if (!cartToast || !cartToastText) return;
        cartToastText.textContent = `${name} — ${t("addedToCart", "ajouté au panier")}`;
        cartToast.hidden = false;
        requestAnimationFrame(() => cartToast.classList.add("is-visible"));
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            cartToast.classList.remove("is-visible");
            setTimeout(() => { cartToast.hidden = true; }, 250);
        }, 2200);
    }

    function setCartOpen(isOpen) {
        if (!drawer) return;
        if (isOpen) {
            lastFocused = document.activeElement;
            drawer.hidden = false;
            requestAnimationFrame(() => requestAnimationFrame(() => drawer.classList.add("is-open")));
            document.body.classList.add("has-overlay");
            const closeBtn = drawer.querySelector(".cart-close-icon");
            if (closeBtn) setTimeout(() => closeBtn.focus(), 60);
        } else {
            drawer.classList.remove("is-open");
            document.body.classList.remove("has-overlay");
            setTimeout(() => { if (!drawer.classList.contains("is-open")) drawer.hidden = true; }, 300);
            if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
        }
        document.querySelectorAll("[data-cart-open]").forEach((el) => el.setAttribute("aria-expanded", String(isOpen)));
    }
    window.patioCart = { open: () => setCartOpen(true), close: () => setCartOpen(false), render };

    document.addEventListener("click", (event) => {
        const addButton = event.target.closest(".add-to-cart-btn");
        if (addButton && !addButton.disabled) {
            event.preventDefault();
            const name = addButton.getAttribute("data-name");
            addItem({
                name,
                price: parseFloat(addButton.getAttribute("data-price")),
                img: addButton.getAttribute("data-img"),
            });
            addButton.classList.remove("is-added");
            void addButton.offsetWidth;
            addButton.classList.add("is-added");
            setTimeout(() => addButton.classList.remove("is-added"), 900);
            showToast(addButton.getAttribute("data-display-name") || name);
            return;
        }

        if (event.target.closest("[data-cart-open]")) {
            event.preventDefault();
            setCartOpen(true);
            return;
        }

        if (event.target.closest("[data-cart-close]")) {
            event.preventDefault();
            setCartOpen(false);
            return;
        }

        if (checkoutLink && event.target.closest("#checkoutLink") && cart.items.length === 0) {
            event.preventDefault();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && drawer && !drawer.hidden) setCartOpen(false);
    });

    // Keep several tabs in sync.
    window.addEventListener("storage", (event) => {
        if (event.key === "cart") {
            cart = loadCart();
            render();
        }
    });
    document.addEventListener("patio:language", () => render());

    saveCart();
    render();
});

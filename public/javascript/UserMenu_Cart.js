document.addEventListener("DOMContentLoaded", function () {
    const deliveryFee = 0;
    const addToCartButtons = document.querySelectorAll(".add-to-cart-btn");
    const cartToggle = document.getElementById("cart");
    const cartLabel = document.querySelector("label[for='cart']");
    const cartWrapper = document.querySelector(".cart-wrapper");
    const closeCartButton = document.getElementById("close-cart");
    const orderItemsContainer = document.querySelector(".order-items-container");
    const subtotalElement = document.querySelector(".subtotal");
    const grandTotalElement = document.getElementById("grand-total");
    const cartCountBadge = document.getElementById("cartCountBadge");

    let cart = loadCart();

    function setCartOpen(isOpen) {
        if (cartToggle) {
            cartToggle.checked = !isOpen;
        }

        if (cartLabel) {
            cartLabel.setAttribute("aria-expanded", String(isOpen));
            cartLabel.setAttribute("aria-label", isOpen ? "Close cart" : "Open cart");
        }
    }

    function normalizeCart(rawCart) {
        const items = Array.isArray(rawCart.items) ? rawCart.items : [];
        const subtotal = items.reduce((sum, item) => sum + Number(item.price || 0), 0);
        return { items, subtotal, total: subtotal + deliveryFee };
    }

    function loadCart() {
        try {
            const cartData = localStorage.getItem("cart");
            return normalizeCart(cartData ? JSON.parse(cartData) : { items: [], subtotal: 0 });
        } catch (error) {
            console.error("Error loading cart:", error);
            return normalizeCart({ items: [], subtotal: 0 });
        }
    }

    function updateLocalStorage() {
        cart = normalizeCart(cart);
        localStorage.setItem("cart", JSON.stringify(cart));
    }

    function updateCartCount() {
        if (!cartCountBadge) {
            return;
        }

        const itemCount = cart.items.length;
        cartCountBadge.textContent = itemCount;
        cartCountBadge.classList.toggle("is-empty", itemCount === 0);
    }

    addToCartButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const name = button.getAttribute("data-name");
            const price = parseFloat(button.getAttribute("data-price"));
            const img = button.getAttribute("data-img");

            cart.items.push({ name, price, img });
            updateLocalStorage();
            updateCartDisplay(true);
        });
    });

    if (closeCartButton) {
        closeCartButton.addEventListener("click", () => {
            setCartOpen(false);
        });
    }

    if (cartToggle) {
        cartToggle.addEventListener("change", () => {
            setCartOpen(!cartToggle.checked);
        });
    }

    function updateCartDisplay(openCart = false) {
        if (!orderItemsContainer || !subtotalElement || !grandTotalElement) {
            updateCartCount();
            return;
        }

        orderItemsContainer.innerHTML = "";

        if (cart.items.length === 0) {
            const emptyCart = document.createElement("p");
            emptyCart.className = "empty-cart-message";
            emptyCart.textContent = "Cart is empty.";
            orderItemsContainer.appendChild(emptyCart);
        }

        cart.items.forEach((item) => {
            const itemElement = document.createElement("div");
            itemElement.classList.add("cart-item", "added-food");

            const itemImage = document.createElement("img");
            itemImage.src = item.img;
            itemImage.alt = item.name;
            itemImage.classList.add("cart-item-image", "added-food");

            const itemName = document.createElement("span");
            itemName.textContent = item.name;
            itemName.classList.add("item-name", "added-food");

            const itemPrice = document.createElement("span");
            itemPrice.textContent = `${Number(item.price || 0).toFixed(2)} DNT`;
            itemPrice.classList.add("item-price", "added-food");

            const closeButton = document.createElement("button");
            closeButton.type = "button";
            closeButton.textContent = "Remove";
            closeButton.classList.add("close-food-button");
            closeButton.addEventListener("click", () => {
                removeItemFromCart(item);
            });

            itemElement.appendChild(itemImage);
            itemElement.appendChild(itemName);
            itemElement.appendChild(itemPrice);
            itemElement.appendChild(closeButton);
            orderItemsContainer.appendChild(itemElement);
        });

        subtotalElement.textContent = `${cart.subtotal.toFixed(2)} DNT`;
        grandTotalElement.textContent = `${cart.total.toFixed(2)} DNT`;

        if (cartWrapper && openCart) {
            cartWrapper.style.display = "block";
            setCartOpen(true);
        }

        updateCartCount();
    }

    function removeItemFromCart(item) {
        const itemIndex = cart.items.indexOf(item);

        if (itemIndex !== -1) {
            cart.items.splice(itemIndex, 1);
            updateLocalStorage();
            updateCartDisplay();
        }
    }

    updateLocalStorage();
    updateCartDisplay();
    setCartOpen(false);
});

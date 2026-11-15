/*
 * Le Patio Djerba — Public Menu Navigation, Filters, Search & i18n
 *
 * Flow: Notre Menu (home) → Choix de catégorie (universe view) → Liste des produits → Retour aux catégories
 * Preserves vertical scroll position when returning to categories and supports History API (/UserMenu/categorie/:slug).
 */
(function () {
    "use strict";

    const I18N = {
        fr: {
            skipToContent: "Aller au contenu",
            tagline: "Découvrez nos saveurs",
            welcome: "Bienvenue au Patio",
            ourMenu: "Notre Menu",
            ourMenuSub: "Découvrez nos spécialités et choisissez votre catégorie",
            products: "produits",
            sections: "rubriques",
            all: "Tout",
            allCategories: "Voir toutes les catégories",
            backToCategories: "Retour aux catégories",
            back: "Retour",
            search: "Rechercher un produit",
            openNav: "Ouvrir le menu de navigation",
            close: "Fermer le menu",
            closeCart: "Fermer le panier",
            searchPlaceholder: "Rechercher un plat, une boisson…",
            searchHint: "Tapez le nom d'un produit, d'un ingrédient ou d'une catégorie.",
            noResults: "Aucun produit ne correspond à votre recherche.",
            outOfStock: "Épuisé",
            addedToCart: "ajouté au panier",
            emptyCart: "Votre panier est vide.",
            yourCart: "Votre panier",
            myCart: "Mon panier",
            subtotal: "Sous-total",
            total: "Total",
            checkout: "Valider la commande",
            orderStatus: "Suivi commande",
            itemStatus: "Statut des articles",
            rateExperience: "Évaluer votre expérience",
            googleReviews: "Avis Google Maps",
            yourOpinion: "Votre avis compte",
            shareExperience: "Partagez votre expérience chez",
            seeReviews: "Voir les avis",
            leaveReview: "Laisser un avis",
            language: "Langue",
            login: "Se connecter",
            logout: "Se déconnecter",
            menu: "Menu",
            cart: "Panier",
            orders: "Commandes",
            reviews: "Avis",
            view: "Voir",
            menuSoon: "Notre carte arrive très bientôt.",
            removeOne: "Retirer",
            addOne: "Ajouter",
            uniBreakfast: "Petit Déjeuner",
            uniBreakfastTag: "Bien commencer la journée",
            uniBreakfastDesc: "Formules du matin, viennoiseries dorées et brunchs à partager, servis chaque jour.",
            uniDishes: "Plats",
            uniDishesTag: "Saveurs généreuses",
            uniDishesDesc: "Plats, burgers, sandwichs et saveurs salées préparés à la minute avec des produits frais.",
            uniDrinks: "Boissons",
            uniDrinksTag: "Fraîcheur & caféine",
            uniDrinksDesc: "Cafés, jus frais, smoothies, mocktails et boissons fraîches pour toutes les envies.",
            uniSweets: "Douceurs",
            uniSweetsTag: "Pause sucrée",
            uniSweetsDesc: "Crêpes, gaufres, pancakes et desserts maison pour une parenthèse gourmande.",
        },
        ar: {
            skipToContent: "انتقل إلى المحتوى",
            tagline: "اكتشف نكهاتنا",
            welcome: "مرحباً بكم في لو باتيو",
            ourMenu: "قائمتنا",
            ourMenuSub: "اكتشف تخصصاتنا واختر الفئة المفضلة لديك",
            products: "منتجات",
            sections: "أقسام",
            all: "الكل",
            allCategories: "عرض جميع الفئات",
            backToCategories: "العودة إلى الفئات",
            back: "رجوع",
            search: "ابحث عن منتج",
            openNav: "فتح قائمة التنقل",
            close: "إغلاق القائمة",
            closeCart: "إغلاق السلة",
            searchPlaceholder: "ابحث عن طبق، مشروب…",
            searchHint: "اكتب اسم طبق أو مكوّن أو فئة للبحث الفوري.",
            noResults: "لا توجد منتجات مطابقة لبحثك.",
            outOfStock: "نفذت الكمية",
            addedToCart: "تمت إضافته إلى السلة",
            emptyCart: "سلتك فارغة.",
            yourCart: "سلة الطلبات",
            myCart: "سلتي",
            subtotal: "المجموع الفرعي",
            total: "المجموع",
            checkout: "تأكيد الطلب",
            orderStatus: "متابعة الطلب",
            itemStatus: "حالة الطلبات",
            rateExperience: "قيّم تجربتك",
            googleReviews: "تقييمات خرائط جوجل",
            yourOpinion: "رأيكم يهمنا",
            shareExperience: "شارك تجربتك في",
            seeReviews: "عرض التقييمات",
            leaveReview: "اترك تقييماً",
            language: "اللغة",
            login: "تسجيل الدخول",
            logout: "تسجيل الخروج",
            menu: "القائمة",
            cart: "السلة",
            orders: "الطلبات",
            reviews: "التقييمات",
            view: "عرض",
            menuSoon: "قائمتنا ستتوفر قريباً.",
            removeOne: "إزالة",
            addOne: "إضافة",
            uniBreakfast: "فطور الصباح",
            uniBreakfastTag: "بداية يوم شهية",
            uniBreakfastDesc: "وجبات فطور صباحية، كرواسون ذهبي وبرنش للمشاركة يومياً.",
            uniDishes: "الأطباق",
            uniDishesTag: "نكهات سخية",
            uniDishesDesc: "أطباق رئيسية، برغر، سندويشات ومملحات تحضر طازجة عند الطلب.",
            uniDrinks: "المشروبات",
            uniDrinksTag: "انتعاش وقهوة",
            uniDrinksDesc: "قهوة، عصائر طازجة، سموذي، موكتيلات ومشروبات باردة وساخنة.",
            uniSweets: "الحلويات",
            uniSweetsTag: "استراحة حلوة",
            uniSweetsDesc: "كريب، وافل، بان كيك وحلويات منزلية الصنع.",
        },
        en: {
            skipToContent: "Skip to content",
            tagline: "Discover our flavours",
            welcome: "Welcome to Le Patio",
            ourMenu: "Our Menu",
            ourMenuSub: "Explore our house specialties and choose your category",
            products: "items",
            sections: "sections",
            all: "All",
            allCategories: "Browse all categories",
            backToCategories: "Back to categories",
            back: "Back",
            search: "Search menu",
            openNav: "Open navigation menu",
            close: "Close menu",
            closeCart: "Close cart",
            searchPlaceholder: "Search for a dish, drink…",
            searchHint: "Type a dish name, ingredient, or category.",
            noResults: "No menu items match your search.",
            outOfStock: "Sold out",
            addedToCart: "added to cart",
            emptyCart: "Your cart is empty.",
            yourCart: "Your Cart",
            myCart: "My Cart",
            subtotal: "Subtotal",
            total: "Total",
            checkout: "Proceed to checkout",
            orderStatus: "Order tracker",
            itemStatus: "Items status",
            rateExperience: "Rate your experience",
            googleReviews: "Google Maps Reviews",
            yourOpinion: "Your feedback matters",
            shareExperience: "Share your experience at",
            seeReviews: "Read reviews",
            leaveReview: "Leave a review",
            language: "Language",
            login: "Sign in",
            logout: "Sign out",
            menu: "Menu",
            cart: "Cart",
            orders: "Orders",
            reviews: "Reviews",
            view: "View",
            menuSoon: "Our menu will be available soon.",
            removeOne: "Remove",
            addOne: "Add",
            uniBreakfast: "Breakfast",
            uniBreakfastTag: "Start the day right",
            uniBreakfastDesc: "Morning formulas, golden pastries, and generous brunches served daily.",
            uniDishes: "Main Dishes",
            uniDishesTag: "Generous flavours",
            uniDishesDesc: "Signature plates, burgers, sandwiches, and savoury dishes made fresh to order.",
            uniDrinks: "Drinks",
            uniDrinksTag: "Freshness & coffee",
            uniDrinksDesc: "Artisan coffee, fresh juices, smoothies, mocktails, and chilled refreshments.",
            uniSweets: "Sweet Treats",
            uniSweetsTag: "Sweet interlude",
            uniSweetsDesc: "Crêpes, waffles, pancakes, and homemade desserts for a gourmet break.",
        },
    };

    let currentLang = "fr";

    window.patioT = function (key, fallback) {
        const dict = I18N[currentLang] || I18N.fr;
        return dict[key] || fallback || key;
    };

    window.changeLanguage = function (lang) {
        const normalized = I18N[lang] ? lang : "fr";
        currentLang = normalized;
        try {
            localStorage.setItem("kaffaLang", normalized);
        } catch (e) {}

        const dict = I18N[normalized];
        document.documentElement.lang = normalized;
        document.body.dir = normalized === "ar" ? "rtl" : "ltr";

        document.querySelectorAll("[data-i18n]").forEach((el) => {
            const key = el.getAttribute("data-i18n");
            if (dict[key]) el.textContent = dict[key];
        });

        document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
            const key = el.getAttribute("data-i18n-placeholder");
            if (dict[key]) el.setAttribute("placeholder", dict[key]);
        });

        document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
            const key = el.getAttribute("data-i18n-aria");
            if (dict[key]) el.setAttribute("aria-label", dict[key]);
        });

        const select = document.getElementById("langSelect");
        if (select && select.value !== normalized) {
            select.value = normalized;
        }

        document.dispatchEvent(new CustomEvent("patio:language", { detail: { lang: normalized } }));
    };

    function normalizeText(value) {
        return String(value || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
    }

    document.addEventListener("DOMContentLoaded", function () {
        const views = Array.from(document.querySelectorAll(".view[data-view]"));
        const viewBySlug = new Map(views.map((view) => [view.getAttribute("data-view"), view]));
        const initialView = document.body.getAttribute("data-initial-view") || "home";
        let currentViewSlug = viewBySlug.has(initialView) ? initialView : "home";
        let previousViewSlug = "home";
        let savedHomeScrollY = 0;

        // Ensure history state reflects the initial view.
        if (window.history && window.history.replaceState) {
            window.history.replaceState(
                { view: currentViewSlug, homeScrollY: 0 },
                "",
                window.location.pathname + window.location.search
            );
        }

        function buildUrlForView(slug) {
            const search = window.location.search || "";
            if (!slug || slug === "home" || slug === "search") {
                return `/UserMenu${search}`;
            }
            return `/UserMenu/categorie/${encodeURIComponent(slug)}${search}`;
        }

        function updateDocumentTitle(slug) {
            const brand = window.RESTAURANT_NAME || "Le Patio Djerba";
            if (!slug || slug === "home") {
                document.title = `${brand} - Menu`;
                return;
            }
            const targetView = viewBySlug.get(slug);
            const label = targetView?.getAttribute("data-title") || slug;
            document.title = `${label} · ${brand} - Menu`;
        }

        function showView(slug, options = {}) {
            const targetSlug = viewBySlug.has(slug) ? slug : "home";
            const { pushHistory = true, restoreScroll = false } = options;

            if (targetSlug === currentViewSlug && !options.force) {
                if (targetSlug === "home" && !restoreScroll) {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                }
                return;
            }

            // Save scroll position when leaving the home categories screen.
            if (currentViewSlug === "home" && targetSlug !== "home") {
                savedHomeScrollY = window.scrollY || window.pageYOffset || 0;
            }

            if (currentViewSlug !== "search") {
                previousViewSlug = currentViewSlug;
            }

            views.forEach((view) => {
                const isTarget = view.getAttribute("data-view") === targetSlug;
                view.hidden = !isTarget;
                view.classList.toggle("is-entering", isTarget);
            });

            currentViewSlug = targetSlug;
            updateDocumentTitle(targetSlug);

            // Close navigation drawer if open.
            setDrawerOpen(false);

            if (pushHistory && window.history && window.history.pushState && targetSlug !== "search") {
                const nextUrl = buildUrlForView(targetSlug);
                if (nextUrl !== window.location.pathname + window.location.search) {
                    window.history.pushState(
                        { view: targetSlug, homeScrollY: savedHomeScrollY },
                        "",
                        nextUrl
                    );
                }
            }

            // Scroll positioning: restore saved scroll on return to home, or scroll to top on category open.
            if (targetSlug === "home" && restoreScroll) {
                requestAnimationFrame(() => {
                    window.scrollTo({ top: savedHomeScrollY, behavior: "instant" in window ? "instant" : "auto" });
                });
            } else {
                window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
            }

            if (targetSlug === "search") {
                const input = document.getElementById("searchInput");
                if (input) setTimeout(() => input.focus(), 50);
            }

            updateStickyCategoryBar();
            document.dispatchEvent(new CustomEvent("patio:viewchange", { detail: { view: targetSlug } }));
        }

        window.patioRouter = {
            show: (slug, opts) => showView(slug, opts),
            current: () => currentViewSlug,
        };

        window.addEventListener("popstate", (event) => {
            const stateView = event.state && event.state.view;
            if (stateView && viewBySlug.has(stateView)) {
                if (typeof event.state.homeScrollY === "number") {
                    savedHomeScrollY = event.state.homeScrollY;
                }
                showView(stateView, { pushHistory: false, restoreScroll: stateView === "home" });
                return;
            }
            const match = window.location.pathname.match(/\/UserMenu\/categorie\/([^/?#]+)/i);
            const slug = match ? decodeURIComponent(match[1]).toLowerCase() : "home";
            showView(slug, { pushHistory: false, restoreScroll: slug === "home" });
        });

        // Delegate clicks on category cards, back buttons, home links, and search buttons.
        document.addEventListener("click", (event) => {
            const universeLink = event.target.closest("[data-universe-link]");
            if (universeLink && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
                const slug = universeLink.getAttribute("data-universe-link");
                if (slug && viewBySlug.has(slug)) {
                    event.preventDefault();
                    showView(slug, { pushHistory: true, restoreScroll: false });
                    return;
                }
            }

            const backBtn = event.target.closest("[data-nav-back]");
            if (backBtn && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
                event.preventDefault();
                if (currentViewSlug === "search") {
                    showView(previousViewSlug || "home", { pushHistory: false, restoreScroll: previousViewSlug === "home" });
                } else {
                    showView("home", { pushHistory: true, restoreScroll: true });
                }
                return;
            }

            const homeBtn = event.target.closest("[data-nav-home]");
            if (homeBtn && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
                event.preventDefault();
                showView("home", { pushHistory: true, restoreScroll: false });
                return;
            }

            const searchOpenBtn = event.target.closest("[data-search-open]");
            if (searchOpenBtn) {
                event.preventDefault();
                showView("search", { pushHistory: false });
                return;
            }

            // Sub-category horizontal filter chips
            const chip = event.target.closest(".filters .chip[data-filter]");
            if (chip) {
                event.preventDefault();
                const parentView = chip.closest(".view-category");
                if (!parentView) return;
                const filterId = chip.getAttribute("data-filter");

                parentView.querySelectorAll(".filters .chip").forEach((c) => {
                    const active = c === chip;
                    c.classList.toggle("is-active", active);
                    c.setAttribute("aria-pressed", String(active));
                });

                parentView.querySelectorAll(".sub-section[data-sub]").forEach((section) => {
                    const match = filterId === "all" || section.getAttribute("data-sub") === filterId;
                    section.hidden = !match;
                });

                // Scroll smoothly to the top of the sheet if the user is far down.
                const sheet = parentView.querySelector(".cat-sheet");
                if (sheet) {
                    const rect = sheet.getBoundingClientRect();
                    if (rect.top < 0) {
                        window.scrollTo({ top: window.scrollY + rect.top - 12, behavior: "smooth" });
                    }
                }
            }
        });

        // ── Sticky compact category bar on scroll ────────────────────────
        function updateStickyCategoryBar() {
            if (currentViewSlug === "home" || currentViewSlug === "search") return;
            const activeView = viewBySlug.get(currentViewSlug);
            if (!activeView) return;
            const sticky = activeView.querySelector(".cat-sticky");
            if (!sticky) return;
            const scrolled = (window.scrollY || window.pageYOffset || 0) > 190;
            sticky.classList.toggle("is-stuck", scrolled);
        }
        window.addEventListener("scroll", updateStickyCategoryBar, { passive: true });

        // ── Navigation drawer ────────────────────────────────────────────
        const navDrawer = document.getElementById("navDrawer");
        const drawerOpenButtons = Array.from(document.querySelectorAll("[data-drawer-open]"));

        function setDrawerOpen(isOpen, restoreFocus = true) {
            if (!navDrawer) return;
            if (isOpen) {
                navDrawer.hidden = false;
                requestAnimationFrame(() => requestAnimationFrame(() => navDrawer.classList.add("is-open")));
                document.body.classList.add("has-overlay");
            } else {
                navDrawer.classList.remove("is-open");
                document.body.classList.remove("has-overlay");
                setTimeout(() => {
                    if (!navDrawer.classList.contains("is-open")) navDrawer.hidden = true;
                }, 280);
                if (restoreFocus && drawerOpenButtons[0]) drawerOpenButtons[0].focus();
            }
            drawerOpenButtons.forEach((btn) => btn.setAttribute("aria-expanded", String(isOpen)));
        }

        window.patioDrawer = { open: () => setDrawerOpen(true), close: (rf) => setDrawerOpen(false, rf) };

        document.addEventListener("click", (event) => {
            if (event.target.closest("[data-drawer-open]")) {
                event.preventDefault();
                setDrawerOpen(true);
                return;
            }
            if (event.target.closest("[data-drawer-close]")) {
                event.preventDefault();
                setDrawerOpen(false);
                return;
            }
            if (event.target.closest("[data-drawer-link]")) {
                setDrawerOpen(false, false);
            }
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                if (navDrawer && !navDrawer.hidden) {
                    setDrawerOpen(false);
                } else if (currentViewSlug === "search") {
                    showView(previousViewSlug || "home", { pushHistory: false, restoreScroll: previousViewSlug === "home" });
                }
            }
        });

        // ── Client-side search across all products ───────────────────────
        const searchInput = document.getElementById("searchInput");
        const searchClear = document.getElementById("searchClear");
        const searchHint = document.getElementById("searchHint");
        const searchEmpty = document.getElementById("searchEmpty");
        const searchResults = document.getElementById("searchResults");
        const sourceCards = Array.from(document.querySelectorAll(".view-category .product-card")).map((card) => {
            const title = card.querySelector(".pc-title")?.textContent || "";
            const desc = card.querySelector(".pc-desc")?.textContent || "";
            const cat = card.getAttribute("data-category") || "";
            return {
                card,
                category: cat,
                haystack: normalizeText(`${title} ${desc} ${cat}`),
            };
        });

        function runSearch(rawQuery) {
            if (!searchResults) return;
            const query = normalizeText(rawQuery);
            searchResults.innerHTML = "";

            if (searchClear) searchClear.hidden = !query;

            if (!query) {
                if (searchHint) searchHint.hidden = false;
                if (searchEmpty) searchEmpty.hidden = true;
                return;
            }

            if (searchHint) searchHint.hidden = true;
            const terms = query.split(/\s+/).filter(Boolean);
            const matches = sourceCards.filter((entry) => terms.every((term) => entry.haystack.includes(term)));

            if (searchEmpty) searchEmpty.hidden = matches.length > 0;

            const fragment = document.createDocumentFragment();
            matches.forEach(({ card, category }) => {
                const clone = card.cloneNode(true);
                const body = clone.querySelector(".pc-body");
                if (body && category) {
                    const catPill = document.createElement("span");
                    catPill.className = "pc-cat-pill";
                    catPill.textContent = category;
                    body.insertBefore(catPill, body.firstChild);
                }
                fragment.appendChild(clone);
            });
            searchResults.appendChild(fragment);
        }

        if (searchInput) {
            searchInput.addEventListener("input", () => runSearch(searchInput.value));
        }
        if (searchClear && searchInput) {
            searchClear.addEventListener("click", () => {
                searchInput.value = "";
                runSearch("");
                searchInput.focus();
            });
        }

        // ── Restore saved language preference ────────────────────────────
        let savedLang = "fr";
        try {
            savedLang = localStorage.getItem("kaffaLang") || "fr";
        } catch (e) {}
        window.changeLanguage(savedLang);
    });
})();

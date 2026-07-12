document.addEventListener("DOMContentLoaded", function () {
    const categoryLinks = Array.from(document.querySelectorAll(".dashboard-menu .menu-item"));
    const sections = Array.from(document.querySelectorAll(".menu-category-section"));
    const cards = Array.from(document.querySelectorAll(".dashboard-card"));
    const searchInput = document.querySelector(".search-bar input");
    const noResults = document.querySelector(".no-results");

    function setActiveLink(link) {
        categoryLinks.forEach((categoryLink) => categoryLink.classList.remove("active"));
        if (link) {
            link.classList.add("active");
        }
    }

    categoryLinks.forEach((link) => {
        link.addEventListener("click", function (event) {
            event.preventDefault();
            const targetId = link.getAttribute("href");
            const target = targetId === "#all-products"
                ? document.querySelector(".menu-heading")
                : document.querySelector(targetId);

            setActiveLink(link);
            if (target) {
                target.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        });
    });

    function applySearch() {
        const query = (searchInput?.value || "").trim().toLowerCase();
        let visibleCount = 0;

        sections.forEach((section) => {
            let sectionHasVisibleCards = false;
            const sectionCards = Array.from(section.querySelectorAll(".dashboard-card"));

            sectionCards.forEach((card) => {
                const title = (card.dataset.title || card.querySelector("h4")?.textContent || "").toLowerCase();
                const category = (card.dataset.category || "").toLowerCase();
                const description = (card.querySelector(".card-detail p")?.textContent || "").toLowerCase();
                const isVisible = !query || title.includes(query) || category.includes(query) || description.includes(query);

                card.hidden = !isVisible;
                if (isVisible) {
                    sectionHasVisibleCards = true;
                    visibleCount += 1;
                }
            });

            section.hidden = !sectionHasVisibleCards;
        });

        if (noResults) {
            noResults.hidden = visibleCount !== 0;
        }
    }

    if (searchInput) {
        searchInput.addEventListener("input", applySearch);
    }

    applySearch();
});

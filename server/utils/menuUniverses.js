// ─────────────────────────────────────────────────────────────────────────────
// Le Patio Djerba — public menu "universes"
//
// The admin manages flat categories (Category.title). On the public menu we
// group them into large photographic "universes" (Petit Déjeuner, Plats,
// Boissons, Douceurs). Each existing category becomes a sub-category filter
// inside its universe.
//
// Any category that does not match a universe rule (e.g. a new category
// created from the admin) is displayed automatically as its own universe card,
// using the photo of its first product as cover.
// ─────────────────────────────────────────────────────────────────────────────

const PLACEHOLDER_DESCRIPTION = /^\s*imported from\b/i;

const UNIVERSE_DEFINITIONS = [
    {
        slug: 'petit-dejeuner',
        label: 'Petit Déjeuner',
        i18nKey: 'uniBreakfast',
        tagline: 'Bien commencer la journée',
        description: 'Formules du matin, viennoiseries dorées et brunchs à partager, servis chaque jour.',
        icon: 'fa-coffee',
        cover: '/images/patio/cat-petit-dejeuner.jpg',
        match: /\b(petit[\s-]*dej|viennoiser|brunch|breakfast)/,
    },
    {
        slug: 'plats',
        label: 'Plats',
        i18nKey: 'uniDishes',
        tagline: 'Saveurs généreuses',
        description: 'Plats, burgers, sandwichs et saveurs salées préparés à la minute avec des produits frais.',
        icon: 'fa-utensils',
        cover: '/images/patio/cat-plats.jpg',
        match: /\b(plat|burger|sandwich|sale|salade|pizza|pate|pasta|tacos|entree|grill|poisson|viande|couscous|menu enfant)/,
    },
    {
        slug: 'boissons',
        label: 'Boissons',
        i18nKey: 'uniDrinks',
        tagline: 'Fraîcheur & caféine',
        description: 'Cafés, jus frais, smoothies, mocktails et boissons fraîches pour toutes les envies.',
        icon: 'fa-cocktail',
        cover: '/images/patio/cat-boissons.jpg',
        match: /\b(boisson|cafe|coffee|jus|smoothie|milk\s*shake|mocktail|cocktail|citronnade|iced?\s*tea|thes?\b|eaux?\b|frap|soda|gazeu|infusion|drink)/,
    },
    {
        slug: 'douceurs',
        label: 'Douceurs',
        i18nKey: 'uniSweets',
        tagline: 'Pause sucrée',
        description: 'Crêpes, gaufres, pancakes et desserts maison pour une parenthèse gourmande.',
        icon: 'fa-ice-cream',
        cover: '/images/patio/cat-douceurs.jpg',
        match: /\b(douceur|delice|dessert|patiss|gateau|glace|crepe|gaufre|waffle|pancake|sucre)/,
    },
];

// Order of evaluation matters: "Cafés glacés" must land in Boissons, not
// Douceurs, so drinks are tested before sweets.
const MATCH_ORDER = ['petit-dejeuner', 'boissons', 'plats', 'douceurs'];

function normalizeText(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function slugify(value) {
    return normalizeText(value)
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'categorie';
}

function cleanDescription(value) {
    const text = String(value || '').trim();
    return PLACEHOLDER_DESCRIPTION.test(text) ? '' : text;
}

// "Petit dej sucré 9h__12h" → { title: "Petit dej sucré", hours: "9h – 12h" }
function splitServingHours(title) {
    const raw = String(title || '').trim();
    const match = raw.match(/^(.*?)\s+([\dh.:]*\d[\dh.:]*)\s*_{1,}\s*([\dh.:]*\d[\dh.:]*)\s*$/i);
    if (!match || !match[1]) {
        return { title: raw, hours: '' };
    }
    const tidy = (part) => {
        let value = part.replace(/:/g, '.');
        // "7h.30" → "7h30", "10.30h" → "10h30", "12" → "12h"
        value = value.replace(/h\.(\d)/i, 'h$1');
        value = value.replace(/^(\d{1,2})\.(\d{2})h?$/i, '$1h$2');
        if (!/h/i.test(value)) value = `${value}h`;
        return value.toLowerCase();
    };
    return { title: match[1].trim(), hours: `${tidy(match[2])} – ${tidy(match[3])}` };
}

function findUniverseSlug(categoryTitle) {
    const normalized = normalizeText(categoryTitle);
    for (const slug of MATCH_ORDER) {
        const definition = UNIVERSE_DEFINITIONS.find((u) => u.slug === slug);
        if (definition && definition.match.test(normalized)) {
            return slug;
        }
    }
    return null;
}

/**
 * Builds the list of universes displayed on the public menu.
 * @param {Array} categorySections sections built by buildUserMenuViewData
 *        ({ title, sectionId, items, itemCount, description? }).
 * @param {String} activeSlug slug of the universe opened on first render.
 */
function buildMenuUniverses(categorySections, activeSlug) {
    const grouped = new Map(UNIVERSE_DEFINITIONS.map((definition) => [definition.slug, []]));
    const standalone = [];

    (categorySections || []).forEach((section) => {
        const slug = findUniverseSlug(section.title);
        if (slug) {
            grouped.get(slug).push(section);
        } else {
            standalone.push(section);
        }
    });

    const decorateSubcategories = (sections) => sections.map((section) => ({
        title: section.title,
        filterId: section.sectionId,
        itemCount: section.itemCount,
        items: section.items,
    }));

    const universes = [];
    const takenSlugs = new Set(UNIVERSE_DEFINITIONS.map((u) => u.slug));

    // Keep the order requested for the main universes.
    UNIVERSE_DEFINITIONS.forEach((definition) => {
        const sections = grouped.get(definition.slug);
        if (!sections.length) return;
        const itemCount = sections.reduce((sum, s) => sum + s.itemCount, 0);
        universes.push({
            slug: definition.slug,
            label: definition.label,
            i18nKey: definition.i18nKey,
            tagline: definition.tagline,
            description: definition.description,
            icon: definition.icon,
            cover: definition.cover,
            itemCount,
            subcategories: decorateSubcategories(sections),
        });
    });

    // New / unmatched admin categories → automatic universe cards.
    standalone.forEach((section) => {
        let slug = slugify(section.title);
        while (takenSlugs.has(slug)) slug = `${slug}-1`;
        takenSlugs.add(slug);
        const firstWithImage = section.items.find((item) => item.imageUrl);
        universes.push({
            slug,
            label: section.title,
            i18nKey: '',
            tagline: `${section.itemCount} produit${section.itemCount > 1 ? 's' : ''}`,
            description: cleanDescription(section.description) || 'Découvrez notre sélection.',
            icon: 'fa-concierge-bell',
            cover: firstWithImage ? firstWithImage.imageUrl : '/images/patio/hero-djerba.jpg',
            itemCount: section.itemCount,
            subcategories: decorateSubcategories([section]),
        });
    });

    universes.forEach((universe) => {
        universe.hasFilters = universe.subcategories.length > 1;
        universe.isActive = universe.slug === activeSlug;
        universe.subcategoryCount = universe.subcategories.length;
    });

    return universes;
}

module.exports = {
    buildMenuUniverses,
    cleanDescription,
    splitServingHours,
    slugify,
};

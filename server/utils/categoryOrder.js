function sortMenuCategories(categories) {
    const rank = category => typeof category.menuOrder === 'number' && Number.isFinite(category.menuOrder) && category.menuOrder >= 0 ? category.menuOrder : Infinity;
    // Keep legacy categories in their existing relative order until an admin saves a layout.
    return [...categories].sort((left, right) => rank(left) === rank(right) ? 0 : rank(left) - rank(right));
}

module.exports = { sortMenuCategories };

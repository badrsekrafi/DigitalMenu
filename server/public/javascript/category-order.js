document.addEventListener('DOMContentLoaded', () => {
    const body = document.getElementById('categoryOrderRows');
    if (!body) return;
    const save = document.getElementById('saveCategoryOrder');
    const cancel = document.getElementById('cancelCategoryOrder');
    const message = document.getElementById('categoryOrderMessage');
    const rows = () => [...body.querySelectorAll('tr[data-id]')];
    const ids = () => rows().map(row => row.dataset.id);
    let savedIds = ids();
    let busy = false;
    let dragged = null;
    function update() {
        const current = rows();
        current.forEach((row, index) => {
            const input = row.querySelector('.category-position');
            if (input.options.length !== current.length) input.replaceChildren(...current.map((_, position) => new Option(String(position + 1), String(position + 1))));
            input.value = index + 1;
            input.disabled = busy;
            row.querySelector('[data-category-move="up"]').disabled = busy || index === 0;
            row.querySelector('[data-category-move="down"]').disabled = busy || index === current.length - 1;
            row.querySelector('.category-drag-handle').disabled = busy;
            row.querySelector('.category-drag-handle').draggable = !busy;
        });
        const changed = JSON.stringify(ids()) !== JSON.stringify(savedIds);
        save.disabled = busy || !changed;
        cancel.disabled = busy || !changed;
        return changed;
    }
    function moved() {
        const changed = update();
        message.classList.remove('is-error');
        message.textContent = changed ? 'Nouvel ordre prêt. Enregistrez pour l’appliquer au menu client.' : '';
    }
    body.addEventListener('click', event => {
        const button = event.target.closest('[data-category-move]');
        if (!button || busy) return;
        const row = button.closest('tr[data-id]');
        const other = button.dataset.categoryMove === 'up' ? row.previousElementSibling : row.nextElementSibling;
        if (!other) return;
        if (button.dataset.categoryMove === 'up') body.insertBefore(row, other);
        else body.insertBefore(other, row);
        moved();
    });
    body.addEventListener('change', event => {
        if (!event.target.matches('.category-position') || busy) return;
        const position = Number(event.target.value);
        const current = rows();
        if (!Number.isInteger(position) || position < 1 || position > current.length) {
            update();
            message.textContent = `Choisissez une position entre 1 et ${current.length}.`;
            return;
        }
        const row = event.target.closest('tr[data-id]');
        const rest = current.filter(value => value !== row);
        body.insertBefore(row, rest[position - 1] || null);
        moved();
    });
    body.addEventListener('dragstart', event => {
        if (busy || !event.target.closest('.category-drag-handle')) return event.preventDefault();
        dragged = event.target.closest('tr[data-id]');
        dragged.classList.add('is-dragging');
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', dragged.dataset.id);
    });
    body.addEventListener('dragover', event => {
        const row = event.target.closest('tr[data-id]');
        if (!dragged || busy || !row) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        if (row === dragged) return;
        const rect = row.getBoundingClientRect();
        body.insertBefore(dragged, event.clientY < rect.top + rect.height / 2 ? row : row.nextElementSibling);
        moved();
    });
    body.addEventListener('drop', event => { if (dragged) event.preventDefault(); });
    body.addEventListener('dragend', () => {
        if (dragged) dragged.classList.remove('is-dragging');
        dragged = null;
        moved();
    });
    cancel.addEventListener('click', () => {
        if (busy) return;
        const byId = new Map(rows().map(row => [row.dataset.id, row]));
        savedIds.forEach(id => { if (byId.has(id)) body.appendChild(byId.get(id)); });
        moved();
    });
    save.addEventListener('click', async () => {
        if (busy) return;
        busy = true;
        update();
        message.classList.remove('is-error');
        message.textContent = 'Enregistrement de l’ordre…';
        try {
            const response = await fetch('/api/categories/order', {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ categoryIds: ids() }),
            });
            const data = await response.json();
            if (response.status === 401) {
                message.textContent = 'Votre session a expiré. Reconnectez-vous puis revenez ici pour enregistrer cet ordre. ';
                const link = document.createElement('a');
                link.href = '/login?returnTo=%2FCategories';
                link.target = '_blank';
                link.rel = 'noopener';
                link.textContent = 'Se reconnecter';
                message.appendChild(link);
                message.classList.add('is-error');
                return;
            }
            if (!response.ok) throw new Error(data.error || 'Enregistrement impossible.');
            savedIds = data.categoryIds;
            message.textContent = 'Ordre enregistré. Le menu client utilise cette disposition.';
        } catch (error) {
            message.textContent = error.message;
            message.classList.add('is-error');
        } finally { busy = false; update(); }
    });
    document.addEventListener('categories:deleted', event => {
        savedIds = savedIds.filter(id => id !== event.detail.id);
        moved();
    });
    update();
});

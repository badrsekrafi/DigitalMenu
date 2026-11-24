document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('catalogEditor');
    if (!form) return;
    const editing = form.dataset.editing === 'true';
    const product = form.dataset.editor === 'product';
    const returnUrl = product ? '/Menu_Dishes' : '/Categories';
    const message = document.getElementById('editorMessage');
    const availability = document.getElementById('dishAvailability');
    if (availability) availability.addEventListener('change', () => {
        document.getElementById('dishAvailabilityLabel').textContent = availability.checked ? 'Disponible' : 'Épuisé';
    });
    form.querySelector('[data-editor-cancel]').addEventListener('click', () => { window.location.href = returnUrl; });
    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (!form.reportValidity()) return;
        const button = form.querySelector('[type="submit"]');
        button.disabled = true;
        message.textContent = 'Enregistrement…';
        message.classList.remove('field-error');
        try {
            let body;
            let headers = {};
            if (product) {
                body = new FormData(form);
                body.set('isAvailable', String(availability.checked));
                const image = form.querySelector('[name="image"]').files[0];
                if (!image) body.delete('image');
                if (image && image.size > 5 * 1024 * 1024) throw new Error('Choisissez une image de moins de 5 Mo.');
            } else {
                headers['Content-Type'] = 'application/json';
                body = JSON.stringify({ title: form.elements.title.value.trim(), description: form.elements.description.value.trim() });
            }
            const url = editing ? `/api/${product ? 'menu-items' : 'categories'}/${encodeURIComponent(form.dataset.id)}` : returnUrl + '_add';
            const response = await fetch(url, { method: editing ? 'PUT' : 'POST', headers, body });
            const data = response.headers.get('content-type')?.includes('application/json') ? await response.json() : await response.text();
            if (response.status === 401) {
                message.textContent = 'Votre session a expiré. Connectez-vous, puis revenez ici pour enregistrer vos modifications. ';
                const reconnect = document.createElement('a');
                reconnect.href = `/login?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`;
                reconnect.target = '_blank';
                reconnect.rel = 'noopener';
                reconnect.textContent = 'Se reconnecter';
                message.appendChild(reconnect);
                message.classList.add('field-error');
                button.disabled = false;
                return;
            }
            if (!response.ok) throw new Error(data.error || (typeof data === 'string' ? data : 'Enregistrement impossible.'));
            window.location.href = returnUrl;
        } catch (error) {
            message.textContent = error.message;
            message.classList.add('field-error');
            button.disabled = false;
        }
    });
});

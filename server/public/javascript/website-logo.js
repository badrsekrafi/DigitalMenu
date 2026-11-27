document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('websiteLogoForm');
    if (!form) return;
    const input = document.getElementById('websiteLogo');
    const preview = document.getElementById('websiteLogoPreview');
    const button = document.getElementById('saveWebsiteLogo');
    const message = document.getElementById('websiteLogoMessage');
    const savedSource = () => `/images/logo.png?v=${Date.now()}`;
    let previewUrl;
    function releasePreview() { if (previewUrl) URL.revokeObjectURL(previewUrl); previewUrl = null; }
    input.addEventListener('change', () => {
        releasePreview();
        const file = input.files[0];
        message.textContent = '';
        message.classList.remove('field-error');
        button.disabled = !file;
        if (!file) { preview.src = savedSource(); return; }
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
            input.value = '';
            button.disabled = true;
            preview.src = savedSource();
            message.textContent = 'Choisissez un logo PNG, JPG ou WEBP de moins de 5 Mo.';
            message.classList.add('field-error');
            return;
        }
        previewUrl = URL.createObjectURL(file);
        preview.src = previewUrl;
    });
    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (!form.reportValidity()) return;
        button.disabled = true;
        const body = new FormData(form);
        input.disabled = true;
        message.classList.remove('field-error');
        message.textContent = 'Enregistrement du logo…';
        try {
            const response = await fetch('/api/settings/logo', { method: 'POST', body });
            const data = await response.json();
            if (response.status === 401) {
                message.textContent = 'Votre session a expiré. Reconnectez-vous puis réessayez. ';
                const link = document.createElement('a');
                link.href = '/login?returnTo=%2FSettings'; link.target = '_blank'; link.rel = 'noopener'; link.textContent = 'Se reconnecter';
                message.appendChild(link);
                message.classList.add('field-error');
                return;
            }
            if (!response.ok) throw new Error(data.error || 'Enregistrement impossible.');
            releasePreview();
            input.value = '';
            preview.src = data.logoUrl;
            document.querySelectorAll('img[src^="/images/logo.png"], link[rel="icon"]').forEach(element => {
                if (element.tagName === 'IMG') element.src = data.logoUrl;
                else element.href = data.logoUrl;
            });
            message.textContent = 'Logo enregistré. Il est maintenant utilisé sur le site.';
        } catch (error) { message.textContent = error.message; message.classList.add('field-error'); }
        finally { input.disabled = false; button.disabled = !input.files.length; }
    });
    window.addEventListener('pagehide', releasePreview);
});

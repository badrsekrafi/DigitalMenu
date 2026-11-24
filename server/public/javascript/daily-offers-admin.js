document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('dailyOfferForm');
    if (!form) return;
    const day = document.getElementById('offerDay');
    const search = document.getElementById('offerProductSearch');
    const message = document.getElementById('dailyOfferMessage');
    const checks = [...form.querySelectorAll('[name="offerItem"]')];
    const save = document.getElementById('saveDailyOffer');
    let loadedDay = day.value;
    let loading = false;
    let requestNumber = 0;
    const selected = () => checks.filter(check => check.checked).map(check => check.value);
    const updateCount = () => { document.getElementById('offerSelectedCount').textContent = `${selected().length} produit(s) sélectionné(s)`; };
    const showMessage = (text, error = false) => {
        message.textContent = text;
        message.classList.toggle('is-error', error);
    };
    form.addEventListener('change', updateCount);
    search.addEventListener('input', () => {
        const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        const query = normalize(search.value.trim());
        let visible = 0;
        form.querySelectorAll('[data-offer-search]').forEach(option => {
            option.hidden = !normalize(option.dataset.offerSearch).includes(query);
            if (!option.hidden) visible++;
        });
        document.getElementById('offerSearchEmpty').hidden = visible !== 0;
    });
    document.getElementById('clearDailyOffer').addEventListener('click', () => {
        checks.forEach(check => { check.checked = false; });
        updateCount();
        showMessage('Enregistrez pour retirer la sélection de cette date.');
    });
    day.addEventListener('change', async () => {
        const request = ++requestNumber;
        loading = true;
        save.disabled = true;
        showMessage('Chargement de la sélection…');
        try {
            const response = await fetch(`/api/daily-offers?day=${encodeURIComponent(day.value)}`);
            const data = await response.json();
            if (request !== requestNumber) return;
            if (!response.ok) throw new Error(data.error || 'Chargement impossible.');
            checks.forEach(check => { check.checked = data.itemIds.includes(check.value); });
            loadedDay = data.day;
            updateCount();
            showMessage('Sélection chargée.');
        } catch (error) {
            if (request === requestNumber) {
                day.value = loadedDay;
                showMessage(error.message, true);
            }
        } finally {
            if (request === requestNumber) { loading = false; save.disabled = false; }
        }
    });
    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (loading || day.value !== loadedDay) return;
        save.disabled = true;
        day.disabled = true;
        const itemIds = selected();
        showMessage('Enregistrement…');
        try {
            const response = await fetch('/api/daily-offers', {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ day: day.value, itemIds }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Enregistrement impossible.');
            showMessage(itemIds.length ? 'Sélection enregistrée. Elle apparaît dans le menu à la date choisie.' : 'Sélection retirée pour cette date.');
        } catch (error) { showMessage(error.message, true); }
        finally { save.disabled = false; day.disabled = false; }
    });
});

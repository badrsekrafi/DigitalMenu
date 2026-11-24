document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('deliveryOrderGrid');
    if (!grid || grid.closest('[data-delivery-access]').dataset.deliveryAccess !== 'true') return;
    const template = document.getElementById('deliveryOrderTemplate');
    const message = document.getElementById('deliveryDashboardMessage');
    let busy = false;
    let previous = '';
    function render(orders) {
        const signature = JSON.stringify(orders);
        if (signature === previous) return;
        previous = signature;
        grid.replaceChildren(...orders.map(order => {
            const card = template.content.firstElementChild.cloneNode(true);
            card.dataset.deliveryId = order.id;
            for (const [key, value] of Object.entries({ reference: `#${order.orderIdDisplay}`, created: order.created, name: order.name, phone: order.phone, address: order.address, comment: order.comment, total: `${order.total} DT` })) {
                card.querySelector(`[data-delivery-${key}]`).textContent = value || '';
            }
            const list = card.querySelector('[data-delivery-items]');
            list.replaceChildren(...order.items.map(item => {
                const li = document.createElement('li');
                li.textContent = `${item.quantity} × ${item.name} · ${item.status}`;
                return li;
            }));
            card.querySelector('[data-delivery-details]').href = `/Orders#order-${encodeURIComponent(order.id)}`;
            card.querySelector('[data-delivery-complete]').dataset.deliveryComplete = order.id;
            return card;
        }));
        document.getElementById('deliveryOrderCount').textContent = orders.length;
        document.getElementById('deliveryOrdersEmpty').hidden = orders.length !== 0;
    }
    async function refresh() {
        const response = await fetch('/api/delivery-orders');
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Chargement impossible.');
        render(data.orders);
    }
    grid.addEventListener('click', async event => {
        const button = event.target.closest('[data-delivery-complete]');
        if (!button || busy) return;
        if (!confirm('Marquer cette commande comme livrée et la clôturer ?')) return;
        busy = true;
        button.disabled = true;
        try {
            const response = await fetch(`/api/orders/${encodeURIComponent(button.dataset.deliveryComplete)}/delivered`, { method: 'PATCH' });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Mise à jour impossible.');
            await refresh();
            message.textContent = 'Commande marquée comme livrée.';
        } catch (error) { message.textContent = error.message; button.disabled = false; }
        finally { busy = false; }
    });
    // Refresh only the delivery cards; leave table configuration forms untouched.
    setInterval(async () => {
        if (document.hidden || busy) return;
        busy = true;
        try { await refresh(); }
        catch (error) { message.textContent = 'Actualisation indisponible. Les dernières commandes restent affichées.'; }
        finally { busy = false; }
    }, 15000);
});

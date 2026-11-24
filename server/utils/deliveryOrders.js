function buildDeliveryCards(orders) {
    return orders.filter(order => order.serviceType === 'delivery' && order.status !== 'closed').map(order => ({
        id: String(order._id),
        orderIdDisplay: String(order._id).slice(-6).toUpperCase(),
        name: order.name,
        phone: order.PhoneNumber,
        address: order.deliveryAddress,
        comment: order.comment || '',
        total: Number(order.totalPrice || 0).toFixed(2),
        created: order.createdAt ? new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Tunis', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(order.createdAt)) : '',
        items: (order.items || []).map(item => ({
            name: item.itemName, quantity: item.itemQty || 1,
            status: ({ pending: 'En attente', en_cours: 'En préparation', pret: 'Prêt', cancel: 'Annulé' })[item.status] || 'En attente',
        })),
    }));
}

module.exports = { buildDeliveryCards };

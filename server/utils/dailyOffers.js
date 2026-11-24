// Calendar days follow the restaurant's timezone, independently of the server.
function restaurantDay(date = new Date()) {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Africa/Tunis', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(date);
}

function isValidDay(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T12:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

module.exports = { restaurantDay, isValidDay };

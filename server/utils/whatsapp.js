const ADMIN_WHATSAPP_NUMBER = "21627648386"; // Admin WhatsApp number: +216 27 648 386

/**
 * Formats phone number into international format (+216 Tunisia default)
 */
function formatWhatsAppNumber(phone) {
    if (!phone) return null;
    let clean = String(phone).replace(/\D/g, '');
    if (clean.length === 8) {
        clean = '216' + clean; // Add Tunisia country code (+216)
    }
    return clean.length >= 10 ? clean : null;
}

/**
 * Generates direct wa.me WhatsApp link
 */
function getWhatsAppClickLink(phone, message = '') {
    const formatted = formatWhatsAppNumber(phone);
    if (!formatted) return null;
    return `https://wa.me/${formatted}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
}

/**
 * Sends automated WhatsApp notification message
 */
async function sendWhatsAppMessage(phone, message) {
    const formatted = formatWhatsAppNumber(phone);
    if (!formatted || !message) return;

    console.log(`[WhatsApp Dispatch -> +${formatted}]:\n${message}\n---`);

    try {
        const encodedText = encodeURIComponent(message);
        // Optional free CallMeBot / Gateway HTTP request
        const gatewayUrl = `https://api.callmebot.com/whatsapp.php?phone=+${formatted}&text=${encodedText}&apikey=123456`;
        if (typeof fetch !== 'undefined') {
            fetch(gatewayUrl).catch(() => {});
        }
    } catch (e) {
        // Ignore background HTTP errors
    }
}

module.exports = {
    ADMIN_WHATSAPP_NUMBER,
    formatWhatsAppNumber,
    getWhatsAppClickLink,
    sendWhatsAppMessage,
};

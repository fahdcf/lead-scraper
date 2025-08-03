/**
 * Extract Moroccan phone numbers from HTML content
 * @param {string} html - HTML content to search
 * @returns {string[]} - Array of unique valid Moroccan phone numbers
 */
export function extractPhones(html) {
  if (!html || typeof html !== 'string') {
    return [];
  }

  // Moroccan phone regex pattern (same as n8n workflow)
  // Matches: +2126XXXXXXXX, +2127XXXXXXXX, 06XXXXXXXX, 07XXXXXXXX
  const phoneRegex = /(?:(?:\+212|0)(6|7)\d{8})/g;
  
  const matches = html.match(phoneRegex) || [];
  const uniquePhones = [...new Set(matches)];
  
  // Filter out invalid phone numbers
  const validPhones = uniquePhones.filter(phone => isValidPhone(phone));
  
  return validPhones;
}

/**
 * Validate Moroccan phone number
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if phone is valid
 */
function isValidPhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return false;
  }

  // Moroccan phone validation regex
  const phoneRegex = /^(?:\+212|0)(6|7)\d{8}$/;
  
  return phoneRegex.test(phone);
} 
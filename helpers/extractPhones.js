/**
 * Extract Moroccan phone numbers from HTML content with enhanced patterns
 * @param {string} html - HTML content to search
 * @returns {string[]} - Array of unique valid Moroccan phone numbers
 */
export function extractPhones(html) {
  if (!html || typeof html !== 'string') {
    return [];
  }

  // Enhanced Moroccan phone regex patterns
  const phonePatterns = [
    // Standard Moroccan format: +2126XXXXXXXX, +2127XXXXXXXX
    /(?:\+212|00212)\s*(6|7)\d{8}/g,
    
    // Local format: 06XXXXXXXX, 07XXXXXXXX
    /(?<!\d)(06|07)\d{8}(?!\d)/g,
    
    // Formatted numbers: 06 XX XX XX XX, 07 XX XX XX XX
    /(06|07)\s*\d{2}\s*\d{2}\s*\d{2}\s*\d{2}/g,
    
    // With parentheses: (06) XXXXXXXX, (07) XXXXXXXX
    /\(?(06|07)\)?\s*\d{8}/g,
    
    // International format with spaces: +212 6 XX XX XX XX
    /\+212\s*(6|7)\s*\d{2}\s*\d{2}\s*\d{2}\s*\d{2}/g,
    
    // With dashes: 06-XX-XX-XX-XX, 07-XX-XX-XX-XX
    /(06|07)-\d{2}-\d{2}-\d{2}-\d{2}/g,
    
    // In tel: links
    /tel:(\+212|0)(6|7)\d{8}/gi,
    
    // In contact forms (data attributes)
    /data-phone="(\+212|0)(6|7)\d{8}"/gi,
    
    // In JSON-like structures
    /"phone"\s*:\s*"(\+212|0)(6|7)\d{8}"/gi,
    
    // With country code variations
    /(?:212|00212)\s*(6|7)\d{8}/g,
    
    // With dots: 06.XX.XX.XX.XX, 07.XX.XX.XX.XX
    /(06|07)\.\d{2}\.\d{2}\.\d{2}\.\d{2}/g
  ];
  
  const allPhones = new Set();
  
  // Extract phones using all patterns
  phonePatterns.forEach(pattern => {
    const matches = html.match(pattern) || [];
    matches.forEach(match => {
      // Clean up the phone number
      let cleanPhone = match;
      
      // Remove tel: prefix
      if (cleanPhone.startsWith('tel:')) {
        cleanPhone = cleanPhone.replace('tel:', '');
      }
      
      // Remove data attributes
      if (cleanPhone.includes('data-phone="')) {
        cleanPhone = cleanPhone.match(/data-phone="([^"]+)"/)?.[1] || cleanPhone;
      }
      
      // Remove JSON structure
      if (cleanPhone.includes('"phone"')) {
        cleanPhone = cleanPhone.match(/"phone"\s*:\s*"([^"]+)"/)?.[1] || cleanPhone;
      }
      
      // Remove all formatting (spaces, dashes, dots, parentheses)
      cleanPhone = cleanPhone.replace(/[\s\-\.\(\)]/g, '');
      
      // Standardize to +212 format
      if (cleanPhone.startsWith('06') || cleanPhone.startsWith('07')) {
        cleanPhone = '+212' + cleanPhone.substring(1);
      } else if (cleanPhone.startsWith('00212')) {
        cleanPhone = '+' + cleanPhone.substring(1);
      } else if (cleanPhone.startsWith('212') && !cleanPhone.startsWith('+')) {
        cleanPhone = '+' + cleanPhone;
      }
      
      if (isValidPhone(cleanPhone)) {
        allPhones.add(cleanPhone);
      }
    });
  });
  
  return Array.from(allPhones);
}

/**
 * Validate Moroccan phone number with enhanced validation
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if phone is valid
 */
export function isValidPhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return false;
  }

  // Enhanced Moroccan phone validation regex
  const phoneRegex = /^\+212(6|7)\d{8}$/;
  
  if (!phoneRegex.test(phone)) {
    return false;
  }

  // Additional validation: check for common invalid patterns
  const invalidPatterns = [
    /^\+212(6|7)0{8}$/, // All zeros
    /^\+212(6|7)1{8}$/, // All ones
    /^\+212(6|7)12345678$/, // Sequential
    /^\+212(6|7)87654321$/, // Reverse sequential
  ];
  
  for (const pattern of invalidPatterns) {
    if (pattern.test(phone)) {
      return false;
    }
  }

  return true;
} 
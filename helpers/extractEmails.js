import { config } from '../config.js';

/**
 * Extract email addresses from HTML content
 * @param {string} html - HTML content to search
 * @returns {string[]} - Array of unique valid email addresses
 */
export function extractEmails(html) {
  if (!html || typeof html !== 'string') {
    return [];
  }

  // Email regex pattern (same as n8n workflow)
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(?!png|jpg|gif|jpeg)[a-zA-Z]{2,}/gi;
  
  const matches = html.match(emailRegex) || [];
  const uniqueEmails = [...new Set(matches)];
  
  // Filter out invalid emails and excluded domains
  const validEmails = uniqueEmails.filter(email => isValidEmail(email));
  
  return validEmails;
}

/**
 * Validate email address and check against exclusion patterns
 * @param {string} email - Email address to validate
 * @returns {boolean} - True if email is valid and not excluded
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // Basic email validation regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  if (!emailRegex.test(email)) {
    return false;
  }

  // Check against excluded patterns
  for (const pattern of config.excludedEmailPatterns) {
    if (pattern.test(email)) {
      return false;
    }
  }

  return true;
} 
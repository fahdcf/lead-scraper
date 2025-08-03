import axios from 'axios';
import { config } from '../config.js';

/**
 * Fetch HTML content from a URL with proper headers and error handling
 * @param {string} url - The URL to fetch
 * @returns {Promise<string|null>} - HTML content or null if failed
 */
export async function fetchPage(url) {
  try {
    const response = await axios.get(url, {
      timeout: config.http.timeout,
      headers: {
        'User-Agent': config.http.userAgent,
        'Accept-Language': config.http.acceptLanguage,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      maxRedirects: 5,
      validateStatus: function (status) {
        return status >= 200 && status < 400; // Accept 2xx and 3xx status codes
      }
    });

    return response.data;
  } catch (error) {
    console.error(`❌ Failed to fetch ${url}:`, error.message);
    return null;
  }
}

/**
 * Add delay between requests to avoid being blocked
 * @param {number} ms - Milliseconds to wait
 */
export function delay(ms = config.http.delayBetweenRequests) {
  return new Promise(resolve => setTimeout(resolve, ms));
} 
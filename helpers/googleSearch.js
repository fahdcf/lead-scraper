import axios from 'axios';
import { config } from '../config.js';
import chalk from 'chalk';

/**
 * Get current API key and rotate to next if needed
 * @returns {string} Current API key
 */
function getCurrentApiKey() {
  const currentKey = config.googleSearch.apiKeys[config.googleSearch.currentKeyIndex];
  return currentKey;
}

/**
 * Rotate to next API key when quota is exceeded
 */
function rotateApiKey() {
  config.googleSearch.currentKeyIndex = (config.googleSearch.currentKeyIndex + 1) % config.googleSearch.apiKeys.length;
  console.log(`🔄 Rotating to API key ${config.googleSearch.currentKeyIndex + 1}/${config.googleSearch.apiKeys.length}`);
}

/**
 * Search Google using Custom Search API with fallback keys
 * @param {string} query - Search query
 * @returns {Promise<Array>} - Array of search results with URLs
 */
export async function searchGoogle(query) {
  const maxRetries = config.googleSearch.apiKeys.length;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const apiKey = getCurrentApiKey();
      
      const params = new URLSearchParams({
        key: apiKey,
        cx: config.googleSearch.searchEngineId,
        q: query,
        num: config.googleSearch.maxResultsPerQuery
      });

      const response = await axios.get(`${config.googleSearch.baseUrl}?${params}`, {
        timeout: 10000
      });

      if (response.data && response.data.items) {
        return response.data.items.map(item => ({
          url: item.link,
          title: item.title,
          snippet: item.snippet
        }));
      }

      return [];
      
    } catch (error) {
      // Check if it's a quota exceeded error (403) or rate limit (429)
      if (error.response && (error.response.status === 403 || error.response.status === 429)) {
        const errorMessage = error.response.data?.error?.message || '';
        const isQuotaError = errorMessage.includes('quota') || errorMessage.includes('Quota') || 
                           errorMessage.includes('rate') || errorMessage.includes('Rate') ||
                           error.response.status === 429;
        
        if (isQuotaError) {
          console.log(`⚠️  API quota/rate limit exceeded for key ${config.googleSearch.currentKeyIndex + 1}, rotating...`);
          
          // If this is the last key, show quota exceeded message
          if (config.googleSearch.apiKeys.length === 1) {
            console.log(chalk.red(`❌ Daily quota exceeded for your Google Search API key.`));
            console.log(chalk.yellow(`💡 Please try again tomorrow or use a different API key.`));
            return [];
          }
          
          rotateApiKey();
          continue; // Try with next key
        }
      }
      
      // For other errors, log and try next key
      console.error(`❌ Google search failed for query "${query}" (attempt ${attempt + 1}):`, error.message);
      
      if (attempt < maxRetries - 1) {
        rotateApiKey();
        continue;
      }
      
      return [];
    }
  }
  
  console.error(`❌ All API keys exhausted for query "${query}"`);
  return [];
}

/**
 * Filter out irrelevant URLs based on excluded domains
 * @param {Array} urls - Array of URL objects
 * @returns {Array} - Filtered array of URLs
 */
export function filterUrls(urls) {
  return urls.filter(item => {
    const url = item.url.toLowerCase();
    
    // Check if URL contains any excluded domains
    for (const domain of config.excludedDomains) {
      if (url.includes(domain.toLowerCase())) {
        return false;
      }
    }
    
    return true;
  });
}

/**
 * Get API key usage statistics
 * @returns {Object} Usage statistics
 */
export function getApiKeyStats() {
  return {
    totalKeys: config.googleSearch.apiKeys.length,
    currentKeyIndex: config.googleSearch.currentKeyIndex,
    currentKey: getCurrentApiKey()
  };
} 
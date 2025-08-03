import fs from 'fs/promises';
import path from 'path';

// Load environment variables from env.config file
async function loadEnvConfig() {
  try {
    const envContent = await fs.readFile('env.config', 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value && !key.startsWith('#')) {
        envVars[key.trim()] = value.trim();
      }
    });
    
    return envVars;
  } catch (error) {
    console.warn('⚠️  env.config file not found, using default configuration');
    return {};
  }
}

// Get API keys from environment
function getApiKeys(envVars) {
  const keys = [];
  for (let i = 1; i <= 5; i++) {
    const key = envVars[`GOOGLE_API_KEY_${i}`];
    if (key && 
        key !== 'YOUR_SECOND_API_KEY_HERE' && 
        key !== 'YOUR_THIRD_API_KEY_HERE' && 
        key !== 'YOUR_FOURTH_API_KEY_HERE' && 
        key !== 'YOUR_FIFTH_API_KEY_HERE' &&
        key.length > 20) { // Basic validation - API keys are usually long
      keys.push(key);
    }
  }
  return keys;
}

// Configuration file - Easy to modify API keys and settings
export const config = {
  // Google Custom Search API Configuration
  googleSearch: {
    apiKeys: [], // Will be populated from env.config
    searchEngineId: "4385aef0f424b4b5b", // Will be overridden from env.config
    baseUrl: "https://www.googleapis.com/customsearch/v1",
    maxResultsPerQuery: 10,
    currentKeyIndex: 0
  },

  // HTTP Request Configuration
  http: {
    timeout: 20000,
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    acceptLanguage: "en-US,en;q=0.9",
    delayBetweenRequests: 2000 // 2 seconds delay between requests
  },

  // 20 Dentist Search Queries for Morocco (Comprehensive Coverage)
  searchQueries: [
    // Casablanca
    "dentiste+Casablanca",
    "clinique+dentaire+Casablanca",
    "meilleur+dentiste+Casablanca",
    "urgence+dentaire+Casablanca",
    "dentiste+esthétique+Casablanca",
    
    // Rabat
    "dentiste+Rabat",
    "clinique+dentaire+Rabat",
    "cabinet+dentaire+Rabat",
    "dentiste+urgence+Rabat",
    
    // Marrakech
    "dentiste+Marrakech",
    "clinique+dentaire+Marrakech",
    "cabinet+dentaire+Marrakech",
    
    // Fes
    "dentiste+Fes",
    "clinique+dentaire+Fes",
    "cabinet+dentaire+Fes",
    
    // Agadir
    "dentiste+Agadir",
    "clinique+dentaire+Agadir",
    
    // Tangier
    "dentiste+Tanger",
    "clinique+dentaire+Tanger",
    
    // General Morocco
    "dentiste+Maroc",
    "clinique+dentaire+Maroc"
  ],

  // URL Filtering - Domains to exclude
  excludedDomains: [
    "google.com",
    "gstatic.com", 
    "ggpht.com",
    "schema.org",
    "example.com",
    "sentry-next.wixpress.com",
    "imli.com",
    "sentry.wixpress.com",
    "ingest.sentry.io",
    "sentry.io",
    "reddit.com",
    "wikipedia.org",
    "facebook.com",
    "youtube.com",
    "twitter.com",
    "instagram.com"
  ],

  // Email Filtering - Keywords to exclude in email domains
  excludedEmailPatterns: [
    /@.*(google|gstatic|ggpht|schema\.org|example\.com|sentry\.wixpress\.com|sentry-next\.wixp.*|ingest\.sentry\.io|sentry\.io|imli\.com)/i,
    /reddit/i,
    /wikipedia/i,
    /facebook/i,
    /youtube/i,
    /twitter/i,
    /instagram/i
  ],

  // Output Configuration
  output: {
    csvFile: "morocco-dentists-results.csv",
    xlsxFile: "morocco-dentists-results.xlsx",
    defaultFormat: "csv" // "csv" or "xlsx"
  }
};

// Initialize configuration with environment variables
export async function initializeConfig() {
  const envVars = await loadEnvConfig();
  
  // Set API keys
  config.googleSearch.apiKeys = getApiKeys(envVars);
  if (config.googleSearch.apiKeys.length === 0) {
    // Fallback to default key if no env keys
    config.googleSearch.apiKeys = ["AIzaSyDB34zBGAHN4S-RxBKqlAX7UxuyIMWE-iM"];
  }
  
  // Set search engine ID
  if (envVars.GOOGLE_SEARCH_ENGINE_ID) {
    config.googleSearch.searchEngineId = envVars.GOOGLE_SEARCH_ENGINE_ID;
  }
  
  // Set request delay
  if (envVars.REQUEST_DELAY) {
    config.http.delayBetweenRequests = parseInt(envVars.REQUEST_DELAY);
  }
  
  // Set timeout
  if (envVars.REQUEST_TIMEOUT) {
    config.http.timeout = parseInt(envVars.REQUEST_TIMEOUT);
  }
  
  console.log(`🔑 Loaded ${config.googleSearch.apiKeys.length} API keys`);
  console.log(`🔍 Configured ${config.searchQueries.length} search queries`);
  
  return config;
} 
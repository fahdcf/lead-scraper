import axios from 'axios';
import { config } from '../config.js';

/**
 * Generate AI-powered search queries using Gemini API
 * @param {string} niche - The business niche to target
 * @param {string} source - Data source type ('google_search', 'linkedin')
 * @returns {Promise<Array>} Array of search queries
 */
export async function generateQueriesWithGemini(niche, source = 'google_search') {
  try {
    console.log(`🤖 Generating ${source.toUpperCase()} queries for: "${niche}"`);
    
    if (!config.gemini.apiKey) {
      throw new Error('Gemini API key not configured');
    }
    
    // Determine language and keyword distribution based on niche and source
    let languageConfig;
    if (source === 'linkedin') {
      // LinkedIn: 12 queries total (8 French, 2 Arabic, 2 Other for Moroccan)
      const { language, frenchCount, arabicCount, otherCount } = detectNicheLanguage(niche);
      languageConfig = {
        language,
        frenchCount: Math.min(frenchCount, 8), // Cap at 8 for LinkedIn
        arabicCount: Math.min(arabicCount, 2), // Cap at 2 for LinkedIn
        otherCount: Math.min(otherCount, 2)     // Cap at 2 for LinkedIn
      };
    } else {
      // Google Search: 25 queries total (20 French, 5 Arabic for Moroccan)
      const { language, frenchCount, arabicCount, otherCount } = detectNicheLanguage(niche);
      languageConfig = {
        language,
        frenchCount: 20, // Always 20 for Google Search Moroccan niches
        arabicCount: 5,  // Always 5 for Google Search Moroccan niches
        otherCount: 0    // No other languages for Google Search
      };
    }
    
    let prompt;
    if (source === 'linkedin') {
      prompt = await generateLinkedInPrompt(niche, languageConfig.language, languageConfig.frenchCount, languageConfig.arabicCount, languageConfig.otherCount);
    } else {
      prompt = await generateGoogleSearchPrompt(niche, languageConfig.language, languageConfig.frenchCount, languageConfig.arabicCount, languageConfig.otherCount);
    }
    
    // Make direct API call to Gemini
    const response = await axios.post(
      `${config.gemini.baseUrl}?key=${config.gemini.apiKey}`,
      {
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    
    if (!response.data.candidates || !response.data.candidates[0] || !response.data.candidates[0].content) {
      throw new Error('Invalid response from Gemini API');
    }
    
    const text = response.data.candidates[0].content.parts[0].text;
    
    // Parse the response to extract queries
    const queries = parseGeneratedQueries(text);
    
    console.log(`✅ Generated ${queries.length} optimized ${source} queries`);
    return queries;
    
  } catch (error) {
    console.error(`❌ Error generating queries with Gemini: ${error.message}`);
    throw error;
  }
}

/**
 * Detect the language and keyword distribution based on niche
 * @param {string} niche - The business niche
 * @returns {Object} Language detection result
 */
function detectNicheLanguage(niche) {
  const nicheLower = niche.toLowerCase();
  
  // Moroccan cities and regions
  const moroccanKeywords = [
    'morocco', 'moroccan', 'maroc', 'marocain', 'marocaine',
    'casablanca', 'rabat', 'marrakech', 'fes', 'fès', 'agadir', 'tangier', 'tanger',
    'oujda', 'kenitra', 'tetouan', 'tétouan', 'meknes', 'meknès', 'el jadida', 'el-jadida',
    'safi', 'larache', 'khemisset', 'taourirt', 'ouarzazate', 'taroudant', 'guelmim',
    'ifrane', 'dakhla', 'laayoune', 'taza', 'berkane', 'sidi slimane', 'sidi kacem',
    'khouribga', 'beni mellal', 'tiflet', 'sale', 'temara', 'mohammedia', 'ain haroda',
    'ain taoujdate', 'ain aouda', 'ain sbihi', 'ain dorij', 'ain cheggag', 'ain karma',
    'ain sebaa', 'ain chock', 'ain diab', 'ain harrouda', 'ain itti', 'ain jir', 'ain orma',
    'ain taoujdate', 'ain zohra', 'ain zora', 'ain zohra', 'ain zora', 'ain zohra'
  ];
  
  // Check if niche contains Moroccan keywords
  const isMoroccan = moroccanKeywords.some(keyword => nicheLower.includes(keyword));
  
  if (isMoroccan) {
    return {
      language: 'moroccan',
      frenchCount: 20, // 20 French queries for Moroccan niches
      arabicCount: 5,  // 5 Arabic queries for Moroccan niches
      otherCount: 0    // No other languages for Moroccan niches
    };
  }
  
  // Check for other specific languages/regions
  if (nicheLower.includes('france') || nicheLower.includes('français') || nicheLower.includes('paris')) {
    return {
      language: 'french',
      frenchCount: 12, // Reduced from 25 to 12
      arabicCount: 0,
      otherCount: 0
    };
  }
  
  if (nicheLower.includes('spain') || nicheLower.includes('español') || nicheLower.includes('madrid') || nicheLower.includes('barcelona')) {
    return {
      language: 'spanish',
      frenchCount: 0,
      arabicCount: 0,
      otherCount: 12 // Reduced from 25 to 12
    };
  }
  
  if (nicheLower.includes('italy') || nicheLower.includes('italiano') || nicheLower.includes('rome') || nicheLower.includes('milan')) {
    return {
      language: 'italian',
      frenchCount: 0,
      arabicCount: 0,
      otherCount: 12 // Reduced from 25 to 12
    };
  }
  
  if (nicheLower.includes('germany') || nicheLower.includes('deutsch') || nicheLower.includes('berlin') || nicheLower.includes('munich')) {
    return {
      language: 'german',
      frenchCount: 0,
      arabicCount: 0,
      otherCount: 12 // Reduced from 25 to 12
    };
  }
  
  // Default to English for international niches
  return {
    language: 'english',
    frenchCount: 0,
    arabicCount: 0,
    otherCount: 12 // Reduced from 25 to 12
  };
}

/**
 * Generate Google Search prompt with SEO optimization
 */
async function generateGoogleSearchPrompt(niche, language, frenchCount, arabicCount, otherCount) {
  const totalQueries = frenchCount + arabicCount + otherCount;
  
  let languageInstructions = '';
  
  if (language === 'moroccan') {
    languageInstructions = `
    Generate exactly ${totalQueries} SEO-optimized search queries for Google Search:
    - ${frenchCount} queries in French (targeting French-speaking Moroccans)
    - ${arabicCount} queries in Arabic (targeting Arabic-speaking Moroccans)
    - ${otherCount} queries in English (for broader reach)
    `;
  } else if (language === 'french') {
    languageInstructions = `
    Generate exactly ${totalQueries} SEO-optimized search queries in French for Google Search.
    `;
  } else {
    languageInstructions = `
    Generate exactly ${totalQueries} SEO-optimized search queries in ${language} for Google Search.
    `;
  }
  
    return `You are helping someone find contact information for businesses and professionals.

 ${languageInstructions}

 Target niche: "${niche}"

 IMPORTANT: Generate SEO-optimized search queries that will find CONTACT PAGES and CONTACT INFORMATION. Focus on queries that will lead to pages with email addresses, phone numbers, and contact details.

 Requirements:
 - Include "contact" in most queries to target contact pages
 - Use terms like "contact", "coordonnées", "téléphone", "email", "adresse"
 - Include location-based terms when relevant
 - Use long-tail keywords that target contact information
 - Include business-specific terms that lead to contact pages
 - Use natural language that people search for when looking for contact info
 - Mix broad and specific terms for comprehensive coverage
 - Focus on queries that will find pages with contact details, not just general business pages

 Format: Return only the search queries, one per line, no numbering or extra text.

 Example SEO-optimized queries for "web developers in Casablanca":
 développeur web Casablanca contact
 agence web Casablanca coordonnées
 création site web Casablanca téléphone
 web developer Casablanca email
 agence développement web Casablanca contact
 développeur freelance Casablanca coordonnées
 web design Casablanca téléphone
 programmeur web Casablanca email
 agence web Casablanca adresse
 développement site web Casablanca contact

 Example SEO-optimized queries for "restaurants in Rabat":
 restaurant Rabat contact
 restaurant Rabat téléphone
 restaurant Rabat réservation
 restaurant Rabat coordonnées
 restaurant Rabat adresse
 restaurant Rabat email
 restaurant Rabat livraison contact
 restaurant Rabat menu prix contact
 restaurant Rabat avis clients contact
 restaurant Rabat spécialités contact

 Generate ${totalQueries} SEO-optimized queries for "${niche}" that will find contact pages and contact information:`;
}

/**
 * Generate LinkedIn prompt with SEO optimization
 */
async function generateLinkedInPrompt(niche, language, frenchCount, arabicCount, otherCount) {
  const totalQueries = frenchCount + arabicCount + otherCount;
  
  let languageInstructions = '';
  
  if (language === 'moroccan') {
    languageInstructions = `
    Generate exactly ${totalQueries} SEO-optimized search queries for LinkedIn:
    - ${frenchCount} queries in French (targeting French-speaking professionals)
    - ${arabicCount} queries in Arabic (targeting Arabic-speaking professionals)
    - ${otherCount} queries in English (for broader reach)
    `;
  } else if (language === 'french') {
    languageInstructions = `
    Generate exactly ${totalQueries} SEO-optimized search queries in French for LinkedIn.
    `;
  } else {
    languageInstructions = `
    Generate exactly ${totalQueries} SEO-optimized search queries in ${language} for LinkedIn.
    `;
  }
  
  return `You are helping someone find LinkedIn profiles and company pages.

${languageInstructions}

Target niche: "${niche}"

IMPORTANT: Generate SEO-optimized search queries that will find the most relevant LinkedIn profiles and company pages. Focus on professional keywords and industry-specific terms.

Requirements:
- Use professional and industry-specific keywords
- Include location-based terms when relevant
- Use job titles and professional roles
- Include company and business terms
- Use LinkedIn-specific terminology
- Mix broad and specific terms for comprehensive coverage
- Focus on high-quality professional results

Format: Return only the search queries, one per line, no numbering or extra text.

Example SEO-optimized queries for "web agencies in Casablanca":
Agence web Casablanca LinkedIn
Agence digitale Casablanca Morocco
Web agency Casablanca professional
Studio web Casablanca LinkedIn
Entreprise développement web Casablanca
Agence création site web Casablanca
Bureau web Casablanca Morocco
Agence marketing digital Casablanca
Atelier web Casablanca LinkedIn
Société web Casablanca professional

Example SEO-optimized queries for "doctors in Rabat":
Doctor Rabat Morocco LinkedIn
Médecin Rabat professional
Dentist Rabat Morocco
Dentiste Rabat LinkedIn
Cardiologist Rabat professional
Cardiologue Rabat Morocco
Surgeon Rabat LinkedIn
Chirurgien Rabat professional
Pediatrician Rabat Morocco
Pédiatre Rabat LinkedIn

Example SEO-optimized queries for "web developers in Fès":
Web developer Fès Morocco LinkedIn
Développeur web Fès professional
Full stack developer Fès Morocco
Développeur full stack Fès LinkedIn
Frontend developer Fès professional
Développeur frontend Fès Morocco
Backend developer Fès LinkedIn
Développeur backend Fès professional
Freelance developer Fès Morocco
Développeur freelance Fès LinkedIn

Generate ${totalQueries} SEO-optimized queries for "${niche}":`;
}

/**
 * Parse generated queries from Gemini response
 * @param {string} text - Raw response text
 * @returns {Array} Array of cleaned queries
 */
function parseGeneratedQueries(text) {
  try {
    // Split by lines and clean up
    const lines = text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .filter(line => !line.match(/^\d+\./)) // Remove numbered lines
      .filter(line => !line.toLowerCase().includes('example'))
      .filter(line => !line.toLowerCase().includes('query'))
      .filter(line => line.length > 5); // Minimum query length
    
    // Remove duplicates
    const uniqueQueries = [...new Set(lines)];
    
    return uniqueQueries;
    
  } catch (error) {
    console.error(`❌ Error parsing generated queries: ${error.message}`);
    return [];
  }
}

/**
 * Generate fallback queries if AI fails
 * @param {string} niche - The business niche
 * @param {string} source - Data source type
 * @returns {Array} Array of fallback queries
 */
function getFallbackQueries(niche, source) {
  const baseQueries = [
    `${niche} contact`,
    `${niche} email`,
    `${niche} téléphone`,
    `${niche} adresse`,
    `${niche} coordonnées`
  ];
  
  if (source === 'linkedin') {
    return [
      `${niche} LinkedIn`,
      `${niche} LinkedIn profile`,
      `${niche} LinkedIn professional`,
      `${niche} LinkedIn director`,
      `${niche} LinkedIn founder`
    ];
  }
  
  return baseQueries;
}

/**
 * Generate all source queries (legacy function)
 * @param {string} niche - The business niche
 * @returns {Promise<Object>} Object with queries for different sources
 */
export async function generateAllSourceQueries(niche) {
  try {
    const [googleSearchQueries, linkedInQueries] = await Promise.all([
      generateQueriesWithGemini(niche, 'google_search'),
      generateQueriesWithGemini(niche, 'linkedin')
    ]);
    
    return {
      googleSearchQueries,
      linkedInQueries
    };
    
  } catch (error) {
    console.error(`❌ Error generating all source queries: ${error.message}`);
    return {
      googleSearchQueries: getFallbackQueries(niche, 'google_search'),
      linkedInQueries: getFallbackQueries(niche, 'linkedin')
    };
  }
}
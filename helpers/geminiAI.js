import axios from 'axios';
import chalk from 'chalk';

const GEMINI_API_KEY = 'AIzaSyCxRnlVOB_hj6kBhdAp4s6Go-jxuxFj_Mo';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent';

/**
 * Generate search queries using Gemini AI
 * @param {string} niche - The niche to generate queries for
 * @returns {Promise<Array>} - Array of 25 search queries (15 French + 10 Arabic)
 */
export async function generateQueriesWithGemini(niche) {
  try {
    console.log(chalk.gray(`🔍 Attempting to connect to Gemini API...`));
    
    const prompt = `Generate 25 search queries for "${niche}" in Morocco. 
    
Requirements:
- 15 queries in French
- 10 queries in Arabic (in actual Arabic letters, not transliterated)
- Focus on finding businesses, services, or professionals
- Include location-specific terms
- Use common search patterns
- Make queries specific and targeted
- Use + to separate words (no spaces)
- Optimize queries to find contact information, emails, and phone numbers
- Return only the queries, one per line, no numbering or extra text

Format: Return only the queries, one per line, no numbering or extra text.

Example for "dentists in casablanca":
dentiste+Casablanca
clinique+dentaire+Casablanca
meilleur+dentiste+Casablanca
cabinet+dentaire+Casablanca
dentiste+urgence+Casablanca
orthodontiste+Casablanca
implant+dentaire+Casablanca
prothèse+dentaire+Casablanca
blanchiment+dentaire+Casablanca
parodontologie+Casablanca
dentiste+esthétique+Casablanca
soins+dentaires+Casablanca
consultation+dentaire+Casablanca
dentiste+enfants+Casablanca
chirurgie+dentaire+Casablanca
طبيب+أسنان+الدار+البيضاء
عيادة+أسنان+الدار+البيضاء
أفضل+طبيب+أسنان+الدار+البيضاء
مستشفى+أسنان+الدار+البيضاء
طبيب+أسنان+متخصص+الدار+البيضاء
طبيب+أسنان+أطفال+الدار+البيضاء
طبيب+أسنان+تجميل+الدار+البيضاء
مركز+أسنان+الدار+البيضاء
عيادة+أسنان+طوارئ+الدار+البيضاء
طبيب+أسنان+مستوصف+الدار+البيضاء`;

    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: prompt
            }
          ]
        }
      ]
    };

    console.log(chalk.gray(`📡 Sending request to: ${GEMINI_API_URL}`));
    
    const response = await axios.post(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, requestBody, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    console.log(chalk.gray(`✅ Received response from Gemini API`));

    if (response.data && response.data.candidates && response.data.candidates[0]) {
      const generatedText = response.data.candidates[0].content.parts[0].text;
      
      // Parse the generated text into queries
      const queries = generatedText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith('Example') && !line.startsWith('Format'))
        .slice(0, 25); // Ensure we get exactly 25 queries
      
      console.log(chalk.gray(`🤖 Generated queries for: "${niche}"`));
      queries.forEach((query, index) => {
        console.log(chalk.gray(`   ${index + 1}. ${query}`));
      });
      
      return queries;
    } else {
      throw new Error('Invalid response from Gemini API');
    }
    
  } catch (error) {
    console.error(chalk.red(`❌ Gemini API Error: ${error.message}`));
    if (error.response) {
      console.error(chalk.red(`   Status: ${error.response.status}`));
      console.error(chalk.red(`   Data: ${JSON.stringify(error.response.data, null, 2)}`));
    }
    
    // Fallback queries based on niche
    console.log(chalk.yellow(`🔄 Using fallback query generation...`));
    return generateFallbackQueries(niche);
  }
}

/**
 * Generate fallback queries if Gemini API fails
 * @param {string} niche - The niche to generate queries for
 * @returns {Array} - Array of fallback queries
 */
function generateFallbackQueries(niche) {
  const nicheLower = niche.toLowerCase();
  const location = extractLocation(niche);
  const profession = extractProfession(niche);
  
  const frenchQueries = [
    `${profession}+${location}`,
    `meilleur+${profession}+${location}`,
    `${profession}+professionnel+${location}`,
    `cabinet+${profession}+${location}`,
    `${profession}+expert+${location}`,
    `${profession}+spécialiste+${location}`,
    `${profession}+qualifié+${location}`,
    `${profession}+expérimenté+${location}`,
    `${profession}+recommandé+${location}`,
    `${profession}+certifié+${location}`,
    `${profession}+agréé+${location}`,
    `${profession}+urgent+${location}`,
    `${profession}+consultation+${location}`,
    `${profession}+service+${location}`,
    `${profession}+centre+${location}`
  ];
  
  // Arabic queries with proper Arabic letters
  const arabicQueries = [
    `طبيب+${getArabicProfession(profession)}+${getArabicLocation(location)}`,
    `عيادة+${getArabicProfession(profession)}+${getArabicLocation(location)}`,
    `أفضل+طبيب+${getArabicProfession(profession)}+${getArabicLocation(location)}`,
    `مستشفى+${getArabicProfession(profession)}+${getArabicLocation(location)}`,
    `طبيب+متخصص+${getArabicProfession(profession)}+${getArabicLocation(location)}`,
    `طبيب+أطفال+${getArabicProfession(profession)}+${getArabicLocation(location)}`,
    `طبيب+تجميل+${getArabicProfession(profession)}+${getArabicLocation(location)}`,
    `مركز+طبي+${getArabicProfession(profession)}+${getArabicLocation(location)}`,
    `عيادة+طوارئ+${getArabicProfession(profession)}+${getArabicLocation(location)}`,
    `طبيب+مستوصف+${getArabicProfession(profession)}+${getArabicLocation(location)}`
  ];
  
  return [...frenchQueries, ...arabicQueries];
}

/**
 * Extract profession from niche
 * @param {string} niche - The niche string
 * @returns {string} - Extracted profession
 */
function extractProfession(niche) {
  const nicheLower = niche.toLowerCase();
  
  // Common profession mappings
  const professionMap = {
    'doctor': 'médecin',
    'doctors': 'médecin',
    'dentist': 'dentiste',
    'dentists': 'dentiste',
    'lawyer': 'avocat',
    'lawyers': 'avocat',
    'engineer': 'ingénieur',
    'engineers': 'ingénieur',
    'architect': 'architecte',
    'architects': 'architecte',
    'teacher': 'professeur',
    'teachers': 'professeur',
    'accountant': 'comptable',
    'accountants': 'comptable',
    'consultant': 'consultant',
    'consultants': 'consultant',
    'designer': 'designer',
    'designers': 'designer',
    'developer': 'développeur',
    'developers': 'développeur',
    'manager': 'gestionnaire',
    'managers': 'gestionnaire',
    'coach': 'coach',
    'coaches': 'coach',
    'trainer': 'formateur',
    'trainers': 'formateur',
    'photographer': 'photographe',
    'photographers': 'photographe',
    'translator': 'traducteur',
    'translators': 'traducteur',
    'interpreter': 'interprète',
    'interpreters': 'interprète'
  };
  
  // Check for exact matches first
  for (const [english, french] of Object.entries(professionMap)) {
    if (nicheLower.includes(english)) {
      return french;
    }
  }
  
  // If no match found, try to extract a single word profession
  const words = nicheLower.split(' ');
  for (const word of words) {
    if (word.length > 3 && !['in', 'the', 'and', 'for', 'with', 'from', 'near', 'around'].includes(word)) {
      return word; // Use the word as-is
    }
  }
  
  return 'professionnel'; // Default fallback
}

/**
 * Extract location from niche
 * @param {string} niche - The niche string
 * @returns {string} - Extracted location
 */
function extractLocation(niche) {
  const locations = ['casablanca', 'rabat', 'marrakech', 'fes', 'agadir', 'tanger', 'meknes', 'oujda'];
  
  for (const location of locations) {
    if (niche.toLowerCase().includes(location)) {
      return location;
    }
  }
  
  return 'maroc'; // Default to Morocco if no specific location found
} 

/**
 * Get Arabic profession name
 * @param {string} profession - French profession
 * @returns {string} - Arabic profession
 */
function getArabicProfession(profession) {
  const professionMap = {
    'médecin': 'عام',
    'dentiste': 'أسنان',
    'avocat': 'محامي',
    'ingénieur': 'مهندس',
    'architecte': 'مهندس+معماري',
    'professeur': 'معلم',
    'comptable': 'محاسب',
    'consultant': 'مستشار',
    'designer': 'مصمم',
    'développeur': 'مبرمج',
    'gestionnaire': 'مدير',
    'coach': 'مدرب',
    'formateur': 'مدرب',
    'photographe': 'مصور',
    'traducteur': 'مترجم',
    'interprète': 'مترجم'
  };
  
  return professionMap[profession] || profession;
}

/**
 * Get Arabic location name
 * @param {string} location - English location
 * @returns {string} - Arabic location
 */
function getArabicLocation(location) {
  const locationMap = {
    'casablanca': 'الدار+البيضاء',
    'rabat': 'الرباط',
    'marrakech': 'مراكش',
    'fes': 'فاس',
    'agadir': 'أكادير',
    'tanger': 'طنجة',
    'meknes': 'مكناس',
    'oujda': 'وجدة',
    'maroc': 'المغرب'
  };
  
  return locationMap[location] || location;
} 
# 🎯 Universal Morocco Web Scraper CLI

A powerful Node.js CLI tool that scrapes email addresses and phone numbers from ANY business websites across Morocco using Google Custom Search API and AI-powered query generation. Features fallback API keys, comprehensive logging, and one-command execution for any niche.

## 🚀 Features

- **Universal Niche Support**: Works for ANY business type (restaurants, lawyers, dentists, hotels, etc.)
- **AI-Powered Query Generation**: Gemini AI generates 25 targeted queries (15 French + 10 Arabic) for your specific niche
- **Fallback API Keys System**: Automatically rotates between multiple Google API keys when quota is exceeded
- **One-Command Execution**: Run `npm start` and enter your niche to scrape automatically
- **Detailed Logging**: Real-time progress updates with comprehensive statistics
- **Sequential Processing**: Processes URLs one-by-one (no parallel processing) to avoid rate limiting
- **Smart Filtering**: Filters out irrelevant URLs and invalid emails
- **Moroccan Phone Detection**: Extracts Moroccan phone numbers (+212 format)
- **Multiple Export Formats**: Supports CSV and Excel output
- **Easy Configuration**: Simple env.config file for API keys
- **LinkedIn Profile Search**: Find professional profiles and contact information
- **Content Validation**: Advanced filtering to ensure high-quality results

## 📋 Prerequisites

- Node.js 16+ 
- Google Custom Search API key(s)
- Google Custom Search Engine ID
- Gemini AI API key (for intelligent query generation)

## 🛠️ Installation

1. **Clone or download the project files**

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure API keys**:
   Edit `env.config` and update:
   ```bash
   GOOGLE_API_KEY_1=YOUR_PRIMARY_API_KEY
   GOOGLE_API_KEY_2=YOUR_SECOND_API_KEY
   GOOGLE_API_KEY_3=YOUR_THIRD_API_KEY
   GOOGLE_SEARCH_ENGINE_ID=YOUR_SEARCH_ENGINE_ID
   GEMINI_API_KEY=YOUR_GEMINI_API_KEY
   ```

## ⚙️ Configuration

### Environment File (`env.config`)
```bash
# Google Custom Search API Keys (Primary + Fallbacks)
GOOGLE_API_KEY_1=YOUR_PRIMARY_API_KEY
GOOGLE_API_KEY_2=YOUR_SECOND_API_KEY
GOOGLE_API_KEY_3=YOUR_THIRD_API_KEY
GOOGLE_API_KEY_4=YOUR_FOURTH_API_KEY
GOOGLE_API_KEY_5=YOUR_FIFTH_API_KEY

# Google Custom Search Engine ID
GOOGLE_SEARCH_ENGINE_ID=YOUR_SEARCH_ENGINE_ID

# Gemini AI API Key (for intelligent query generation)
GEMINI_API_KEY=YOUR_GEMINI_API_KEY

# Request Configuration
REQUEST_DELAY=2000
REQUEST_TIMEOUT=20000
```

## 🚀 Usage

### Main Scraper with Data Source Selection
```bash
npm start
```
Then:
1. Enter your niche when prompted (e.g., "website developers in Casablanca")
2. Choose your data source:
   - **1. Google Search** - Business websites and contact information
   - **2. LinkedIn** - Professional profiles and networking data
   - **3. All Sources** - Combined comprehensive search

The AI will generate 25 targeted queries automatically and scrape all found URLs.

### Test Scraper (Limited Queries)
```bash
npm run test
```
Same as `npm start` but with limited queries for testing purposes.

### Alternative Commands
```bash
# Same as npm start
npm run scrape

# Run the main scraper
node scraper.js

# Use advanced scraper for better quality
npm run advanced

# Development mode with auto-restart
npm run dev
```

### Command Line Options (for index.js)
```bash
# Export to Excel format
node index.js --format xlsx

# Use custom search queries
node index.js --queries "restaurants+Casablanca,hotels+Marrakech"

# Specify output filename
node index.js --output my-results.csv
```

## 📁 Project Structure

```
/universal-morocco-scraper/
├── scraper.js              # Main scraper (AI-powered queries)
├── advanced-scraper.js     # Enhanced scraper with quality metrics
├── index.js                # Legacy scraper with CLI options
├── test-scraper.js         # Test scraper with data source selection
├── config.js               # Configuration with env loading
├── env.config              # Environment variables (API keys)
├── package.json            # Dependencies and scripts
├── README.md               # This file
├── BETTER_RESULTS_GUIDE.md # Detailed improvement guide
├── helpers/
│   ├── fetchPage.js        # Fetch HTML content from URLs
│   ├── extractEmails.js    # Extract and validate email addresses
│   ├── extractPhones.js    # Extract Moroccan phone numbers
│   ├── googleSearch.js     # Google API with fallback keys
│   ├── exportToCsv.js      # Export results to CSV/Excel
│   ├── geminiAI.js         # AI-powered query generation
│   ├── multiSourceSearch.js # LinkedIn and multi-source search
│   └── contentValidator.js # Content validation and filtering
└── results/                # Output files
    ├── restaurants_results.csv
    ├── lawyers_results.csv
    └── dentists_results.csv
```

## 🔧 Advanced Configuration

### Adding More API Keys
Edit `env.config` and add more keys:
```bash
GOOGLE_API_KEY_6=YOUR_SIXTH_API_KEY
GOOGLE_API_KEY_7=YOUR_SEVENTH_API_KEY
```

### Modifying Request Delays
Modify `REQUEST_DELAY` in `env.config`:
```bash
REQUEST_DELAY=3000  # 3 seconds between requests
```

## 📊 Output Format

### CSV/Excel Structure
| Email | Phone |
|-------|-------|
| contact@example.com | +212612345678 |
| info@company.com | +212712345678 |

### Console Output Example
```
🚀 Universal Morocco Scraper Starting...

🎯 Enter your niche: restaurants in Casablanca

🤖 Generating AI-powered search queries...
✅ Generated 25 AI-powered queries

📋 Processing 25 enhanced queries...

📊 Query 1/25: "restaurants+Casablanca+contact"
────────────────────────────────────────────────────────────
   ✅ Found 8 relevant URLs
   ✅ Completed query "restaurants+Casablanca+contact" - Scraped 8 URLs
   🔑 Using API key 1/3

📈 Final Scraping Summary:
   • Queries Processed: 25/25
   • Failed Queries: 0
   • Total URLs Found: 156
   • Total URLs Scraped: 142
   • URLs with Data: 89
   • Unique Emails Found: 45
   • Unique Phones Found: 67
   • Final Results: 67 rows

✅ Universal scraping completed successfully!
📁 Results saved to: restaurants_in_casablanca_results.csv
```

## ⚠️ Important Notes

1. **API Limits**: Google Custom Search API has daily quotas (usually 100 free queries/day per key)
2. **Fallback System**: When one key's quota is exceeded, it automatically switches to the next key
3. **Rate Limiting**: Includes configurable delays between requests to avoid being blocked
4. **Sequential Processing**: URLs are processed one at a time (no parallel processing)
5. **Error Handling**: Failed requests are logged but don't stop the process
6. **Deduplication**: Emails are automatically deduplicated and converted to lowercase
7. **AI-Powered**: Uses Gemini AI to generate niche-specific queries automatically
8. **Content Validation**: Advanced filtering ensures high-quality, relevant results

## 🐛 Troubleshooting

### Common Issues

1. **API Key Error**: Ensure your Google Custom Search API keys are valid and have sufficient quota
2. **Search Engine ID Error**: Verify your Custom Search Engine ID is correct
3. **Quota Exceeded**: The tool will automatically rotate to the next API key
4. **Network Errors**: Check your internet connection and firewall settings
5. **AI Generation Failed**: Falls back to generic queries if Gemini AI is unavailable

### Getting More API Keys
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Custom Search API
4. Create credentials (API keys)
5. Add keys to `env.config`

## 📝 License

MIT License - feel free to modify and distribute.

## 🤝 Contributing

Feel free to submit issues and enhancement requests! 
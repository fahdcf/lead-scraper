# Morocco Dentist Scraper CLI

A powerful Node.js CLI tool that scrapes email addresses and phone numbers from dentist websites across Morocco using Google Custom Search API. Features fallback API keys, comprehensive logging, and one-command execution.

## 🚀 Features

- **20 Comprehensive Dentist Queries**: Covers all major Moroccan cities (Casablanca, Rabat, Marrakech, Fes, Agadir, Tangier)
- **Fallback API Keys System**: Automatically rotates between multiple Google API keys when quota is exceeded
- **One-Command Execution**: Run `npm start` to scrape all 20 queries at once
- **Detailed Logging**: Real-time progress updates with comprehensive statistics
- **Sequential Processing**: Processes URLs one-by-one (no parallel processing) to avoid rate limiting
- **Smart Filtering**: Filters out irrelevant URLs and invalid emails
- **Moroccan Phone Detection**: Extracts Moroccan phone numbers (+212 format)
- **Multiple Export Formats**: Supports CSV and Excel output
- **Easy Configuration**: Simple env.config file for API keys

## 📋 Prerequisites

- Node.js 16+ 
- Google Custom Search API key(s)
- Google Custom Search Engine ID

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

# Request Configuration
REQUEST_DELAY=2000
REQUEST_TIMEOUT=20000
```

### Search Queries (20 Comprehensive Queries)
The tool automatically searches for dentists across all major Moroccan cities:
- **Casablanca**: 5 queries
- **Rabat**: 4 queries  
- **Marrakech**: 3 queries
- **Fes**: 3 queries
- **Agadir**: 2 queries
- **Tangier**: 2 queries
- **General Morocco**: 1 query

## 🚀 Usage

### One-Command Execution (Recommended)
```bash
npm start
```
This runs all 20 queries and scrapes all found URLs automatically.

### Alternative Commands
```bash
# Same as npm start
npm run scrape

# Run the main scraper
node scraper.js

# Test with single query
npm run test

# Development mode with auto-restart
npm run dev
```

### Command Line Options (for index.js)
```bash
# Export to Excel format
node index.js --format xlsx

# Use custom search queries
node index.js --queries "dentiste+Marrakech,clinique+Rabat"

# Specify output filename
node index.js --output my-results.csv
```

## 📁 Project Structure

```
/morocco-dentist-scraper/
├── scraper.js              # Main scraper (runs all 20 queries)
├── index.js                # Legacy scraper with CLI options
├── config.js               # Configuration with env loading
├── env.config              # Environment variables (API keys)
├── package.json            # Dependencies and scripts
├── README.md               # This file
├── helpers/
│   ├── fetchPage.js        # Fetch HTML content from URLs
│   ├── extractEmails.js    # Extract and validate email addresses
│   ├── extractPhones.js    # Extract Moroccan phone numbers
│   ├── googleSearch.js     # Google API with fallback keys
│   └── exportToCsv.js      # Export results to CSV/Excel
├── morocco-dentists-results.csv    # Default output file
└── morocco-dentists-results.xlsx   # Excel output file
```

## 🔧 Advanced Configuration

### Adding More API Keys
Edit `env.config` and add more keys:
```bash
GOOGLE_API_KEY_6=YOUR_SIXTH_API_KEY
GOOGLE_API_KEY_7=YOUR_SEVENTH_API_KEY
```

### Modifying Search Queries
Edit the `searchQueries` array in `config.js`:
```javascript
searchQueries: [
  "your+custom+query+1",
  "your+custom+query+2",
  // ... more queries
]
```

### Adjusting Request Delays
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
🚀 Morocco Dentist Scraper Starting...

📋 Configuration:
   • API Keys: 3 available
   • Search Queries: 20 configured
   • Request Delay: 2000ms
   • Max Results per Query: 10

🔍 Starting scraping of 20 queries...

📊 Query 1/20: "dentiste+Casablanca"
────────────────────────────────────────────────────────────
   ✅ Found 8 relevant URLs
   ✅ Completed query "dentiste+Casablanca" - Scraped 8 URLs
   🔑 Using API key 1/3

📈 Final Scraping Summary:
   • Queries Processed: 20/20
   • Failed Queries: 0
   • Total URLs Found: 156
   • Total URLs Scraped: 142
   • URLs with Data: 89
   • Unique Emails Found: 45
   • Unique Phones Found: 67
   • Final Results: 67 rows

✅ Morocco Dentist Scraping completed successfully!
📁 Results saved to: morocco-dentists-results.csv
```

## ⚠️ Important Notes

1. **API Limits**: Google Custom Search API has daily quotas (usually 100 free queries/day per key)
2. **Fallback System**: When one key's quota is exceeded, it automatically switches to the next key
3. **Rate Limiting**: Includes configurable delays between requests to avoid being blocked
4. **Sequential Processing**: URLs are processed one at a time (no parallel processing)
5. **Error Handling**: Failed requests are logged but don't stop the process
6. **Deduplication**: Emails are automatically deduplicated and converted to lowercase

## 🐛 Troubleshooting

### Common Issues

1. **API Key Error**: Ensure your Google Custom Search API keys are valid and have sufficient quota
2. **Search Engine ID Error**: Verify your Custom Search Engine ID is correct
3. **Quota Exceeded**: The tool will automatically rotate to the next API key
4. **Network Errors**: Check your internet connection and firewall settings

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
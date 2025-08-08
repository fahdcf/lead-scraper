#!/usr/bin/env node

import chalk from 'chalk';
import ora from 'ora';
import { initializeConfig, config } from './config.js';
import { searchGoogle, filterUrls, getApiKeyStats } from './helpers/googleSearch.js';
import { fetchPage, delay } from './helpers/fetchPage.js';
import { extractEmails } from './helpers/extractEmails.js';
import { extractPhones } from './helpers/extractPhones.js';
import { exportResults } from './helpers/exportToCsv.js';
import { generateQueriesWithGemini } from './helpers/geminiAI.js';
import { searchLinkedIn } from './helpers/multiSourceSearch.js';
import { ContentValidator } from './helpers/contentValidator.js';
import { AdvancedContactExtractor } from './helpers/advancedContactExtractor.js';
import readline from 'readline';

// Global state for interruption handling
let isProcessing = false;
let currentResults = [];
let currentNiche = '';
let currentDataType = null;

/**
 * Create readline interface for user input
 */
function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

/**
 * Get user input with prompt
 */
function getUserInput(rl, prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Display data source options
 */
function displayDataSourceOptions() {
  console.log(chalk.cyan('\n📊 Available Data Sources:'));
  console.log(chalk.gray('─'.repeat(40)));
  console.log(chalk.white('1. Google Search (Business Websites) - ADVANCED'));
  console.log(chalk.white('2. LinkedIn (Professional Profiles)'));
  console.log(chalk.white('3. All Sources (Combined Results) - ADVANCED'));
  console.log('');
}

/**
 * Display data type options for Google Search
 */
function displayDataTypeOptions() {
  console.log(chalk.cyan('\n📧 Google Search Data Type:'));
  console.log(chalk.gray('─'.repeat(40)));
  console.log(chalk.white('1. Emails Only - ADVANCED EXTRACTION'));
  console.log(chalk.white('2. Phone Numbers Only - ADVANCED EXTRACTION'));
  console.log(chalk.white('3. Both Emails and Phone Numbers - ADVANCED EXTRACTION'));
  console.log('');
}

/**
 * Get data source selection from user
 */
async function getDataSourceSelection(rl) {
  displayDataSourceOptions();
  
  const selection = await getUserInput(rl, chalk.yellow('🎯 Select data source (1-3): '));
  
  const dataSources = {
    '1': 'google_search',
    '2': 'linkedin',
    '3': 'all_sources'
  };
  
  const selectedSource = dataSources[selection];
  
  if (!selectedSource) {
    console.log(chalk.red('❌ Invalid selection. Please choose 1-3.'));
    return await getDataSourceSelection(rl);
  }
  
  return selectedSource;
}

/**
 * Get data type selection for Google Search
 */
async function getDataTypeSelection(rl) {
  displayDataTypeOptions();
  
  const selection = await getUserInput(rl, chalk.yellow('📧 Select data type (1-3): '));
  
  const dataTypes = {
    '1': 'emails_only',
    '2': 'phones_only',
    '3': 'both'
  };
  
  const selectedType = dataTypes[selection];
  
  if (!selectedType) {
    console.log(chalk.red('❌ Invalid selection. Please choose 1-3.'));
    return await getDataTypeSelection(rl);
  }
  
  return selectedType;
}

/**
 * Handle global interruption (Ctrl+C)
 */
async function handleGlobalInterruption() {
  if (isProcessing) {
    console.log(chalk.yellow('\n⚠️  Interruption detected. Saving current results...'));
    try {
      await saveResults(currentResults, currentNiche, true, currentDataType);
      console.log(chalk.green('✅ Results saved successfully before interruption.'));
    } catch (error) {
      console.log(chalk.red(`❌ Failed to save results: ${error.message}`));
    }
  } else {
    console.log(chalk.yellow('\n⚠️  Interruption detected. No results to save.'));
  }
  process.exit(0);
}

/**
 * Save results to file with advanced formatting
 */
async function saveResults(allResults, niche, isInterrupted = false, dataType = null) {
  if (!allResults || allResults.length === 0) {
    console.log(chalk.yellow('⚠️  No results to save.'));
    return;
  }

  const timestamp = Date.now();
  const sanitizedNiche = niche.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
  
  // Create filename with advanced indicator
  const baseFilename = `${sanitizedNiche}_advanced_results_${timestamp}`;
  
  // Deduplicate results
  const uniqueResults = deduplicateAdvancedResults(allResults);
  
  console.log(chalk.blue(`\n💾 Saving ${uniqueResults.length} advanced results...`));
  
  // Filter by confidence for advanced results
  const highConfidenceResults = uniqueResults.filter(result => {
    if (result.confidence !== undefined) {
      return result.confidence >= 70; // Only high confidence results
    }
    return true; // Keep results without confidence scores (fallback)
  });
  
  console.log(chalk.green(`✅ Found ${highConfidenceResults.length} high-confidence results (≥70%)`));
  
  try {
    if (highConfidenceResults.length === 0) {
      console.log(chalk.yellow('⚠️  No high-confidence results found. Saving all results.'));
      await exportResults(uniqueResults, 'txt', `${sanitizedNiche}_results.txt`, niche);
    } else {
      await exportResults(highConfidenceResults, 'txt', `${sanitizedNiche}_results.txt`, niche);
    }
    
    // Display advanced statistics
    console.log(chalk.blue.bold('\n📊 ADVANCED EXTRACTION STATISTICS:'));
    console.log(chalk.gray('─'.repeat(50)));
    
    const emailResults = uniqueResults.filter(r => r.email);
    const phoneResults = uniqueResults.filter(r => r.phone);
    const highConfidenceEmails = emailResults.filter(r => r.confidence >= 70);
    const highConfidencePhones = phoneResults.filter(r => r.confidence >= 70);
    
    console.log(chalk.cyan(`📧 Total Emails: ${emailResults.length}`));
    console.log(chalk.cyan(`📧 High Confidence Emails (≥70%): ${highConfidenceEmails.length}`));
    console.log(chalk.cyan(`📞 Total Phones: ${phoneResults.length}`));
    console.log(chalk.cyan(`📞 High Confidence Phones (≥70%): ${highConfidencePhones.length}`));
    
    if (uniqueResults.length > 0) {
      const avgConfidence = uniqueResults
        .filter(r => r.confidence !== undefined)
        .reduce((sum, r) => sum + r.confidence, 0) / uniqueResults.filter(r => r.confidence !== undefined).length;
      
      console.log(chalk.cyan(`📊 Average Confidence: ${avgConfidence.toFixed(1)}%`));
    }
    
    const status = isInterrupted ? 'INTERRUPTED' : 'COMPLETED';
    console.log(chalk.green(`\n✅ Advanced extraction ${status}: ${sanitizedNiche}_results.txt`));
    
  } catch (error) {
    console.error(chalk.red(`❌ Failed to save results: ${error.message}`));
    throw error;
  }
}

/**
 * Deduplicate advanced results with confidence scoring
 */
function deduplicateAdvancedResults(results) {
  const seen = new Set();
  const uniqueResults = [];
  
  for (const result of results) {
    const key = `${result.email || ''}-${result.phone || ''}-${result.url}`;
    
    if (!seen.has(key)) {
      seen.add(key);
      uniqueResults.push(result);
    } else {
      // If duplicate found, keep the one with higher confidence
      const existingIndex = uniqueResults.findIndex(r => 
        `${r.email || ''}-${r.phone || ''}-${r.url}` === key
      );
      
      if (existingIndex !== -1) {
        const existing = uniqueResults[existingIndex];
        const currentConfidence = result.confidence || 0;
        const existingConfidence = existing.confidence || 0;
        
        if (currentConfidence > existingConfidence) {
          uniqueResults[existingIndex] = result;
        }
      }
    }
  }
  
  return uniqueResults;
}

/**
 * Process LinkedIn search with advanced validation
 */
async function processLinkedInSearch(searchQueries, niche, contentValidator) {
  console.log(chalk.blue(`\n🔗 Processing ${searchQueries.length} LinkedIn queries...`));
  const allResults = [];
  let processedQueries = 0;
  let successfulQueries = 0;

  for (const query of searchQueries) {
    processedQueries++;
    console.log(chalk.blue(`\n🔍 Processing Query ${processedQueries}/${searchQueries.length}: "${query}"`));
    const querySpinner = ora(chalk.blue(`🔗 Searching LinkedIn for: "${query}"`)).start();

    try {
      const linkedInResults = await searchLinkedIn(query);
      
      if (linkedInResults.length === 0) {
        querySpinner.warn(chalk.yellow(`⚠️  No LinkedIn results for: "${query}"`));
        continue;
      }

      querySpinner.succeed(chalk.green(`✅ Found ${linkedInResults.length} LinkedIn profiles`));
      successfulQueries++;

      // Add LinkedIn results with advanced validation
      linkedInResults.forEach(profile => {
        allResults.push({
          email: profile.email || null,
          phone: profile.phone || null,
          url: profile.url,
          query: query,
          score: profile.score || 0,
          validationScore: profile.validationScore || 0,
          source: 'linkedin',
          confidence: profile.confidence || 85, // LinkedIn profiles typically have high confidence
          profileName: profile.name,
          company: profile.company,
          title: profile.title
        });
      });

    } catch (error) {
      querySpinner.fail(chalk.red(`❌ LinkedIn query failed: ${error.message}`));
    }
  }

  console.log(chalk.green(`\n✅ LinkedIn processing completed: ${successfulQueries}/${processedQueries} successful queries`));
  return allResults;
}

/**
 * Process Google Search with ADVANCED contact extraction
 */
async function processGoogleSearch(searchQueries, niche, contentValidator, dataType = 'both') {
  console.log(chalk.blue(`\n🌐 Processing ${searchQueries.length} Google Search queries with ADVANCED extraction...`));
  const allResults = [];
  let processedQueries = 0;
  let successfulQueries = 0;
  let validatedResults = 0;
  let rejectedResults = 0;
  let highConfidenceResults = 0;

  // Initialize advanced contact extractor
  const advancedExtractor = new AdvancedContactExtractor();
  console.log(chalk.cyan('🚀 Advanced contact extraction enabled'));

  // Process each query with advanced content validation
  for (const query of searchQueries) {
    processedQueries++;
    console.log(chalk.blue(`\n🔍 Processing Query ${processedQueries}/${searchQueries.length}: "${query}"`));
    const querySpinner = ora(chalk.blue(`🌐 Searching Google for: "${query}"`)).start();

    try {
      // Enhanced Google search with better targeting
      let searchResults;
      if (config._userBasedFlow) {
        // User-based: request 2 pages (20 results)
        searchResults = [];
        for (let start = 1; start <= 2; start++) {
          const pageResults = await searchGoogle(query, 10, (start - 1) * 10 + 1);
          if (Array.isArray(pageResults)) searchResults.push(...pageResults);
        }
      } else {
        // Global: default (1 page)
        searchResults = await searchGoogle(query);
      }
      
      if (searchResults.length === 0) {
        querySpinner.warn(chalk.yellow(`⚠️  No results for: "${query}"`));
        continue;
      }
      
      // Enhanced URL filtering with priority scoring
      const filteredUrls = filterUrls(searchResults);
      if (filteredUrls.length === 0) {
        querySpinner.warn(chalk.yellow(`⚠️  No relevant URLs for: "${query}"`));
        continue;
      }
      
      querySpinner.text = chalk.blue(`🌐 Processing ${filteredUrls.length} high-quality URLs with ADVANCED extraction: "${query}"`);
      let queryResults = 0;
      let queryValidated = 0;
      let queryRejected = 0;
      let queryHighConfidence = 0;
      
      // Process each URL with ADVANCED extraction
      for (let i = 0; i < filteredUrls.length; i++) {
        const urlData = filteredUrls[i];
        const url = urlData.url;
        querySpinner.text = chalk.blue(`🌐 Advanced scraping (${i + 1}/${filteredUrls.length}): ${url} (Score: ${urlData.score})`);
        
        // Enhanced page fetching with retry logic
        let html = null;
        for (let retry = 0; retry < 2; retry++) {
          html = await fetchPage(url);
          if (html) break;
          if (retry < 1) {
            await delay(config.http.delayBetweenRequests);
          }
        }
        
        if (!html) {
          console.log(chalk.red(`❌ Failed to fetch: ${url}`));
          continue;
        }
        
        // Content validation before extraction
        const validation = contentValidator.validateContent(html, url);
        if (!validation.isRelevant) {
          queryRejected++;
          rejectedResults++;
          console.log(chalk.yellow(`⚠️  Content rejected: ${url} (Score: ${validation.score})`));
          console.log(chalk.gray(`   Reasons: ${validation.reasons.join(', ')}`));
          continue;
        }
        
        // ADVANCED contact extraction with confidence scoring
        let advancedResults;
        try {
          advancedResults = await advancedExtractor.extractContactInfoAdvanced(url, html);
        } catch (error) {
          console.log(chalk.yellow(`⚠️  Advanced extraction failed for ${url}: ${error.message}`));
          // Fallback to basic extraction
          const emails = extractEmails(html);
          const phones = extractPhones(html);
          advancedResults = {
            emails: emails.map(email => ({ value: email, confidence: 50 })),
            phones: phones.map(phone => ({ value: phone, confidence: 50 }))
          };
        }
        
        // Process advanced results based on data type selection
        if (dataType === 'emails_only' || dataType === 'both') {
          advancedResults.emails.forEach(emailData => {
            if (emailData.confidence >= 50) { // Minimum confidence threshold
              const result = {
                email: emailData.value.toLowerCase(),
                phone: null,
                url: url,
                query: query,
                score: urlData.score,
                validationScore: validation.score,
                source: 'google_search_advanced',
                confidence: emailData.confidence,
                extractionMethod: 'advanced'
              };
              allResults.push(result);
              currentResults.push(result); // Update for periodic save
              
              queryValidated++;
              validatedResults++;
              
              if (emailData.confidence >= 70) {
                queryHighConfidence++;
                highConfidenceResults++;
              }
            }
          });
        }
        
        if (dataType === 'phones_only' || dataType === 'both') {
          advancedResults.phones.forEach(phoneData => {
            if (phoneData.confidence >= 50) { // Minimum confidence threshold
              const result = {
                email: null,
                phone: phoneData.value,
                url: url,
                query: query,
                score: urlData.score,
                validationScore: validation.score,
                source: 'google_search_advanced',
                confidence: phoneData.confidence,
                extractionMethod: 'advanced'
              };
              allResults.push(result);
              currentResults.push(result); // Update for periodic save
              
              queryValidated++;
              validatedResults++;
              
              if (phoneData.confidence >= 70) {
                queryHighConfidence++;
                highConfidenceResults++;
              }
            }
          });
        }
      }
      
      querySpinner.succeed(chalk.green(`✅ Query completed: ${queryValidated} validated, ${queryHighConfidence} high-confidence results`));
      successfulQueries++;
      
    } catch (error) {
      querySpinner.fail(chalk.red(`❌ Query failed: ${error.message}`));
    }
  }

  console.log(chalk.green(`\n✅ ADVANCED Google Search processing completed:`));
  console.log(chalk.cyan(`   • Successful queries: ${successfulQueries}/${processedQueries}`));
  console.log(chalk.cyan(`   • Total validated results: ${validatedResults}`));
  console.log(chalk.cyan(`   • High-confidence results (≥70%): ${highConfidenceResults}`));
  console.log(chalk.cyan(`   • Rejected results: ${rejectedResults}`));
  
  return allResults;
}

/**
 * Main function with advanced features
 */
async function main() {
  console.log(chalk.blue.bold('🚀 ADVANCED Morocco Web Scraper Starting...\n'));
  console.log(chalk.cyan('✨ Advanced contact extraction with confidence scoring enabled'));
  console.log(chalk.cyan('🎯 Multi-source validation and business filtering active'));
  console.log(chalk.cyan('📊 High-confidence results (≥70%) will be prioritized\n'));

  // Initialize configuration
  await initializeConfig();

  // Set up interruption handlers
  process.on('SIGINT', handleGlobalInterruption);
  process.on('SIGTERM', handleGlobalInterruption);

  const rl = createReadlineInterface();

  try {
    // Get user input for niche
    const niche = await getUserInput(rl, chalk.yellow('🎯 Enter the business niche to scrape (e.g., "website developers in Casablanca"): '));
    
    if (!niche) {
      console.log(chalk.red('❌ No niche provided. Exiting.'));
      rl.close();
      return;
    }

    console.log(chalk.blue(`\n🎯 Targeting: ${niche}`));
    console.log(chalk.gray('─'.repeat(60)));

    // Get data source selection
    const dataSource = await getDataSourceSelection(rl);
    console.log(chalk.cyan(`\n📊 Selected data source: ${dataSource.toUpperCase()} - ADVANCED MODE`));

    // Get data type selection for Google Search
    let dataType = null;
    if (dataSource === 'google_search' || dataSource === 'all_sources') {
      dataType = await getDataTypeSelection(rl);
      console.log(chalk.cyan(`\n📧 Selected Google Search data type: ${dataType.replace(/_/g, ' ').toUpperCase()} - ADVANCED EXTRACTION`));
    }

    // Initialize content validator
    const contentValidator = new ContentValidator(niche);
    console.log(chalk.cyan(`🔍 Advanced content validation enabled for: ${niche}`));
    console.log(chalk.gray(`   Target keywords: ${contentValidator.nicheKeywords.join(', ')}`));

    // Generate AI-powered queries
    const spinner = ora(chalk.gray('🤖 Generating AI-powered search queries...')).start();
    let searchQueries;
    try {
      console.log(chalk.cyan('\n🤖 Calling Gemini AI for query generation...'));
      
      if (dataSource === 'linkedin') {
        if (config._userBasedFlow) {
          // User-based: request 25 queries from Gemini
          console.log(chalk.blue('📝 Requesting 25 LinkedIn queries from Gemini...'));
          searchQueries = await generateQueriesWithGemini(niche, 'linkedin', 25);
        } else {
          console.log(chalk.blue('📝 Requesting LinkedIn queries from Gemini...'));
          searchQueries = await generateQueriesWithGemini(niche, 'linkedin');
        }
      } else {
        console.log(chalk.blue('📝 Requesting Google Search queries from Gemini...'));
        searchQueries = await generateQueriesWithGemini(niche, 'google_search');
      }
      
      spinner.succeed(chalk.green(`✅ Generated ${searchQueries.length} AI-powered queries`));
      
      // Log the generated queries
      console.log(chalk.cyan('\n📋 Generated Queries:'));
      console.log(chalk.gray('─'.repeat(60)));
      searchQueries.forEach((query, index) => {
        console.log(chalk.white(`${index + 1}. ${query}`));
      });
      console.log(chalk.gray('─'.repeat(60)));
      
    } catch (error) {
      console.log(chalk.yellow('⚠️  AI query generation failed, using fallback queries'));
      console.log(chalk.red(`❌ Gemini Error: ${error.message}`));
      
      if (dataSource === 'linkedin' && config._userBasedFlow) {
        searchQueries = config.searchQueries.slice(0, 25); // Use first 25 fallback queries for user-based LinkedIn
        console.log(chalk.yellow('📝 Using 25 fallback LinkedIn queries'));
      } else {
        searchQueries = config.searchQueries.slice(0, 10); // Use first 10 fallback queries
        console.log(chalk.yellow('📝 Using 10 fallback queries'));
      }
      
      // Log fallback queries
      console.log(chalk.cyan('\n📋 Fallback Queries:'));
      console.log(chalk.gray('─'.repeat(60)));
      searchQueries.forEach((query, index) => {
        console.log(chalk.white(`${index + 1}. ${query}`));
      });
      console.log(chalk.gray('─'.repeat(60)));
    }

    console.log(chalk.yellow(`📋 Processing ${searchQueries.length} enhanced queries with ADVANCED extraction...`));
    console.log('');

    // Set up global state for interruption handling
    isProcessing = true;
    currentNiche = niche;
    currentResults = [];
    currentDataType = dataType;

    let allResults = [];

    // Process queries based on data source
    if (dataSource === 'linkedin') {
      allResults = await processLinkedInSearch(searchQueries, niche, contentValidator);
    } else if (dataSource === 'google_search') {
      allResults = await processGoogleSearch(searchQueries, niche, contentValidator, dataType);
    } else if (dataSource === 'all_sources') {
      // Process both Google Search and LinkedIn
      console.log(chalk.blue(`\n🔄 Processing all sources with ADVANCED extraction...`));
      
      const [googleResults, linkedInResults] = await Promise.all([
        processGoogleSearch(searchQueries, niche, contentValidator, dataType),
        processLinkedInSearch(searchQueries, niche, contentValidator)
      ]);
      
      allResults = [...googleResults, ...linkedInResults];
    }

    // Update final results
    currentResults = allResults;
    isProcessing = false;

    // Close readline interface
    rl.close();

    // Save validated results
    if (allResults.length > 0) {
      await saveResults(allResults, niche, false, dataType);
    } else {
      console.log(chalk.yellow('⚠️  No results found to save'));
    }

    // Display API key stats
    const apiStats = getApiKeyStats();
    console.log(chalk.blue.bold('\n🔑 API Key Usage Summary:'));
    console.log(chalk.gray('─'.repeat(40)));
    console.log(chalk.green(`   • Total API Keys: ${apiStats.totalKeys}`));
    console.log(chalk.green(`   • Current Key Index: ${apiStats.currentKeyIndex + 1}`));
    console.log(chalk.yellow(`   • Queries Used: ${apiStats.queriesUsed}`));

  } catch (error) {
    console.error(chalk.red(`❌ Advanced scraper error: ${error.message}`));
    
    // Always try to save results even on error
    if (currentResults.length > 0) {
      console.log(chalk.yellow('\n💾 Attempting to save results despite error...'));
      try {
        await saveResults(currentResults, currentNiche, true, currentDataType);
      } catch (saveError) {
        console.error(chalk.red(`❌ Failed to save results: ${saveError.message}`));
      }
    }
    
    isProcessing = false;
    rl.close();
  }
}

// Run the advanced scraper
main().catch(error => {
  console.error(chalk.red(`❌ Advanced scraper failed: ${error.message}`));
  process.exit(1);
});
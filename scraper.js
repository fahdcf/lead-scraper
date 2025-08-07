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
  console.log(chalk.white('1. Google Search (Business Websites)'));
  console.log(chalk.white('2. LinkedIn (Professional Profiles)'));
  console.log(chalk.white('3. All Sources (Combined Results)'));
  console.log('');
}

/**
 * Display data type options for Google Search
 */
function displayDataTypeOptions() {
  console.log(chalk.cyan('\n📧 Google Search Data Type:'));
  console.log(chalk.gray('─'.repeat(40)));
  console.log(chalk.white('1. Emails Only'));
  console.log(chalk.white('2. Phone Numbers Only'));
  console.log(chalk.white('3. Both Emails and Phone Numbers'));
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
 * Global interruption handler
 */
async function handleGlobalInterruption() {
  console.log(chalk.yellow('\n⚠️  Scraper interrupted by user'));
  
  if (isProcessing && currentResults.length > 0) {
    console.log(chalk.yellow('💾 Saving partial results...'));
    try {
      if (currentDataType === 'linkedin' || (currentResults.length > 0 && currentResults[0].name && currentResults[0].profileUrl)) {
        // Save LinkedIn partial results
        console.log(chalk.blue(`💾 Saving ${currentResults.length} LinkedIn profiles...`));
        const { exportLinkedInToExcel } = await import('./helpers/exportToCsv.js');
        const filename = await exportLinkedInToExcel(currentResults, currentNiche);
        console.log(chalk.green(`✅ LinkedIn partial results saved to: ${filename}`));
      } else {
        // Save Google Search partial results
        await saveResults(currentResults, currentNiche, true, currentDataType);
      }
      console.log(chalk.green('✅ Partial results saved successfully!'));
    } catch (error) {
      console.error(chalk.red(`❌ Failed to save partial results: ${error.message}`));
    }
  } else if (isProcessing) {
    console.log(chalk.yellow('⚠️  Processing in progress but no results yet...'));
  } else {
    console.log(chalk.yellow('⚠️  No active processing to save'));
  }
  
  console.log(chalk.gray('Cleaning up...'));
  process.exit(0);
}

/**
 * Save results with content validation
 */
async function saveResults(allResults, niche, isInterrupted = false, dataType = null) {
  try {
    console.log(chalk.blue(`💾 Saving ${allResults.length} validated results...`));
    
    // Check if this is LinkedIn data
    const isLinkedInData = allResults.length > 0 && allResults[0].name && allResults[0].profileUrl;
    
    if (isLinkedInData) {
      // For LinkedIn data, use Excel format by default
      const filename = niche ? `${niche.replace(/[^a-zA-Z0-9]/g, '_')}_linkedin_results.xlsx` : `linkedin_results_${Date.now()}.xlsx`;
      const finalFilename = isInterrupted ? filename.replace('.xlsx', `_partial_${Date.now()}.xlsx`) : filename;
      
      console.log(chalk.gray(`📁 Saving to: ${finalFilename}`));
      
      // Import and call exportLinkedInToExcel directly to avoid double export
      const { exportLinkedInToExcel } = await import('./helpers/exportToCsv.js');
      const actualFilename = await exportLinkedInToExcel(allResults, niche);
      
      // Verify file was created
      const fs = await import('fs/promises');
      try {
        const stats = await fs.stat(actualFilename);
        console.log(chalk.green(`✅ File verified: ${actualFilename} (${stats.size} bytes)`));
      } catch (statError) {
        console.error(chalk.red(`❌ File verification failed: ${statError.message}`));
        throw new Error(`File was not created: ${actualFilename}`);
      }
      
      // Display LinkedIn summary
      const uniqueProfiles = new Set(allResults.map(r => `${r.name}_${r.profileUrl}`));
      console.log(chalk.blue.bold(`\n📈 ${isInterrupted ? 'Partial' : 'Final'} LinkedIn Scraping Summary:`));
      console.log(chalk.gray('─'.repeat(60)));
      console.log(chalk.green(`   • Total LinkedIn Profiles: ${allResults.length}`));
      console.log(chalk.green(`   • Unique Profiles: ${uniqueProfiles.size}`));
      console.log(chalk.yellow(`   • Content Validation: ENABLED`));
      console.log(chalk.yellow(`   • Target Niche: ${niche}`));
      
      if (isInterrupted) {
        console.log(chalk.yellow(`   • Status: INTERRUPTED - Partial results saved`));
      }
      
      // Display sample results
      if (allResults.length > 0) {
        console.log(chalk.yellow.bold('\n📋 Sample LinkedIn Results:'));
        console.log(chalk.gray('─'.repeat(60)));
        allResults.slice(0, 5).forEach((result, index) => {
          console.log(chalk.gray(`${index + 1}. Name: ${result.name}`));
          console.log(chalk.gray(`   Profile: ${result.profileUrl}`));
          if (result.bio) {
            console.log(chalk.gray(`   Bio: ${result.bio.substring(0, 100)}${result.bio.length > 100 ? '...' : ''}`));
          }
          console.log('');
        });
        
        if (allResults.length > 5) {
          console.log(chalk.gray(`   ... and ${allResults.length - 5} more profiles`));
        }
      }
      
      console.log(chalk.green.bold(`\n✅ LinkedIn results saved to: ${actualFilename}`));
      return actualFilename;
    }
    
    // For Google Search data, handle based on data type selection
    let finalResults = [];
    
    if (dataType === 'emails_only') {
      // Only emails
      finalResults = allResults
        .filter(result => result.email)
        .map(result => ({
          email: result.email,
          phone: null
        }));
    } else if (dataType === 'phones_only') {
      // Only phones
      finalResults = allResults
        .filter(result => result.phone)
        .map(result => ({
          email: null,
          phone: result.phone
        }));
    } else {
      // Both emails and phones (emails first, then phones)
      const emailResults = allResults
        .filter(result => result.email)
        .map(result => ({
          email: result.email,
          phone: null
        }));
      
      const phoneResults = allResults
        .filter(result => result.phone)
        .map(result => ({
          email: null,
          phone: result.phone
        }));
      
      finalResults = [...emailResults, ...phoneResults];
    }

    // Get unique counts for summary
    const uniqueEmails = new Set(allResults.filter(r => r.email).map(r => r.email));
    const uniquePhones = new Set(allResults.filter(r => r.phone).map(r => r.phone));

    // Generate filename
    const filename = niche ? `${niche.replace(/[^a-zA-Z0-9]/g, '_')}_results.txt` : `results_${Date.now()}.txt`;
    
    // Add timestamp if interrupted
    const finalFilename = isInterrupted ? filename.replace('.txt', `_partial_${Date.now()}.txt`) : filename;

    console.log(chalk.gray(`📁 Saving to: ${finalFilename}`));

    // Export results to text format
    await exportResults(finalResults, 'txt', finalFilename, niche);

    // Verify file was created
    const fs = await import('fs/promises');
    try {
      const stats = await fs.stat(finalFilename);
      console.log(chalk.green(`✅ Text file verified: ${finalFilename} (${stats.size} bytes)`));
    } catch (statError) {
      console.error(chalk.red(`❌ File verification failed: ${statError.message}`));
      throw new Error(`File was not created: ${finalFilename}`);
    }

         // Display summary with validation stats
     console.log(chalk.blue.bold(`\n📈 ${isInterrupted ? 'Partial' : 'Final'} Scraping Summary:`));
     console.log(chalk.gray('─'.repeat(60)));
     console.log(chalk.green(`   • Total Email Entries: ${allResults.filter(r => r.email).length}`));
     console.log(chalk.green(`   • Total Phone Entries: ${allResults.filter(r => r.phone).length}`));
     console.log(chalk.green(`   • Unique Emails Found: ${uniqueEmails.size}`));
     console.log(chalk.green(`   • Unique Phones Found: ${uniquePhones.size}`));
     console.log(chalk.green(`   • Final Results: ${finalResults.length} entries`));
     console.log(chalk.yellow(`   • Content Validation: ENABLED`));
     console.log(chalk.yellow(`   • Target Niche: ${niche}`));
     console.log(chalk.blue(`   • Output Format: TEXT FILE`));
    
    if (dataType) {
      console.log(chalk.blue(`   • Data Type: ${dataType.replace(/_/g, ' ').toUpperCase()}`));
    }
    
    if (isInterrupted) {
      console.log(chalk.yellow(`   • Status: INTERRUPTED - Partial results saved`));
    }

    // Display sample results
    if (finalResults.length > 0) {
      console.log(chalk.yellow.bold('\n📋 Sample Results (Content Validated):'));
      console.log(chalk.gray('─'.repeat(60)));
      finalResults.slice(0, 10).forEach((result, index) => {
        const dataType = result.email ? 'Email' : 'Phone';
        const data = result.email || result.phone;
        console.log(chalk.gray(`${index + 1}. ${dataType}: ${data}`));
      });
      
      if (finalResults.length > 10) {
        console.log(chalk.gray(`   ... and ${finalResults.length - 10} more results`));
      }
    }

    console.log(chalk.green.bold(`\n✅ Validated results saved to: ${finalFilename}`));
    return finalFilename;

  } catch (error) {
    console.error(chalk.red(`❌ Error saving results: ${error.message}`));
    throw error;
  }
}

/**
 * Process LinkedIn search queries
 */
async function processLinkedInSearch(searchQueries, niche, contentValidator) {
  console.log(chalk.blue(`\n🔗 Processing ${searchQueries.length} LinkedIn queries...`));
  
  const allResults = [];
  let processedQueries = 0;
  let successfulQueries = 0;

  // Set global state for LinkedIn
  isProcessing = true;
  currentResults = [];
  currentNiche = niche;
  currentDataType = 'linkedin';

  for (const query of searchQueries) {
    processedQueries++;
    const querySpinner = ora(chalk.blue(`🔍 LinkedIn Query ${processedQueries}/${searchQueries.length}: "${query}"`)).start();

    try {
      // Search LinkedIn profiles with callback for real-time updates
      const linkedInResults = await searchLinkedIn(query, niche, (profileInfo) => {
        // Add profile to allResults and update global state immediately
        if (profileInfo && profileInfo.name) {
          const profileData = {
            name: profileInfo.name,
            profileUrl: profileInfo.profileUrl,
            bio: profileInfo.bio,
            source: 'linkedin',
            isCompanyPage: profileInfo.isCompanyPage
          };
          allResults.push(profileData);
          currentResults = allResults; // Update global state immediately
        }
      });
      
      if (linkedInResults.length === 0) {
        querySpinner.warn(chalk.yellow(`⚠️  No LinkedIn profiles found for: "${query}"`));
        continue;
      }

      querySpinner.text = chalk.blue(`👥 Processing ${linkedInResults.length} LinkedIn profiles for: "${query}"`);

      querySpinner.succeed(chalk.green(`✅ LinkedIn query "${query}" completed - Found ${linkedInResults.length} profiles`));
      successfulQueries++;

    } catch (error) {
      querySpinner.fail(chalk.red(`❌ LinkedIn query "${query}" failed: ${error.message}`));
    }
  }

  console.log(chalk.blue(`\n📊 LinkedIn Search Summary:`));
  console.log(chalk.green(`   • Queries Processed: ${processedQueries}/${searchQueries.length}`));
  console.log(chalk.green(`   • Successful Queries: ${successfulQueries}`));
  console.log(chalk.green(`   • Total LinkedIn Profiles: ${allResults.length}`));

  // Reset global state after processing is complete
  isProcessing = false;
  currentResults = [];
  currentNiche = '';
  currentDataType = null;

  return allResults;
}

/**
 * Process Google Search queries
 */
async function processGoogleSearch(searchQueries, niche, contentValidator, dataType = 'both') {
  console.log(chalk.blue(`\n🌐 Processing ${searchQueries.length} Google Search queries...`));
  const allResults = [];
  let processedQueries = 0;
  let successfulQueries = 0;
  let validatedResults = 0;
  let rejectedResults = 0;

  // Process each query with content validation
  for (const query of searchQueries) {
    processedQueries++;
    const querySpinner = ora(chalk.blue(`🔍 Query ${processedQueries}/${searchQueries.length}: "${query}"`)).start();

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
      querySpinner.text = chalk.blue(`🌐 Processing ${filteredUrls.length} high-quality URLs for: "${query}"`);
      let queryResults = 0;
      let queryValidated = 0;
      let queryRejected = 0;
      // Process each URL with content validation
      for (let i = 0; i < filteredUrls.length; i++) {
        const urlData = filteredUrls[i];
        const url = urlData.url;
        querySpinner.text = chalk.blue(`🌐 Scraping (${i + 1}/${filteredUrls.length}): ${url} (Score: ${urlData.score})`);
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
        // Enhanced email and phone extraction
        const emails = extractEmails(html);
        const phones = extractPhones(html);
        // Validate extracted contact data
        const contactValidation = contentValidator.validateContactData(emails, phones, url);
        // Add validated results based on data type selection
        if (dataType === 'emails_only' || dataType === 'both') {
          contactValidation.validEmails.forEach(email => {
            allResults.push({
              email: email.toLowerCase(),
              phone: null,
              url: url,
              query: query,
              score: urlData.score,
              validationScore: validation.score,
              source: 'google_search'
            });
          });
          queryValidated += contactValidation.validEmails.length;
          validatedResults += contactValidation.validEmails.length;
        }
        if (dataType === 'phones_only' || dataType === 'both') {
          contactValidation.validPhones.forEach(phone => {
            allResults.push({
              email: null,
              phone: phone,
              url: url,
              query: query,
              score: urlData.score,
              validationScore: validation.score,
              source: 'google_search'
            });
          });
          queryValidated += contactValidation.validPhones.length;
          validatedResults += contactValidation.validPhones.length;
        }
        // Enhanced delay between requests
        if (i < filteredUrls.length - 1) {
          await delay(config.http.delayBetweenRequests);
        }
      }
      // Update global state for interruption handling
      currentResults = allResults;
      querySpinner.succeed(chalk.green(`✅ Query "${query}" completed - Found ${queryValidated} validated contacts, rejected ${queryRejected} irrelevant`));
      successfulQueries++;
    } catch (error) {
      querySpinner.fail(chalk.red(`❌ Query "${query}" failed: ${error.message}`));
    }
  }
  // Deduplicate results
  const uniqueResults = deduplicateGoogleSearchResults(allResults);
  const duplicatesRemoved = allResults.length - uniqueResults.length;
  console.log(chalk.blue(`\n📊 Google Search Summary:`));
  console.log(chalk.green(`   • Queries Processed: ${processedQueries}/${searchQueries.length}`));
  console.log(chalk.green(`   • Successful Queries: ${successfulQueries}`));
  console.log(chalk.green(`   • Validated Results: ${validatedResults}`));
  console.log(chalk.yellow(`   • Rejected Results: ${rejectedResults}`));
  console.log(chalk.blue(`   • Data Type: ${dataType.replace(/_/g, ' ').toUpperCase()}`));
  console.log(chalk.green(`   • Unique Results: ${uniqueResults.length}`));
  console.log(chalk.yellow(`   • Duplicates Removed: ${duplicatesRemoved}`));
  return uniqueResults;
}

/**
 * Deduplicate Google Search results
 * @param {Array} results - Array of search results
 * @returns {Array} Deduplicated results
 */
function deduplicateGoogleSearchResults(results) {
  const seen = new Set();
  const uniqueResults = [];
  
  for (const result of results) {
    let key;
    if (result.email) {
      key = `email:${result.email.toLowerCase()}`;
    } else if (result.phone) {
      key = `phone:${result.phone}`;
    } else {
      continue; // Skip results without email or phone
    }
    
    if (!seen.has(key)) {
      seen.add(key);
      uniqueResults.push(result);
    }
  }
  
  return uniqueResults;
}

/**
 * Main scraper function
 */
async function main() {
  console.log(chalk.blue.bold('🚀 Universal Morocco Web Scraper Starting...\n'));

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
    console.log(chalk.cyan(`\n📊 Selected data source: ${dataSource.toUpperCase()}`));

    // Get data type selection for Google Search
    let dataType = null;
    if (dataSource === 'google_search' || dataSource === 'all_sources') {
      dataType = await getDataTypeSelection(rl);
      console.log(chalk.cyan(`\n📧 Selected Google Search data type: ${dataType.replace(/_/g, ' ').toUpperCase()}`));
    }

    // Initialize content validator
    const contentValidator = new ContentValidator(niche);
    console.log(chalk.cyan(`🔍 Content validation enabled for: ${niche}`));
    console.log(chalk.gray(`   Target keywords: ${contentValidator.nicheKeywords.join(', ')}`));


    // Generate AI-powered queries
    const spinner = ora(chalk.gray('🤖 Generating AI-powered search queries...')).start();
    let searchQueries;
    try {
      if (dataSource === 'linkedin') {
        if (config._userBasedFlow) {
          // User-based: request 25 queries from Gemini
          searchQueries = await generateQueriesWithGemini(niche, 'linkedin', 25);
        } else {
          searchQueries = await generateQueriesWithGemini(niche, 'linkedin');
        }
      } else {
        searchQueries = await generateQueriesWithGemini(niche, 'google_search');
      }
      spinner.succeed(chalk.green(`✅ Generated ${searchQueries.length} AI-powered queries`));
    } catch (error) {
      console.log(chalk.yellow('⚠️  AI query generation failed, using fallback queries'));
      if (dataSource === 'linkedin' && config._userBasedFlow) {
        searchQueries = config.searchQueries.slice(0, 25); // Use first 25 fallback queries for user-based LinkedIn
      } else {
        searchQueries = config.searchQueries.slice(0, 10); // Use first 10 fallback queries
      }
    }

    console.log(chalk.yellow(`📋 Processing ${searchQueries.length} enhanced queries...`));
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
      console.log(chalk.blue(`\n🔄 Processing all sources...`));
      
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
    console.error(chalk.red(`❌ Scraper error: ${error.message}`));
    isProcessing = false;
    rl.close();
  }
}

// Run the scraper

// Run the scraper
main().catch(error => {
  console.error(chalk.red(`❌ Scraper failed: ${error.message}`));
  process.exit(1);
}); 
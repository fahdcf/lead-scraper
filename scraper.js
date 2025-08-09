#!/usr/bin/env node

import chalk from 'chalk';
import ora from 'ora';
import { initializeConfig, config } from './config.js';
import { searchGoogle, filterUrls, getApiKeyStats } from './helpers/googleSearch.js';
import { fetchPage, delay } from './helpers/fetchPage.js';
import { extractEmails } from './helpers/extractEmails.js';
import { extractPhones } from './helpers/extractPhones.js';
import { exportResults } from './helpers/exportToCsv.js';
import { generateQueriesWithGemini, analyzeAndFilterData } from './helpers/geminiAI.js';
import { searchLinkedIn } from './helpers/multiSourceSearch.js';
import { ContentValidator } from './helpers/contentValidator.js';
import readline from 'readline';

// Global state for interruption handling and auto-save
let isProcessing = false;
let currentResults = [];
let currentNiche = '';
let currentDataType = null;
let autoSaveInterval = null;
let lastAutoSaveTime = 0;
const AUTO_SAVE_INTERVAL = 120000; // 120 seconds in milliseconds

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
 * Start auto-save functionality
 */
function startAutoSave() {
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval);
  }
  
  autoSaveInterval = setInterval(async () => {
    try {
      if (isProcessing && currentResults && currentResults.length > 0) {
        await performAutoSave();
      }
    } catch (intervalError) {
      console.error(chalk.red(`❌ Auto-save interval error: ${intervalError.message}`));
      // Don't let interval errors crash the process
    }
  }, AUTO_SAVE_INTERVAL);
  
  console.log(chalk.cyan(`🔄 Auto-save enabled: Saving every ${AUTO_SAVE_INTERVAL / 1000} seconds`));
}

/**
 * Stop auto-save functionality
 */
function stopAutoSave() {
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval);
    autoSaveInterval = null;
    console.log(chalk.cyan('🔄 Auto-save disabled'));
  }
}

/**
 * Perform auto-save of current results
 */
async function performAutoSave() {
  try {
    const now = Date.now();
    if (now - lastAutoSaveTime < AUTO_SAVE_INTERVAL) {
      return; // Don't auto-save too frequently
    }
    
    // Don't auto-save if no results yet
    if (!currentResults || currentResults.length === 0) {
      return;
    }
    
    console.log(chalk.yellow(`\n💾 Auto-saving ${currentResults.length} results...`));
    
    if (currentDataType === 'linkedin' || (currentResults.length > 0 && currentResults[0].name && currentResults[0].profileUrl)) {
      // Auto-save LinkedIn results
      const { exportLinkedInToExcel } = await import('./helpers/exportToCsv.js');
      const filename = `${currentNiche.replace(/[^a-zA-Z0-9]/g, '_')}_linkedin_results_autosave.xlsx`;
      await exportLinkedInToExcel(currentResults, currentNiche, filename);
      console.log(chalk.green(`✅ Auto-saved LinkedIn results to: ${filename}`));
    } else {
      // Auto-save Google Search results (without AI analysis for speed)
      await saveResultsAutoSave(currentResults, currentNiche, currentDataType);
    }
    
    lastAutoSaveTime = now;
  } catch (error) {
    console.error(chalk.red(`❌ Auto-save failed: ${error.message}`));
    // Don't let auto-save errors crash the main process
    console.error(chalk.gray('Auto-save error details:', error.stack));
  }
}

/**
 * Save results for auto-save (without AI analysis)
 */
async function saveResultsAutoSave(allResults, niche, dataType = null) {
  try {
    // Apply enhanced deduplication for Google Search results
    const deduplicatedResults = deduplicateGoogleSearchResults(allResults);
    
    // For Google Search data, handle based on data type selection
    let finalResults = [];
    
    if (dataType === 'emails_only') {
      finalResults = deduplicatedResults
        .filter(result => result.email)
        .map(result => ({
          email: result.email,
          phone: null
        }));
    } else if (dataType === 'phones_only') {
      finalResults = deduplicatedResults
        .filter(result => result.phone)
        .map(result => ({
          email: null,
          phone: result.phone
        }));
    } else {
      const emailResults = deduplicatedResults
        .filter(result => result.email)
        .map(result => ({
          email: result.email,
          phone: null
        }));
      
      const phoneResults = deduplicatedResults
        .filter(result => result.phone)
        .map(result => ({
          email: null,
          phone: result.phone
        }));
      
      finalResults = [...emailResults, ...phoneResults];
    }

    // Generate filename for auto-save
    const filename = `${niche.replace(/[^a-zA-Z0-9]/g, '_')}_results_autosave.txt`;
    
    // Export results to text format
    const { exportResults } = await import('./helpers/exportToCsv.js');
    await exportResults(finalResults, 'txt', filename, niche);
    
    console.log(chalk.green(`✅ Auto-saved Google Search results to: ${filename}`));
    
  } catch (error) {
    console.error(chalk.red(`❌ Error in auto-save: ${error.message}`));
    throw error;
  }
}

/**
 * Global interruption handler
 */
async function handleGlobalInterruption() {
  console.log(chalk.yellow('\n⚠️  Scraper interrupted by user'));
  
  // Stop auto-save
  stopAutoSave();
  
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
    console.log(chalk.blue(`💾 Processing ${allResults.length} validated results...`));
    
    // Determine data source type for AI analysis
    const isLinkedInData = allResults.length > 0 && allResults[0].name && allResults[0].profileUrl;
    const sourceType = isLinkedInData ? 'linkedin' : 'google_search';
    
    // Apply AI analysis and filtering before saving
    console.log(chalk.cyan(`\n🤖 Applying AI-powered data analysis and filtering for ${sourceType.toUpperCase()}...`));
    const aiAnalysis = await analyzeAndFilterData(allResults, niche, sourceType);
    
    // Use filtered results
    const aiFilteredResults = aiAnalysis.filteredResults;
    console.log(chalk.green(`✅ AI analysis completed - ${aiFilteredResults.length} results after filtering`));
    
    console.log(chalk.blue(`💾 Saving ${aiFilteredResults.length} AI-filtered results...`));
    
          if (isLinkedInData) {
        // For LinkedIn data, use Excel format by default
        const filename = niche ? `${niche.replace(/[^a-zA-Z0-9]/g, '_')}_linkedin_results.xlsx` : `linkedin_results_${Date.now()}.xlsx`;
        const finalFilename = isInterrupted ? filename.replace('.xlsx', `_partial_${Date.now()}.xlsx`) : filename;
        
        console.log(chalk.gray(`📁 Saving to: ${finalFilename}`));
        
        // Import and call exportLinkedInToExcel directly to avoid double export
        const { exportLinkedInToExcel } = await import('./helpers/exportToCsv.js');
        const actualFilename = await exportLinkedInToExcel(aiFilteredResults, niche);
      
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
      const uniqueProfiles = new Set(aiFilteredResults.map(r => `${r.name}_${r.profileUrl}`));
      console.log(chalk.blue.bold(`\n📈 ${isInterrupted ? 'Partial' : 'Final'} LinkedIn Scraping Summary:`));
      console.log(chalk.gray('─'.repeat(60)));
      console.log(chalk.green(`   • Total LinkedIn Profiles: ${allResults.length}`));
      console.log(chalk.green(`   • AI-Filtered Profiles: ${aiFilteredResults.length}`));
      console.log(chalk.green(`   • Unique Profiles: ${uniqueProfiles.size}`));
      console.log(chalk.green(`   • Duplicates Removed: ${aiAnalysis.analysis.duplicatesRemoved || 0}`));
      console.log(chalk.yellow(`   • Content Validation: ENABLED`));
      console.log(chalk.yellow(`   • AI Analysis: ENABLED (LinkedIn-specific)`));
      console.log(chalk.yellow(`   • Target Niche: ${niche}`));
      
      if (isInterrupted) {
        console.log(chalk.yellow(`   • Status: INTERRUPTED - Partial results saved`));
      }
      
      // Display sample results
      if (aiFilteredResults.length > 0) {
        console.log(chalk.yellow.bold('\n📋 Sample AI-Filtered LinkedIn Results:'));
        console.log(chalk.gray('─'.repeat(60)));
        aiFilteredResults.slice(0, 5).forEach((result, index) => {
          console.log(chalk.gray(`${index + 1}. Name: ${result.name}`));
          console.log(chalk.gray(`   Profile: ${result.profileUrl}`));
          if (result.bio) {
            console.log(chalk.gray(`   Bio: ${result.bio.substring(0, 100)}${result.bio.length > 100 ? '...' : ''}`));
          }
          console.log('');
        });
        
        if (aiFilteredResults.length > 5) {
          console.log(chalk.gray(`   ... and ${aiFilteredResults.length - 5} more profiles`));
        }
      }
      
      console.log(chalk.green.bold(`\n✅ LinkedIn results saved to: ${actualFilename}`));
      return actualFilename;
    }
    
    // Apply enhanced deduplication for Google Search results
    const deduplicatedResults = deduplicateGoogleSearchResults(aiFilteredResults);
    
    // For Google Search data, handle based on data type selection
    let finalResults = [];
    
    if (dataType === 'emails_only') {
      // Only emails
      finalResults = deduplicatedResults
        .filter(result => result.email)
        .map(result => ({
          email: result.email,
          phone: null
        }));
    } else if (dataType === 'phones_only') {
      // Only phones
      finalResults = deduplicatedResults
        .filter(result => result.phone)
        .map(result => ({
          email: null,
          phone: result.phone
        }));
    } else {
      // Both emails and phones (emails first, then phones)
      const emailResults = deduplicatedResults
        .filter(result => result.email)
        .map(result => ({
          email: result.email,
          phone: null
        }));
      
      const phoneResults = deduplicatedResults
        .filter(result => result.phone)
        .map(result => ({
          email: null,
          phone: result.phone
        }));
      
      finalResults = [...emailResults, ...phoneResults];
    }

    // Get unique counts for summary (after deduplication)
    const uniqueEmails = new Set(deduplicatedResults.filter(r => r.email).map(r => r.email));
    const uniquePhones = new Set(deduplicatedResults.filter(r => r.phone).map(r => r.phone));

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

         // Display summary with validation and deduplication stats
     console.log(chalk.blue.bold(`\n📈 ${isInterrupted ? 'Partial' : 'Final'} Google Search Scraping Summary:`));
     console.log(chalk.gray('─'.repeat(60)));
     console.log(chalk.green(`   • Total Email Entries: ${allResults.filter(r => r.email).length}`));
     console.log(chalk.green(`   • Total Phone Entries: ${allResults.filter(r => r.phone).length}`));
     console.log(chalk.green(`   • AI-Filtered Emails: ${aiFilteredResults.filter(r => r.email).length}`));
     console.log(chalk.green(`   • AI-Filtered Phones: ${aiFilteredResults.filter(r => r.phone).length}`));
     console.log(chalk.green(`   • Unique Emails Found: ${uniqueEmails.size}`));
     console.log(chalk.green(`   • Unique Phones Found: ${uniquePhones.size}`));
     console.log(chalk.green(`   • Final Results: ${finalResults.length} entries`));
     console.log(chalk.yellow(`   • Content Validation: ENABLED`));
     console.log(chalk.yellow(`   • AI Analysis: ENABLED (Google Search-specific)`));
     console.log(chalk.yellow(`   • Enhanced Deduplication: ENABLED`));
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
      console.log(chalk.yellow.bold('\n📋 Sample Results (AI-Filtered & Content Validated):'));
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

    console.log(chalk.green.bold(`\n✅ AI-filtered and validated results saved to: ${finalFilename}`));
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

  return allResults;
}

/**
 * Process Google Search queries
 */
async function processGoogleSearch(searchQueries, niche, contentValidator, dataType = 'both') {
  console.log(chalk.blue(`\n🌐 Processing ${searchQueries.length} Google Search queries (2 pages each)...`));
  const allResults = [];
  let processedQueries = 0;
  let successfulQueries = 0;
  let validatedResults = 0;
  let rejectedResults = 0;

  // Process each query with content validation
  for (const query of searchQueries) {
    processedQueries++;
    const querySpinner = ora(chalk.blue(`🔍 Query ${processedQueries}/${searchQueries.length}: "${query}" (2 pages)`)).start();

    try {
      // Enhanced Google search with better targeting - Always search 2 pages per query
      let searchResults = [];
      for (let start = 1; start <= 2; start++) {
        const pageResults = await searchGoogle(query, 10, (start - 1) * 10 + 1);
        if (Array.isArray(pageResults)) searchResults.push(...pageResults);
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
  // Enhanced deduplication with detailed statistics
  const uniqueResults = deduplicateGoogleSearchResults(allResults);
  const duplicatesRemoved = allResults.length - uniqueResults.length;
  
  console.log(chalk.blue(`\n📊 Google Search Summary:`));
  console.log(chalk.green(`   • Queries Processed: ${processedQueries}/${searchQueries.length}`));
  console.log(chalk.green(`   • Pages Per Query: 2 (20 results per query)`));
  console.log(chalk.green(`   • Total Pages Searched: ${processedQueries * 2}`));
  console.log(chalk.green(`   • Successful Queries: ${successfulQueries}`));
  console.log(chalk.green(`   • Validated Results: ${validatedResults}`));
  console.log(chalk.yellow(`   • Rejected Results: ${rejectedResults}`));
  console.log(chalk.blue(`   • Data Type: ${dataType.replace(/_/g, ' ').toUpperCase()}`));
  console.log(chalk.green(`   • Unique Results: ${uniqueResults.length}`));
  console.log(chalk.yellow(`   • Duplicates Removed: ${duplicatesRemoved}`));
  console.log(chalk.cyan(`   • Enhanced Deduplication: ENABLED`));
  console.log(chalk.cyan(`   • AI Analysis: PENDING (will be applied before saving)`));
  
  return uniqueResults;
}
function deduplicateGoogleSearchResults(results) {
  const seenEmails = new Set();
  const seenPhones = new Set();
  const uniqueResults = [];
  
  for (const result of results) {
    let isDuplicate = false;
    let normalizedEmail = null;
    let normalizedPhone = null;
    
    // Normalize and check email
    if (result.email) {
      normalizedEmail = result.email.toLowerCase().trim();
      // Remove common email variations
      normalizedEmail = normalizedEmail.replace(/\+[^@]+@/, '@'); // Remove +tags
      
      if (seenEmails.has(normalizedEmail)) {
        isDuplicate = true;
      } else {
        seenEmails.add(normalizedEmail);
      }
    }
    
    // Normalize and check phone
    if (result.phone) {
      normalizedPhone = normalizePhoneNumber(result.phone);
      
      if (seenPhones.has(normalizedPhone)) {
        isDuplicate = true;
      } else {
        seenPhones.add(normalizedPhone);
      }
    }
    
    // Only add if not a duplicate and has valid contact info
    if (!isDuplicate && (normalizedEmail || normalizedPhone)) {
      uniqueResults.push({
        ...result,
        email: normalizedEmail || result.email,
        phone: normalizedPhone || result.phone
      });
    }
  }
  
  console.log(chalk.cyan(`📊 Deduplication: ${results.length} → ${uniqueResults.length} unique results`));
  console.log(chalk.gray(`   • Unique emails: ${seenEmails.size}`));
  console.log(chalk.gray(`   • Unique phones: ${seenPhones.size}`));
  
  return uniqueResults;
}

/**
 * Normalize phone number to standard format
 */
function normalizePhoneNumber(phone) {
  if (!phone) return null;
  
  // Remove all non-digit characters except +
  let normalized = phone.replace(/[^\d+]/g, '');
  
  // Handle Moroccan phone numbers
  if (normalized.startsWith('+212')) {
    return normalized; // Already in international format
  } else if (normalized.startsWith('212')) {
    return '+' + normalized; // Add + prefix
  } else if (normalized.startsWith('0') && normalized.length === 10) {
    return '+212' + normalized.substring(1); // Convert 0XXXXXXXXX to +212XXXXXXXXX
  } else if (normalized.length === 9 && (normalized.startsWith('6') || normalized.startsWith('7'))) {
    return '+212' + normalized; // Convert 6XXXXXXXX or 7XXXXXXXX to +2126XXXXXXXX
  }
  
  // For other international numbers, ensure they start with +
  if (normalized.startsWith('00')) {
    return '+' + normalized.substring(2);
  }
  
  return normalized;
}

/**
 * Main scraper function
 */
async function main() {
  console.log(chalk.blue.bold('🚀 Universal Morocco Web Scraper Starting...\n'));

  // Set up global error handlers
  process.on('unhandledRejection', (reason, promise) => {
    console.error(chalk.red('❌ Unhandled Promise Rejection:'));
    console.error(chalk.red('Reason:', reason));
    console.error(chalk.red('Promise:', promise));
    // Don't exit, just log the error
  });

  process.on('uncaughtException', (error) => {
    console.error(chalk.red('❌ Uncaught Exception:'));
    console.error(chalk.red('Error:', error.message));
    console.error(chalk.red('Stack:', error.stack));
    // Don't exit, just log the error
  });

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

    // Start auto-save functionality
    startAutoSave();

    let allResults = [];

    // Process queries based on data source
    try {
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
    } catch (processingError) {
      console.error(chalk.red(`❌ Processing error: ${processingError.message}`));
      console.error(chalk.gray('Processing error details:', processingError.stack));
      // Continue with whatever results we have
      allResults = allResults || [];
    }

    // Update final results
    currentResults = allResults;
    isProcessing = false;

    // Stop auto-save
    stopAutoSave();

    // Close readline interface
    rl.close();

    // Save validated results
    try {
      if (allResults.length > 0) {
        await saveResults(allResults, niche, false, dataType);
      } else {
        console.log(chalk.yellow('⚠️  No results found to save'));
      }
    } catch (saveError) {
      console.error(chalk.red(`❌ Save error: ${saveError.message}`));
      console.error(chalk.gray('Save error details:', saveError.stack));
      // Try to save without AI analysis as fallback
      try {
        console.log(chalk.yellow('🔄 Attempting fallback save without AI analysis...'));
        await saveResultsAutoSave(allResults, niche, dataType);
      } catch (fallbackError) {
        console.error(chalk.red(`❌ Fallback save also failed: ${fallbackError.message}`));
      }
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
    stopAutoSave();
    rl.close();
  }
}

// Run the scraper

// Run the scraper
main().catch(error => {
  console.error(chalk.red(`❌ Scraper failed: ${error.message}`));
  console.error(chalk.gray('Full error stack:', error.stack));
  process.exit(1);
});

// Add a timeout to prevent hanging (30 minutes)
setTimeout(() => {
  console.error(chalk.red('❌ Scraper timeout after 30 minutes'));
  process.exit(1);
}, 30 * 60 * 1000); 
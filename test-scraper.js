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
 * Save test results with data source info
 */
async function saveTestResults(allResults, niche, dataSource) {
  try {
    console.log(chalk.blue(`💾 Saving ${allResults.length} test results...`));
    
    // Create final results based on data source
    let finalResults = [];
    
    if (dataSource === 'linkedin') {
      // LinkedIn format: Name, Profile URL, Bio/Tags
      finalResults = allResults.map(result => ({
        full_name: result.name || '',
        profile_url: result.profileUrl || '',
        bio: result.bio || '',
        niche: niche
      }));
    } else {
      // Google Search format: Email, Phone
      finalResults = allResults.map(result => ({
        email: result.email || '',
        phone: result.phone || '',
        niche: niche
      }));
    }

    // Get unique counts for summary
    const uniqueEmails = new Set(allResults.filter(r => r.email).map(r => r.email));
    const uniquePhones = new Set(allResults.filter(r => r.phone).map(r => r.phone));
    const uniqueNames = new Set(allResults.filter(r => r.name).map(r => r.name));

    // Generate filename with data source
    const sourceSuffix = dataSource === 'all_sources' ? 'all_sources' : dataSource;
    const filename = niche ? `test_${niche.replace(/[^a-zA-Z0-9]/g, '_')}_${sourceSuffix}_results.csv` : `test_${sourceSuffix}_results.csv`;
    
    console.log(chalk.gray(`📁 Saving to: ${filename}`));

    // Export results
    const finalFilename = await exportResults(finalResults, 'csv', filename);

    // Display summary based on data source
    console.log(chalk.blue.bold(`\n📈 Test Results Summary (${dataSource.toUpperCase()}):`));
    console.log(chalk.gray('─'.repeat(60)));
    
    if (dataSource === 'linkedin') {
      console.log(chalk.green(`   • Total LinkedIn Profiles: ${allResults.length}`));
      console.log(chalk.green(`   • Unique Names Found: ${uniqueNames.size}`));
      console.log(chalk.green(`   • Profiles with Bio: ${allResults.filter(r => r.bio).length}`));
    } else {
      console.log(chalk.green(`   • Total Email Entries: ${allResults.filter(r => r.email).length}`));
      console.log(chalk.green(`   • Total Phone Entries: ${allResults.filter(r => r.phone).length}`));
      console.log(chalk.green(`   • Unique Emails Found: ${uniqueEmails.size}`));
      console.log(chalk.green(`   • Unique Phones Found: ${uniquePhones.size}`));
    }
    
    console.log(chalk.green(`   • Final Results: ${finalResults.length} rows`));
    console.log(chalk.yellow(`   • Data Source: ${dataSource.toUpperCase()}`));
    console.log(chalk.yellow(`   • Target Niche: ${niche}`));
    console.log(chalk.cyan(`   • Output Format: CSV (.csv)`));

    // Display sample results
    if (finalResults.length > 0) {
      console.log(chalk.yellow.bold('\n📋 Sample Results:'));
      console.log(chalk.gray('─'.repeat(60)));
      finalResults.slice(0, 5).forEach((result, index) => {
        if (dataSource === 'linkedin') {
          console.log(chalk.gray(`${index + 1}. Name: ${result.full_name}`));
          console.log(chalk.gray(`   Bio: ${result.bio.substring(0, 50)}...`));
        } else {
          const dataType = result.email ? 'Email' : 'Phone';
          const data = result.email || result.phone;
          console.log(chalk.gray(`${index + 1}. ${dataType}: ${data}`));
        }
      });
      
      if (finalResults.length > 5) {
        console.log(chalk.gray(`   ... and ${finalResults.length - 5} more results`));
      }
    }

    console.log(chalk.green.bold(`\n✅ Test results saved to: ${finalFilename}`));
    return finalFilename;

  } catch (error) {
    console.error(chalk.red(`❌ Error saving test results: ${error.message}`));
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
      // Search LinkedIn profiles
      const linkedInResults = await searchLinkedIn(query);
      
      if (linkedInResults.length === 0) {
        querySpinner.warn(chalk.yellow(`⚠️  No LinkedIn profiles found for: "${query}"`));
        continue;
      }

      querySpinner.text = chalk.blue(`👥 Processing ${linkedInResults.length} LinkedIn profiles for: "${query}"`);

      // Process each LinkedIn profile
      for (const profile of linkedInResults) {
        if (profile && profile.name) {
          allResults.push({
            name: profile.name,
            profileUrl: profile.profileUrl,
            bio: profile.bio,
            source: 'linkedin',
            query: query
          });
        }
      }

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
 * Main test scraper function
 */
async function testScraper() {
  console.log(chalk.blue.bold('🧪 Test Scraper Starting...\n'));

  // Initialize configuration
  await initializeConfig();

  const rl = createReadlineInterface();

  try {
    // Get user input for niche
    const niche = await getUserInput(rl, chalk.yellow('🎯 Enter the business niche to test (e.g., "website developers in Casablanca"): '));
    
    if (!niche) {
      console.log(chalk.red('❌ No niche provided. Exiting.'));
      rl.close();
      return;
    }

    console.log(chalk.blue(`\n🎯 Testing: ${niche}`));
    console.log(chalk.gray('─'.repeat(60)));

    // Get data source selection
    const dataSource = await getDataSourceSelection(rl);
    console.log(chalk.cyan(`\n📊 Selected data source: ${dataSource.toUpperCase()}`));

    // Initialize content validator
    const contentValidator = new ContentValidator(niche);
    console.log(chalk.cyan(`🔍 Content validation enabled for: ${niche}`));

    // Generate AI-powered queries
    const spinner = ora(chalk.gray('🤖 Generating AI-powered search queries...')).start();
    
    let searchQueries;
    try {
      if (dataSource === 'linkedin') {
        searchQueries = await generateQueriesWithGemini(niche, 'linkedin');
      } else {
        searchQueries = await generateQueriesWithGemini(niche, 'google_search');
      }
      spinner.succeed(chalk.green(`✅ Generated ${searchQueries.length} AI-powered queries`));
    } catch (error) {
      console.log(chalk.yellow('⚠️  AI query generation failed, using fallback queries'));
      searchQueries = config.searchQueries.slice(0, 5); // Use first 5 fallback queries
    }

    console.log(chalk.yellow(`📋 Processing ${searchQueries.length} test queries...`));
    console.log('');

    let allResults = [];

    // Process queries based on data source
    if (dataSource === 'linkedin') {
      allResults = await processLinkedInSearch(searchQueries, niche, contentValidator);
    } else if (dataSource === 'google_search') {
      allResults = await processGoogleSearch(searchQueries, niche, contentValidator);
    } else if (dataSource === 'all_sources') {
      // Process both Google Search and LinkedIn
      console.log(chalk.blue(`\n🔄 Processing all sources...`));
      
      const [googleResults, linkedInResults] = await Promise.all([
        processGoogleSearch(searchQueries, niche, contentValidator),
        processLinkedInSearch(searchQueries, niche, contentValidator)
      ]);
      
      allResults = [...googleResults, ...linkedInResults];
    }

    // Close readline interface
    rl.close();

    // Save test results
    if (allResults.length > 0) {
      await saveTestResults(allResults, niche, dataSource);
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
    console.error(chalk.red(`❌ Test scraper error: ${error.message}`));
    rl.close();
  }
}

/**
 * Process Google Search queries
 */
async function processGoogleSearch(searchQueries, niche, contentValidator) {
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
      const searchResults = await searchGoogle(query);
      
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
            await delay(1000); // Wait before retry
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
        
        // Add validated results
        if (contactValidation.validEmails.length > 0 || contactValidation.validPhones.length > 0) {
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
          
          queryValidated += contactValidation.validEmails.length + contactValidation.validPhones.length;
          validatedResults += contactValidation.validEmails.length + contactValidation.validPhones.length;
        }

        // Enhanced delay between requests
        if (i < filteredUrls.length - 1) {
          await delay(config.http.delayBetweenRequests);
        }
      }

      querySpinner.succeed(chalk.green(`✅ Query "${query}" completed - Found ${queryValidated} validated contacts, rejected ${queryRejected} irrelevant`));
      successfulQueries++;

    } catch (error) {
      querySpinner.fail(chalk.red(`❌ Query "${query}" failed: ${error.message}`));
    }
  }

  console.log(chalk.blue(`\n📊 Google Search Summary:`));
  console.log(chalk.green(`   • Queries Processed: ${processedQueries}/${searchQueries.length}`));
  console.log(chalk.green(`   • Successful Queries: ${successfulQueries}`));
  console.log(chalk.green(`   • Validated Results: ${validatedResults}`));
  console.log(chalk.yellow(`   • Rejected Results: ${rejectedResults}`));

  return allResults;
}

// Handle interruption gracefully
const handleInterruption = async () => {
  console.log(chalk.yellow('\n⚠️  Test scraper interrupted by user'));
  console.log(chalk.gray('Cleaning up...'));
  process.exit(0);
};

// Set up interruption handlers
process.on('SIGINT', handleInterruption);
process.on('SIGTERM', handleInterruption);

// Run the test scraper
testScraper().catch(error => {
  console.error(chalk.red(`❌ Test scraper failed: ${error.message}`));
  process.exit(1);
}); 
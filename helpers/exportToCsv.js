import { createObjectCsvWriter } from 'csv-writer';
import XLSX from 'xlsx';
import { config } from '../config.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Export results to CSV format (emails and phones only)
 * @param {Array} results - Array of result objects with email and phone
 * @param {string} filename - Output filename
 */
export async function exportToCsv(results, filename = config.output.csvFile) {
  try {
    console.log(`📝 Attempting to save ${results.length} results to: ${filename}`);
    
    // Ensure the directory exists
    const dir = path.dirname(filename);
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (mkdirError) {
      // Directory might already exist, continue
    }
    
    const csvWriter = createObjectCsvWriter({
      path: filename,
      header: [
        { id: 'email', title: 'Email' },
        { id: 'phone', title: 'Phone' }
      ]
    });

    await csvWriter.writeRecords(results);
    
    // Verify the file was actually created
    try {
      const stats = await fs.stat(filename);
      console.log(`✅ CSV exported to ${filename} (${stats.size} bytes)`);
    } catch (statError) {
      console.error(`❌ File verification failed: ${statError.message}`);
    }
  } catch (error) {
    console.error(`❌ Error exporting CSV: ${error.message}`);
    console.error(`   File: ${filename}`);
    console.error(`   Results count: ${results.length}`);
    throw error; // Re-throw to handle in calling function
  }
}

/**
 * Export results to Excel format (emails and phones only)
 * @param {Array} results - Array of result objects with email and phone
 * @param {string} filename - Output filename
 */
export function exportToExcel(results, filename = config.output.xlsxFile) {
  try {
    console.log(`📝 Attempting to save ${results.length} results to Excel: ${filename}`);
    
    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    
    // Convert results to worksheet format
    const worksheet = XLSX.utils.json_to_sheet(results);
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Scraped Data');
    
    // Write to file
    XLSX.writeFile(workbook, filename);
    console.log(`✅ Excel exported to ${filename}`);
  } catch (error) {
    console.error(`❌ Error exporting Excel: ${error.message}`);
    throw error; // Re-throw to handle in calling function
  }
}

/**
 * Export results in the specified format
 * @param {Array} results - Array of result objects
 * @param {string} format - Export format ('csv' or 'xlsx')
 * @param {string} customFilename - Optional custom filename
 */
export async function exportResults(results, format = config.output.defaultFormat, customFilename = null) {
  try {
    console.log(`💾 Exporting ${results.length} results in ${format} format...`);
    
    if (format === 'xlsx') {
      const filename = customFilename || config.output.xlsxFile;
      exportToExcel(results, filename);
    } else {
      const filename = customFilename || config.output.csvFile;
      await exportToCsv(results, filename);
    }
    
    console.log(`✅ Export completed successfully!`);
  } catch (error) {
    console.error(`❌ Export failed: ${error.message}`);
    throw error; // Re-throw to handle in calling function
  }
} 
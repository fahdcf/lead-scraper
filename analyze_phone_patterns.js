import fs from 'fs';
import path from 'path';

// Function to extract phone numbers from HTML content
function extractPhoneNumbers(html) {
  const phoneNumbers = [];
  
  // Pattern 1: Simple format [\"PHONE\",null,null,\"PHONE\"] (escaped quotes)
  const simplePattern = /\[\\"([0-9]{2,4}-[0-9]{6,8})\\",null,null,\\"([0-9]{2,4}-[0-9]{6,8})\\"\]/g;
  let match;
  
  while ((match = simplePattern.exec(html)) !== null) {
    const phone = match[1];
    if (phone === match[2]) { // Both should be the same
      phoneNumbers.push({
        phone: phone,
        format: 'simple',
        fullMatch: match[0]
      });
    }
  }
  
  // Pattern 2: Complex format with multiple variations (escaped quotes)
  // Format: [\"0708-023048\",[[\"0708-023048\",1],[\"+212 708-023048\",2]],null,\"0708023048\",null,[\"tel:0708023048\",null,null,\"ID\"]]
  const complexPattern = /\[\\"([0-9]{2,4}-[0-9]{6,8})\\",\[\[\\"([0-9]{2,4}-[0-9]{6,8})\\",\d+\],\[\\"\+212 ([0-9]{2,4}-[0-9]{6,8})\\",\d+\]\],null,\\"([0-9]{2,4}-[0-9]{6,8})\\",null,\[\\"tel:([0-9]{2,4}-[0-9]{6,8})\\",null,null,\\"[^"]+\\"\]\]/g;
  
  while ((match = complexPattern.exec(html)) !== null) {
    const phone1 = match[1];
    const phone2 = match[2];
    const phone3 = match[3];
    const phone4 = match[4];
    const phone5 = match[5];
    
    phoneNumbers.push({
      phone: phone1,
      format: 'complex',
      variations: [phone1, phone2, phone3, phone4, phone5],
      fullMatch: match[0]
    });
  }
  
  // Pattern 3: Simplified complex pattern to catch more variations
  const complexPattern2 = /\[\\"([0-9]{2,4}-[0-9]{6,8})\\",\[\[\\"([0-9]{2,4}-[0-9]{6,8})\\",\d+\],\[\\"\+212 ([0-9]{2,4}-[0-9]{6,8})\\",\d+\]\],null,\\"([0-9]{2,4}-[0-9]{6,8})\\",null,\[\\"tel:([0-9]{2,4}-[0-9]{6,8})\\",null,null,\\"[^"]+\\"\]\]/g;
  
  while ((match = complexPattern2.exec(html)) !== null) {
    const phone1 = match[1];
    const phone2 = match[2];
    const phone3 = match[3];
    const phone4 = match[4];
    const phone5 = match[5];
    
    phoneNumbers.push({
      phone: phone1,
      format: 'complex2',
      variations: [phone1, phone2, phone3, phone4, phone5],
      fullMatch: match[0]
    });
  }
  
  // Pattern 4: Even simpler pattern to catch the basic structure
  const simpleComplexPattern = /\[\\"([0-9]{2,4}-[0-9]{6,8})\\",\[\[\\"([0-9]{2,4}-[0-9]{6,8})\\",\d+\]/g;
  
  while ((match = simpleComplexPattern.exec(html)) !== null) {
    const phone1 = match[1];
    const phone2 = match[2];
    
    phoneNumbers.push({
      phone: phone1,
      format: 'simple_complex',
      variations: [phone1, phone2],
      fullMatch: match[0]
    });
  }
  
  return phoneNumbers;
}

// Function to extract business names
function extractBusinessNames(html) {
  const businessNames = [];
  
  // Pattern for business names in the format "BUSINESS NAME - DESCRIPTION" (escaped quotes)
  const businessPattern = /\\"([A-Za-zÀ-ÿ][^\\"]{20,200})\\"[^}]*?\[\\"([^\\"]+)\\"[^}]*?\]/g;
  let match;
  
  while ((match = businessPattern.exec(html)) !== null) {
    const businessName = match[1];
    const category = match[2];
    
    // Filter for actual business names
    if (businessName &&
        businessName.length > 20 &&
        businessName.length < 200 &&
        !businessName.includes('null') &&
        !businessName.includes('undefined') &&
        !businessName.includes('http') &&
        !businessName.includes('google') &&
        !businessName.includes('maps') &&
        !businessName.includes('script') &&
        !businessName.includes('preload') &&
        !businessName.includes('application') &&
        !businessName.includes('gcid:') &&
        !businessName.match(/^[0-9\s\-\.]+$/) &&
        businessName.includes(' - ') &&
        (category.includes('dentist') || category.includes('clinic') || category.includes('medical') || category.includes('Dentiste') || category.includes('business') || category.includes('company') || category.includes('web') || category.includes('design'))) {
      businessNames.push({
        name: businessName,
        category: category
      });
    }
  }
  
  return businessNames;
}

// Main analysis function
function analyzeAllPages() {
  const htmlFiles = fs.readdirSync('.').filter(file => file.endsWith('.html'));
  
  console.log(`🔍 Analyzing ${htmlFiles.length} HTML files for phone number patterns...\n`);
  
  let totalPhoneNumbers = 0;
  let totalBusinessNames = 0;
  
  for (const file of htmlFiles) {
    console.log(`📄 Analyzing: ${file}`);
    const html = fs.readFileSync(file, 'utf8');
    
    const phoneNumbers = extractPhoneNumbers(html);
    const businessNames = extractBusinessNames(html);
    
    console.log(`   📞 Found ${phoneNumbers.length} phone numbers`);
    console.log(`   🏢 Found ${businessNames.length} business names`);
    
    // Show first few examples
    if (phoneNumbers.length > 0) {
      console.log(`   📋 Sample phone numbers:`);
      phoneNumbers.slice(0, 3).forEach((phone, index) => {
        console.log(`      ${index + 1}. ${phone.phone} (${phone.format})`);
        if (phone.variations) {
          console.log(`         Variations: ${phone.variations.join(', ')}`);
        }
      });
    }
    
    if (businessNames.length > 0) {
      console.log(`   📋 Sample business names:`);
      businessNames.slice(0, 3).forEach((business, index) => {
        console.log(`      ${index + 1}. ${business.name}`);
      });
    }
    
    totalPhoneNumbers += phoneNumbers.length;
    totalBusinessNames += businessNames.length;
    
    console.log('');
  }
  
  console.log(`📊 SUMMARY:`);
  console.log(`   Total phone numbers found: ${totalPhoneNumbers}`);
  console.log(`   Total business names found: ${totalBusinessNames}`);
  console.log(`   Average phone numbers per page: ${(totalPhoneNumbers / htmlFiles.length).toFixed(1)}`);
  console.log(`   Average business names per page: ${(totalBusinessNames / htmlFiles.length).toFixed(1)}`);
  
  // Analyze phone number formats
  const allPhones = [];
  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, 'utf8');
    allPhones.push(...extractPhoneNumbers(html));
  }
  
  const simpleFormat = allPhones.filter(p => p.format === 'simple').length;
  const complexFormat = allPhones.filter(p => p.format === 'complex').length;
  const complex2Format = allPhones.filter(p => p.format === 'complex2').length;
  const simpleComplexFormat = allPhones.filter(p => p.format === 'simple_complex').length;
  
  console.log(`\n📱 PHONE NUMBER FORMAT ANALYSIS:`);
  console.log(`   Simple format: ${simpleFormat} (${((simpleFormat / allPhones.length) * 100).toFixed(1)}%)`);
  console.log(`   Complex format: ${complexFormat} (${((complexFormat / allPhones.length) * 100).toFixed(1)}%)`);
  console.log(`   Complex2 format: ${complex2Format} (${((complex2Format / allPhones.length) * 100).toFixed(1)}%)`);
  console.log(`   Simple Complex format: ${simpleComplexFormat} (${((simpleComplexFormat / allPhones.length) * 100).toFixed(1)}%)`);
  
  // Show unique phone numbers
  const uniquePhones = [...new Set(allPhones.map(p => p.phone))];
  console.log(`\n📞 UNIQUE PHONE NUMBERS (${uniquePhones.length}):`);
  uniquePhones.slice(0, 20).forEach((phone, index) => {
    console.log(`   ${index + 1}. ${phone}`);
  });
  if (uniquePhones.length > 20) {
    console.log(`   ... and ${uniquePhones.length - 20} more`);
  }
  
  // Show phone numbers by file type
  console.log(`\n📁 PHONE NUMBERS BY FILE TYPE:`);
  const dentistFiles = htmlFiles.filter(f => f.includes('dentist'));
  const webDesignFiles = htmlFiles.filter(f => f.includes('web_design'));
  const agencyFiles = htmlFiles.filter(f => f.includes('agency'));
  
  console.log(`   Dentist files (${dentistFiles.length}):`);
  for (const file of dentistFiles) {
    const html = fs.readFileSync(file, 'utf8');
    const phones = extractPhoneNumbers(html);
    if (phones.length > 0) {
      console.log(`     ${file}: ${phones.map(p => p.phone).join(', ')}`);
    }
  }
  
  console.log(`   Web Design files (${webDesignFiles.length}):`);
  for (const file of webDesignFiles) {
    const html = fs.readFileSync(file, 'utf8');
    const phones = extractPhoneNumbers(html);
    if (phones.length > 0) {
      console.log(`     ${file}: ${phones.map(p => p.phone).join(', ')}`);
    }
  }
  
  console.log(`   Agency files (${agencyFiles.length}):`);
  for (const file of agencyFiles) {
    const html = fs.readFileSync(file, 'utf8');
    const phones = extractPhoneNumbers(html);
    if (phones.length > 0) {
      console.log(`     ${file}: ${phones.map(p => p.phone).join(', ')}`);
    }
  }
}

// Run the analysis
analyzeAllPages(); 
import { AdvancedContactExtractor } from './helpers/advancedContactExtractor.js';
import { extractEmails } from './helpers/extractEmails.js';
import { extractPhones } from './helpers/extractPhones.js';

// Original basic extraction (current method)
async function basicExtraction(html, url) {
    console.log('🔍 Basic Extraction (Current Method):');
    
    const emails = extractEmails(html);
    const phones = extractPhones(html);
    
    console.log('Emails found:', emails);
    console.log('Phones found:', phones);
    
    return { emails, phones };
}

// Advanced extraction (new method)
async function advancedExtraction(html, url) {
    console.log('🚀 Advanced Extraction (New Method):');
    
    const advancedExtractor = new AdvancedContactExtractor();
    const result = await advancedExtractor.extractContactInfoAdvanced(url, html);
    
    console.log('High confidence emails:', result.emails.filter(e => e.confidence > 70));
    console.log('High confidence phones:', result.phones.filter(p => p.confidence > 70));
    
    return result;
}

// Compare methods
async function compareMethods() {
    console.log('📊 COMPARING EXTRACTION METHODS\n');
    
    // Test HTML with mixed quality data
    const testHtml = `
    <html>
        <head>
            <title>Agence Web Fès - Création de Sites Web</title>
            <script type="application/ld+json">
            {
                "@type": "Organization",
                "name": "Agence Web Fès",
                "email": "contact@agence-web-fes.ma",
                "telephone": "+212-5-35-123456"
            }
            </script>
        </head>
        <body>
            <header>
                <h1>Agence Web Fès</h1>
                <p>Email: contact@agence-web-fes.ma</p>
                <p>Téléphone: +212 6 12 34 56 78</p>
            </header>
            
            <div class="contact-section">
                <h2>Contactez-nous</h2>
                <p>Email: info@agence-web-fes.ma</p>
                <p>Téléphone: +212 5 35 98 76 54</p>
            </div>
            
            <footer>
                <p>Support: support@facebook.com</p>
                <p>Marketing: marketing@disposable-email.com</p>
            </footer>
        </body>
    </html>
    `;
    
    const testUrl = 'https://www.agence-web-fes.ma';
    
    console.log('1️⃣ Testing Basic Extraction:');
    const basicResult = await basicExtraction(testHtml, testUrl);
    
    console.log('\n2️⃣ Testing Advanced Extraction:');
    const advancedResult = await advancedExtraction(testHtml, testUrl);
    
    console.log('\n📈 COMPARISON RESULTS:');
    console.log('─'.repeat(50));
    
    console.log('\nBasic Method:');
    console.log(`- Total emails: ${basicResult.emails.length}`);
    console.log(`- Total phones: ${basicResult.phones.length}`);
    console.log(`- No quality filtering`);
    
    console.log('\nAdvanced Method:');
    console.log(`- High confidence emails: ${advancedResult.emails.filter(e => e.confidence > 70).length}`);
    console.log(`- High confidence phones: ${advancedResult.phones.filter(p => p.confidence > 70).length}`);
    console.log(`- Quality filtering applied`);
    console.log(`- Confidence scores available`);
    
    console.log('\n🎯 RECOMMENDATIONS:');
    console.log('- Use advanced method for better accuracy');
    console.log('- Filter by confidence score (>70)');
    console.log('- Check detailed reports for validation');
}

// Test integration with existing scraper
async function testWithExistingScraper() {
    console.log('\n🔧 INTEGRATION WITH EXISTING SCRAPER\n');
    
    // Simulate existing scraper workflow
    const urls = [
        'https://www.agence-web-fes.ma',
        'https://www.creation-site-web-fes.com'
    ];
    
    for (const url of urls) {
        console.log(`\nProcessing: ${url}`);
        
        try {
            // Simulate fetching page
            const response = await fetch(url);
            const html = await response.text();
            
            // Use advanced extraction instead of basic
            const advancedExtractor = new AdvancedContactExtractor();
            const result = await advancedExtractor.extractContactInfoAdvanced(url, html);
            
            // Filter high-confidence results
            const highConfidenceEmails = result.emails.filter(e => e.confidence > 70);
            const highConfidencePhones = result.phones.filter(p => p.confidence > 70);
            
            console.log(`✅ High confidence emails: ${highConfidenceEmails.length}`);
            console.log(`✅ High confidence phones: ${highConfidencePhones.length}`);
            
        } catch (error) {
            console.log(`❌ Error processing ${url}: ${error.message}`);
        }
    }
}

// Run all tests
async function runIntegrationTests() {
    try {
        await compareMethods();
        await testWithExistingScraper();
        console.log('\n✅ Integration tests completed!');
    } catch (error) {
        console.error('❌ Integration test failed:', error);
    }
}

export {
    compareMethods,
    testWithExistingScraper,
    runIntegrationTests
};

if (import.meta.url === `file://${process.argv[1]}`) {
    runIntegrationTests();
}

import { AdvancedContactExtractor } from './helpers/advancedContactExtractor.js';
import { DataValidator } from './helpers/dataValidator.js';
import { IntelligentExtractor } from './helpers/intelligentExtractor.js';
import { FreeApiValidator } from './helpers/freeApiValidator.js';
import { EnhancedPageAnalyzer } from './helpers/enhancedPageAnalyzer.js';

async function testAdvancedMethods() {
    console.log('🧪 Testing Advanced Contact Extraction Methods\n');

    // Initialize all components
    const dataValidator = new DataValidator();
    const intelligentExtractor = new IntelligentExtractor();
    const freeApiValidator = new FreeApiValidator();
    const enhancedAnalyzer = new EnhancedPageAnalyzer();
    const advancedExtractor = new AdvancedContactExtractor();

    // Test URLs (Moroccan businesses)
    const testUrls = [
        'https://www.agence-web-fes.ma',
        'https://www.creation-site-web-fes.com',
        'https://www.agence-digitale-casablanca.ma'
    ];

    console.log('📋 Testing URLs:');
    testUrls.forEach((url, index) => {
        console.log(`${index + 1}. ${url}`);
    });
    console.log('');

    for (let i = 0; i < testUrls.length; i++) {
        const url = testUrls[i];
        console.log(`\n🔍 Testing URL ${i + 1}: ${url}`);
        console.log('─'.repeat(50));

        try {
            // Test individual methods
            console.log('\n1️⃣ Testing Data Validator...');
            const validationResult = await dataValidator.validateEmailAdvanced('contact@agence-web-fes.ma');
            console.log('Email validation result:', validationResult);

            console.log('\n2️⃣ Testing Intelligent Extractor...');
            const extractionResult = await intelligentExtractor.extractEmailsIntelligent(url);
            console.log('Intelligent extraction result:', extractionResult);

            console.log('\n3️⃣ Testing Free API Validator...');
            const apiValidationResult = await freeApiValidator.validateEmailWithFreeApis('contact@agence-web-fes.ma');
            console.log('Free API validation result:', apiValidationResult);

            console.log('\n4️⃣ Testing Enhanced Page Analyzer...');
            const pageAnalysisResult = await enhancedAnalyzer.analyzePageStructure(url);
            console.log('Page analysis result:', pageAnalysisResult);

            console.log('\n5️⃣ Testing Advanced Integration...');
            const advancedResult = await advancedExtractor.extractContactInfoAdvanced(url);
            console.log('Advanced integration result:', advancedResult);

            // Generate detailed report
            console.log('\n📊 Detailed Report:');
            const detailedReport = await advancedExtractor.getDetailedReport(url);
            console.log(JSON.stringify(detailedReport, null, 2));

        } catch (error) {
            console.error(`❌ Error testing ${url}:`, error.message);
        }
    }

    // Test confidence scoring
    console.log('\n🎯 Testing Confidence Scoring:');
    const testEmails = [
        'contact@agence-web-fes.ma',
        'support@facebook.com',
        'info@disposable-email.com',
        'sales@legitimate-business.ma'
    ];

    for (const email of testEmails) {
        const confidence = await advancedExtractor.calculateOverallConfidence(email, 'email');
        console.log(`${email}: ${confidence.score}/100 (${confidence.reason})`);
    }
}

// Test with mock data
async function testWithMockData() {
    console.log('\n🧪 Testing with Mock Data\n');

    const mockHtml = `
    <html>
        <head>
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
            <div class="contact-section">
                <h2>Contactez-nous</h2>
                <p>Email: contact@agence-web-fes.ma</p>
                <p>Téléphone: +212 6 12 34 56 78</p>
            </div>
            <div class="footer">
                <p>Support: support@facebook.com</p>
            </div>
        </body>
    </html>
    `;

    const intelligentExtractor = new IntelligentExtractor();
    const result = await intelligentExtractor.extractEmailsIntelligent('https://example.com', mockHtml);
    
    console.log('Mock data extraction result:');
    console.log(JSON.stringify(result, null, 2));
}

// Run tests
async function runAllTests() {
    try {
        await testAdvancedMethods();
        await testWithMockData();
        console.log('\n✅ All tests completed!');
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Export for use in other files
export {
    testAdvancedMethods,
    testWithMockData,
    runAllTests
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runAllTests();
}

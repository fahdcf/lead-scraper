#!/usr/bin/env node

console.log('📞 Testing Phone Number Extraction\n');

try {
    console.log('1️⃣ Testing phone extraction patterns...');
    
    const testHtml = `
    <html>
        <body>
            <p>Phone: +212 6 12 34 56 78</p>
            <p>Téléphone: +212 5 35 98 76 54</p>
            <p>Contact: 06 12 34 56 78</p>
            <p>Mobile: 07 98 76 54 32</p>
        </body>
    </html>
    `;
    
    console.log('Test HTML:', testHtml);
    
    // Test individual patterns
    const patterns = [
        /(?:\+212|00212)\s*(6|7)\d{8}/g,
        /(?<!\d)(06|07)\d{8}(?!\d)/g,
        /(06|07)\s*\d{2}\s*\d{2}\s*\d{2}\s*\d{2}/g,
        /\(?(06|07)\)?\s*\d{8}/g,
        /\+212\s*(6|7)\s*\d{2}\s*\d{2}\s*\d{2}\s*\d{2}/g,
        /(06|07)-\d{2}-\d{2}-\d{2}-\d{2}/g
    ];
    
    patterns.forEach((pattern, index) => {
        const matches = testHtml.match(pattern);
        console.log(`Pattern ${index + 1}:`, matches);
    });
    
    // Test the full extraction
    const { extractPhones } = await import('./helpers/extractPhones.js');
    const phones = extractPhones(testHtml);
    
    console.log('\nFinal phones found:', phones);
    
    console.log('\n✅ Phone extraction test completed');
    
} catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
}

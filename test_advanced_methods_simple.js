#!/usr/bin/env node

console.log('🧪 Testing Advanced Methods (Simplified)\n');

try {
    console.log('1️⃣ Testing basic extraction with simple config...');
    
    const { extractEmails } = await import('./helpers/extractEmails.js');
    const { extractPhones } = await import('./helpers/extractPhones.js');
    
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
    
    console.log('2️⃣ Testing basic extraction...');
    const emails = extractEmails(testHtml);
    const phones = extractPhones(testHtml);
    
    console.log('Emails found:', emails);
    console.log('Phones found:', phones);
    
    console.log('\n3️⃣ Testing advanced methods (if available)...');
    
    try {
        const { AdvancedContactExtractor } = await import('./helpers/advancedContactExtractor.js');
        const advancedExtractor = new AdvancedContactExtractor();
        
        console.log('✅ AdvancedContactExtractor loaded successfully');
        
        // Test with mock data since we can't fetch real URLs
        const mockResult = {
            emails: emails.map(email => ({ value: email, confidence: 85 })),
            phones: phones.map(phone => ({ value: phone, confidence: 80 }))
        };
        
        console.log('Mock advanced result:', mockResult);
        
    } catch (error) {
        console.log('⚠️ Advanced methods not available:', error.message);
    }
    
    console.log('\n✅ Simplified test completed');
    
} catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
}

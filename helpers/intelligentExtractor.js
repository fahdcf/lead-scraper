import { config } from '../config.js';

/**
 * Intelligent Content Analysis System
 * Uses pattern recognition and context analysis to extract accurate contact information
 */
export class IntelligentExtractor {
  constructor() {
    this.contextPatterns = this.initializeContextPatterns();
    this.contactPatterns = this.initializeContactPatterns();
    this.businessIndicators = this.initializeBusinessIndicators();
  }

  /**
   * Initialize context patterns for better extraction
   */
  initializeContextPatterns() {
    return {
      // Contact section indicators
      contactSections: [
        /contact\s*information/i,
        /coordonnées/i,
        /informations\s*de\s*contact/i,
        /nous\s*contacter/i,
        /contactez\s*nous/i,
        /our\s*contact/i,
        /get\s*in\s*touch/i
      ],

      // Business information indicators
      businessInfo: [
        /about\s*us/i,
        /à\s*propos/i,
        /notre\s*entreprise/i,
        /our\s*company/i,
        /team/i,
        /équipe/i,
        /staff/i
      ],

      // Service indicators
      serviceInfo: [
        /our\s*services/i,
        /nos\s*services/i,
        /services/i,
        /prestations/i,
        /what\s*we\s*do/i
      ],

      // Location indicators
      locationInfo: [
        /location/i,
        /adresse/i,
        /address/i,
        /where\s*to\s*find\s*us/i,
        /nous\s*trouver/i
      ]
    };
  }

  /**
   * Initialize contact patterns with context
   */
  initializeContactPatterns() {
    return {
      // Email patterns with context
      emailWithContext: [
        {
          pattern: /email\s*:?\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi,
          context: 'email_label',
          confidence: 90
        },
        {
          pattern: /e-mail\s*:?\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi,
          context: 'email_label',
          confidence: 90
        },
        {
          pattern: /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\s*\(email\)/gi,
          context: 'email_inline',
          confidence: 85
        },
        {
          pattern: /mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi,
          context: 'email_link',
          confidence: 95
        }
      ],

      // Phone patterns with context
      phoneWithContext: [
        {
          pattern: /téléphone\s*:?\s*(\+212[67]\d{8}|0[67]\d{8})/gi,
          context: 'phone_label',
          confidence: 90
        },
        {
          pattern: /phone\s*:?\s*(\+212[67]\d{8}|0[67]\d{8})/gi,
          context: 'phone_label',
          confidence: 90
        },
        {
          pattern: /tel\s*:?\s*(\+212[67]\d{8}|0[67]\d{8})/gi,
          context: 'phone_label',
          confidence: 90
        },
        {
          pattern: /(\+212[67]\d{8}|0[67]\d{8})\s*\(téléphone\)/gi,
          context: 'phone_inline',
          confidence: 85
        },
        {
          pattern: /tel:(\+212[67]\d{8}|0[67]\d{8})/gi,
          context: 'phone_link',
          confidence: 95
        }
      ]
    };
  }

  /**
   * Initialize business indicators
   */
  initializeBusinessIndicators() {
    return {
      // Professional business indicators
      professional: [
        'cabinet', 'clinique', 'centre', 'institut', 'société', 'entreprise',
        'company', 'business', 'office', 'bureau', 'agency', 'studio'
      ],

      // Service indicators
      services: [
        'services', 'prestations', 'consultation', 'expertise', 'specialist',
        'professional', 'expert', 'consultant'
      ],

      // Contact indicators
      contact: [
        'contact', 'coordonnées', 'informations', 'nous contacter',
        'get in touch', 'reach us', 'call us'
      ],

      // Location indicators
      location: [
        'adresse', 'address', 'location', 'siège', 'headquarters',
        'casablanca', 'rabat', 'marrakech', 'fes', 'agadir'
      ]
    };
  }

  /**
   * Extract emails with intelligent context analysis
   */
  extractEmailsIntelligent(html, url) {
    const emails = [];
    const context = this.analyzeContext(html, url);

    // Extract emails using context-aware patterns
    for (const pattern of this.contactPatterns.emailWithContext) {
      const matches = html.matchAll(pattern.pattern);
      
      for (const match of matches) {
        const email = match[1] || match[0];
        const confidence = this.calculateEmailConfidence(email, context, pattern);
        
        if (confidence >= 70) { // Higher threshold for intelligent extraction
          emails.push({
            email: email.toLowerCase(),
            confidence,
            context: pattern.context,
            source: url
          });
        }
      }
    }

    // Remove duplicates and sort by confidence
    return this.deduplicateAndSort(emails, 'email');
  }

  /**
   * Extract phones with intelligent context analysis
   */
  extractPhonesIntelligent(html, url) {
    const phones = [];
    const context = this.analyzeContext(html, url);

    // Extract phones using context-aware patterns
    for (const pattern of this.contactPatterns.phoneWithContext) {
      const matches = html.matchAll(pattern.pattern);
      
      for (const match of matches) {
        const phone = match[1] || match[0];
        const cleanPhone = this.standardizePhone(phone);
        const confidence = this.calculatePhoneConfidence(cleanPhone, context, pattern);
        
        if (confidence >= 70) { // Higher threshold for intelligent extraction
          phones.push({
            phone: cleanPhone,
            confidence,
            context: pattern.context,
            source: url
          });
        }
      }
    }

    // Remove duplicates and sort by confidence
    return this.deduplicateAndSort(phones, 'phone');
  }

  /**
   * Analyze context of the page
   */
  analyzeContext(html, url) {
    const context = {
      hasContactSection: false,
      hasBusinessInfo: false,
      hasServiceInfo: false,
      hasLocationInfo: false,
      businessType: 'unknown',
      location: 'unknown',
      domain: new URL(url).hostname.replace('www.', ''),
      urlPath: new URL(url).pathname.toLowerCase()
    };

    const content = html.toLowerCase();

    // Check for contact sections
    for (const pattern of this.contextPatterns.contactSections) {
      if (pattern.test(content)) {
        context.hasContactSection = true;
        break;
      }
    }

    // Check for business information
    for (const pattern of this.contextPatterns.businessInfo) {
      if (pattern.test(content)) {
        context.hasBusinessInfo = true;
        break;
      }
    }

    // Check for service information
    for (const pattern of this.contextPatterns.serviceInfo) {
      if (pattern.test(content)) {
        context.hasServiceInfo = true;
        break;
      }
    }

    // Check for location information
    for (const pattern of this.contextPatterns.locationInfo) {
      if (pattern.test(content)) {
        context.hasLocationInfo = true;
        break;
      }
    }

    // Determine business type
    context.businessType = this.detectBusinessType(content);

    // Determine location
    context.location = this.detectLocation(content, url);

    return context;
  }

  /**
   * Calculate email confidence based on context
   */
  calculateEmailConfidence(email, context, pattern) {
    let confidence = pattern.confidence;

    // Domain matching bonus
    const emailDomain = email.split('@')[1];
    if (emailDomain === context.domain) {
      confidence += 20;
    } else if (emailDomain.includes(context.domain) || context.domain.includes(emailDomain)) {
      confidence += 10;
    }

    // Context bonus
    if (context.hasContactSection) {
      confidence += 15;
    }
    if (context.hasBusinessInfo) {
      confidence += 10;
    }

    // Business type bonus
    if (context.businessType !== 'unknown') {
      confidence += 5;
    }

    // URL path bonus
    if (context.urlPath.includes('contact') || context.urlPath.includes('about')) {
      confidence += 10;
    }

    // Penalties
    if (this.isPlatformEmail(email)) {
      confidence -= 30;
    }

    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * Calculate phone confidence based on context
   */
  calculatePhoneConfidence(phone, context, pattern) {
    let confidence = pattern.confidence;

    // Moroccan format bonus
    if (/^\+212[67]\d{8}$/.test(phone)) {
      confidence += 20;
    }

    // Context bonus
    if (context.hasContactSection) {
      confidence += 15;
    }
    if (context.hasLocationInfo) {
      confidence += 10;
    }

    // Business type bonus
    if (context.businessType !== 'unknown') {
      confidence += 5;
    }

    // URL path bonus
    if (context.urlPath.includes('contact') || context.urlPath.includes('about')) {
      confidence += 10;
    }

    // Location bonus
    if (context.location !== 'unknown') {
      confidence += 5;
    }

    // Penalties
    if (this.isSuspiciousPhone(phone)) {
      confidence -= 50;
    }

    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * Standardize phone number format
   */
  standardizePhone(phone) {
    let cleanPhone = phone.replace(/[\s\-\.\(\)]/g, '');
    
    if (cleanPhone.startsWith('06') || cleanPhone.startsWith('07')) {
      cleanPhone = '+212' + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith('00212')) {
      cleanPhone = '+' + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith('212') && !cleanPhone.startsWith('+')) {
      cleanPhone = '+' + cleanPhone;
    }

    return cleanPhone;
  }

  /**
   * Detect business type from content
   */
  detectBusinessType(content) {
    const businessTypes = {
      'healthcare': ['dentist', 'doctor', 'pharmacy', 'clinic', 'hospital', 'medical'],
      'professional': ['lawyer', 'accountant', 'architect', 'consultant', 'engineer'],
      'technology': ['developer', 'programmer', 'designer', 'it', 'software', 'web', 'agency'],
      'hospitality': ['restaurant', 'hotel', 'cafe', 'catering'],
      'retail': ['shop', 'store', 'boutique', 'salon', 'spa'],
      'services': ['plumber', 'electrician', 'mechanic', 'cleaner', 'photographer']
    };

    for (const [type, keywords] of Object.entries(businessTypes)) {
      for (const keyword of keywords) {
        if (content.includes(keyword)) {
          return type;
        }
      }
    }

    return 'unknown';
  }

  /**
   * Detect location from content and URL
   */
  detectLocation(content, url) {
    const moroccanCities = [
      'casablanca', 'rabat', 'marrakech', 'fes', 'agadir', 'tanger', 'meknes',
      'oujda', 'tetouan', 'eljadida', 'safi', 'kenitra', 'temara'
    ];

    const allText = (content + ' ' + url).toLowerCase();

    for (const city of moroccanCities) {
      if (allText.includes(city)) {
        return city;
      }
    }

    return 'unknown';
  }

  /**
   * Check if email is from a platform
   */
  isPlatformEmail(email) {
    const platformDomains = [
      'linkedin.com', 'facebook.com', 'twitter.com', 'instagram.com',
      'youtube.com', 'google.com', 'microsoft.com', 'apple.com'
    ];

    const domain = email.split('@')[1];
    return platformDomains.some(platform => domain.includes(platform));
  }

  /**
   * Check if phone number is suspicious
   */
  isSuspiciousPhone(phone) {
    const suspiciousPatterns = [
      /0000000000/, /1111111111/, /1234567890/, /9999999999/
    ];

    return suspiciousPatterns.some(pattern => pattern.test(phone));
  }

  /**
   * Remove duplicates and sort by confidence
   */
  deduplicateAndSort(items, keyField) {
    const unique = new Map();
    
    for (const item of items) {
      const key = item[keyField];
      if (!unique.has(key) || unique.get(key).confidence < item.confidence) {
        unique.set(key, item);
      }
    }

    return Array.from(unique.values())
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Extract contact information with full intelligent analysis
   */
  async extractContactInfoIntelligent(html, url) {
    const emails = this.extractEmailsIntelligent(html, url);
    const phones = this.extractPhonesIntelligent(html, url);
    const context = this.analyzeContext(html, url);

    return {
      emails: emails.filter(e => e.confidence >= 70),
      phones: phones.filter(p => p.confidence >= 70),
      context,
      totalEmails: emails.length,
      totalPhones: phones.length,
      highConfidenceEmails: emails.filter(e => e.confidence >= 85),
      highConfidencePhones: phones.filter(p => p.confidence >= 85)
    };
  }
}

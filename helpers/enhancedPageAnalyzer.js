import axios from 'axios';
import { config } from '../config.js';

/**
 * Enhanced Page Analysis System
 * Goes beyond simple HTML scraping to analyze page structure and extract accurate contact information
 */
export class EnhancedPageAnalyzer {
  constructor() {
    this.analysisMethods = this.initializeAnalysisMethods();
    this.structurePatterns = this.initializeStructurePatterns();
  }

  /**
   * Initialize analysis methods
   */
  initializeAnalysisMethods() {
    return {
      // Page structure analysis
      structure: ['contact_sections', 'business_info', 'service_pages', 'about_pages'],
      
      // Content analysis
      content: ['semantic_analysis', 'context_analysis', 'pattern_recognition'],
      
      // Data extraction
      extraction: ['structured_data', 'microdata', 'json_ld', 'contact_forms'],
      
      // Validation methods
      validation: ['cross_reference', 'consistency_check', 'format_validation']
    };
  }

  /**
   * Initialize structure patterns
   */
  initializeStructurePatterns() {
    return {
      // Contact section patterns
      contactSections: [
        /<section[^>]*class[^>]*contact[^>]*>/i,
        /<div[^>]*class[^>]*contact[^>]*>/i,
        /<section[^>]*id[^>]*contact[^>]*>/i,
        /<div[^>]*id[^>]*contact[^>]*>/i,
        /contact\s*information/i,
        /coordonnées/i,
        /informations\s*de\s*contact/i
      ],

      // Business information patterns
      businessInfo: [
        /<section[^>]*class[^>]*about[^>]*>/i,
        /<div[^>]*class[^>]*about[^>]*>/i,
        /<section[^>]*id[^>]*about[^>]*>/i,
        /<div[^>]*id[^>]*about[^>]*>/i,
        /about\s*us/i,
        /à\s*propos/i,
        /notre\s*entreprise/i
      ],

      // Service page patterns
      servicePages: [
        /<section[^>]*class[^>]*service[^>]*>/i,
        /<div[^>]*class[^>]*service[^>]*>/i,
        /services/i,
        /prestations/i,
        /nos\s*services/i
      ],

      // Contact form patterns
      contactForms: [
        /<form[^>]*contact[^>]*>/i,
        /<form[^>]*id[^>]*contact[^>]*>/i,
        /contact\s*form/i,
        /formulaire\s*de\s*contact/i
      ]
    };
  }

  /**
   * Analyze page structure and extract contact information
   */
  async analyzePageStructure(url) {
    try {
      const html = await this.fetchPageWithRetry(url);
      if (!html) return null;

      const analysis = {
        url,
        structure: {},
        contactInfo: {},
        confidence: 0,
        recommendations: []
      };

      // 1. Analyze page structure
      analysis.structure = this.analyzePageStructure(html);

      // 2. Extract structured data
      analysis.structuredData = this.extractStructuredData(html);

      // 3. Analyze contact sections
      analysis.contactSections = this.analyzeContactSections(html);

      // 4. Extract contact information with context
      analysis.contactInfo = await this.extractContactInfoWithContext(html, url);

      // 5. Calculate confidence score
      analysis.confidence = this.calculateAnalysisConfidence(analysis);

      // 6. Generate recommendations
      analysis.recommendations = this.generateRecommendations(analysis);

      return analysis;

    } catch (error) {
      console.error('Page analysis error:', error.message);
      return null;
    }
  }

  /**
   * Fetch page with retry mechanism
   */
  async fetchPageWithRetry(url, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await axios.get(url, {
          timeout: config.http.timeout,
          headers: {
            'User-Agent': config.http.userAgent,
            'Accept-Language': config.http.acceptLanguage,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
          },
          maxRedirects: 5,
          validateStatus: function (status) {
            return status >= 200 && status < 400;
          }
        });

        return response.data;

      } catch (error) {
        console.error(`Attempt ${attempt} failed for ${url}:`, error.message);
        
        if (attempt === maxRetries) {
          return null;
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
      }
    }
  }

  /**
   * Analyze page structure
   */
  analyzePageStructure(html) {
    const structure = {
      hasContactSection: false,
      hasBusinessInfo: false,
      hasServiceInfo: false,
      hasContactForm: false,
      sections: [],
      semanticElements: []
    };

    // Check for contact sections
    for (const pattern of this.structurePatterns.contactSections) {
      if (pattern.test(html)) {
        structure.hasContactSection = true;
        structure.sections.push('contact');
        break;
      }
    }

    // Check for business information
    for (const pattern of this.structurePatterns.businessInfo) {
      if (pattern.test(html)) {
        structure.hasBusinessInfo = true;
        structure.sections.push('business_info');
        break;
      }
    }

    // Check for service information
    for (const pattern of this.structurePatterns.servicePages) {
      if (pattern.test(html)) {
        structure.hasServiceInfo = true;
        structure.sections.push('service_info');
        break;
      }
    }

    // Check for contact forms
    for (const pattern of this.structurePatterns.contactForms) {
      if (pattern.test(html)) {
        structure.hasContactForm = true;
        structure.sections.push('contact_form');
        break;
      }
    }

    // Analyze semantic elements
    structure.semanticElements = this.analyzeSemanticElements(html);

    return structure;
  }

  /**
   * Analyze semantic elements
   */
  analyzeSemanticElements(html) {
    const elements = [];

    // Check for semantic HTML elements
    const semanticPatterns = [
      { pattern: /<header[^>]*>/gi, type: 'header' },
      { pattern: /<nav[^>]*>/gi, type: 'navigation' },
      { pattern: /<main[^>]*>/gi, type: 'main_content' },
      { pattern: /<section[^>]*>/gi, type: 'section' },
      { pattern: /<article[^>]*>/gi, type: 'article' },
      { pattern: /<aside[^>]*>/gi, type: 'sidebar' },
      { pattern: /<footer[^>]*>/gi, type: 'footer' }
    ];

    for (const { pattern, type } of semanticPatterns) {
      const matches = html.match(pattern);
      if (matches) {
        elements.push({ type, count: matches.length });
      }
    }

    return elements;
  }

  /**
   * Extract structured data (JSON-LD, Microdata, etc.)
   */
  extractStructuredData(html) {
    const structuredData = {
      jsonLd: [],
      microdata: [],
      rdfa: [],
      contactInfo: {}
    };

    // Extract JSON-LD
    const jsonLdPattern = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = jsonLdPattern.exec(html)) !== null) {
      try {
        const jsonData = JSON.parse(match[1]);
        structuredData.jsonLd.push(jsonData);
        
        // Extract contact information from JSON-LD
        if (jsonData.contactPoint || jsonData.email || jsonData.telephone) {
          if (jsonData.contactPoint) {
            structuredData.contactInfo.phone = jsonData.contactPoint.telephone;
            structuredData.contactInfo.email = jsonData.contactPoint.email;
          }
          if (jsonData.email) {
            structuredData.contactInfo.email = jsonData.email;
          }
          if (jsonData.telephone) {
            structuredData.contactInfo.phone = jsonData.telephone;
          }
        }
      } catch (error) {
        // Invalid JSON, skip
      }
    }

    // Extract Microdata
    const microdataPattern = /itemprop="([^"]*)"[^>]*content="([^"]*)"/gi;
    while ((match = microdataPattern.exec(html)) !== null) {
      const property = match[1];
      const value = match[2];
      
      if (property === 'email' || property === 'telephone') {
        structuredData.microdata.push({ property, value });
        structuredData.contactInfo[property] = value;
      }
    }

    return structuredData;
  }

  /**
   * Analyze contact sections specifically
   */
  analyzeContactSections(html) {
    const contactSections = {
      sections: [],
      contactInfo: {},
      confidence: 0
    };

    // Find contact sections using various methods
    const contactSectionPatterns = [
      /<section[^>]*class[^>]*contact[^>]*>([\s\S]*?)<\/section>/gi,
      /<div[^>]*class[^>]*contact[^>]*>([\s\S]*?)<\/div>/gi,
      /<section[^>]*id[^>]*contact[^>]*>([\s\S]*?)<\/section>/gi,
      /<div[^>]*id[^>]*contact[^>]*>([\s\S]*?)<\/div>/gi
    ];

    for (const pattern of contactSectionPatterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const sectionContent = match[1];
        contactSections.sections.push({
          content: sectionContent,
          type: 'contact_section'
        });

        // Extract contact info from this section
        const sectionContactInfo = this.extractContactFromSection(sectionContent);
        Object.assign(contactSections.contactInfo, sectionContactInfo);
      }
    }

    // Calculate confidence based on found sections
    contactSections.confidence = contactSections.sections.length * 20;

    return contactSections;
  }

  /**
   * Extract contact information from a specific section
   */
  extractContactFromSection(sectionContent) {
    const contactInfo = {};

    // Extract emails
    const emailPatterns = [
      /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
      /mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g
    ];

    for (const pattern of emailPatterns) {
      const matches = sectionContent.match(pattern);
      if (matches) {
        contactInfo.emails = matches.map(match => 
          match.startsWith('mailto:') ? match.replace('mailto:', '') : match
        );
      }
    }

    // Extract phones
    const phonePatterns = [
      /(\+212[67]\d{8})/g,
      /(0[67]\d{8})/g,
      /tel:(\+212[67]\d{8})/g,
      /tel:(0[67]\d{8})/g
    ];

    for (const pattern of phonePatterns) {
      const matches = sectionContent.match(pattern);
      if (matches) {
        contactInfo.phones = matches.map(match => 
          match.startsWith('tel:') ? match.replace('tel:', '') : match
        );
      }
    }

    return contactInfo;
  }

  /**
   * Extract contact information with context analysis
   */
  async extractContactInfoWithContext(html, url) {
    const contactInfo = {
      emails: [],
      phones: [],
      addresses: [],
      context: {},
      confidence: 0
    };

    // 1. Extract from structured data
    const structuredData = this.extractStructuredData(html);
    if (structuredData.contactInfo.email) {
      contactInfo.emails.push({
        email: structuredData.contactInfo.email,
        source: 'structured_data',
        confidence: 95
      });
    }
    if (structuredData.contactInfo.telephone) {
      contactInfo.phones.push({
        phone: structuredData.contactInfo.telephone,
        source: 'structured_data',
        confidence: 95
      });
    }

    // 2. Extract from contact sections
    const contactSections = this.analyzeContactSections(html);
    if (contactSections.contactInfo.emails) {
      contactSections.contactInfo.emails.forEach(email => {
        contactInfo.emails.push({
          email,
          source: 'contact_section',
          confidence: 85
        });
      });
    }
    if (contactSections.contactInfo.phones) {
      contactSections.contactInfo.phones.forEach(phone => {
        contactInfo.phones.push({
          phone,
          source: 'contact_section',
          confidence: 85
        });
      });
    }

    // 3. Extract from entire page with context
    const pageContactInfo = this.extractContactFromPageWithContext(html, url);
    contactInfo.emails.push(...pageContactInfo.emails);
    contactInfo.phones.push(...pageContactInfo.phones);

    // 4. Remove duplicates and sort by confidence
    contactInfo.emails = this.deduplicateAndSort(contactInfo.emails, 'email');
    contactInfo.phones = this.deduplicateAndSort(contactInfo.phones, 'phone');

    // 5. Calculate overall confidence
    contactInfo.confidence = this.calculateContactConfidence(contactInfo);

    return contactInfo;
  }

  /**
   * Extract contact information from page with context analysis
   */
  extractContactFromPageWithContext(html, url) {
    const contactInfo = {
      emails: [],
      phones: []
    };

    // Analyze page context
    const context = this.analyzePageContext(html, url);

    // Extract emails with context
    const emailPatterns = [
      /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
      /mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g
    ];

    for (const pattern of emailPatterns) {
      const matches = html.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const email = match.startsWith('mailto:') ? match.replace('mailto:', '') : match;
          const confidence = this.calculateEmailConfidenceWithContext(email, context);
          
          if (confidence >= 70) {
            contactInfo.emails.push({
              email,
              source: 'page_analysis',
              confidence
            });
          }
        });
      }
    }

    // Extract phones with context
    const phonePatterns = [
      /(\+212[67]\d{8})/g,
      /(0[67]\d{8})/g,
      /tel:(\+212[67]\d{8})/g,
      /tel:(0[67]\d{8})/g
    ];

    for (const pattern of phonePatterns) {
      const matches = html.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const phone = match.startsWith('tel:') ? match.replace('tel:', '') : match;
          const confidence = this.calculatePhoneConfidenceWithContext(phone, context);
          
          if (confidence >= 70) {
            contactInfo.phones.push({
              phone,
              source: 'page_analysis',
              confidence
            });
          }
        });
      }
    }

    return contactInfo;
  }

  /**
   * Analyze page context
   */
  analyzePageContext(html, url) {
    const context = {
      domain: new URL(url).hostname.replace('www.', ''),
      path: new URL(url).pathname.toLowerCase(),
      hasContactSection: false,
      hasBusinessInfo: false,
      hasServiceInfo: false,
      businessType: 'unknown',
      location: 'unknown'
    };

    const content = html.toLowerCase();

    // Check for contact sections
    if (/contact|coordonnées|informations\s*de\s*contact/i.test(content)) {
      context.hasContactSection = true;
    }

    // Check for business information
    if (/about|à\s*propos|notre\s*entreprise/i.test(content)) {
      context.hasBusinessInfo = true;
    }

    // Check for service information
    if (/services|prestations/i.test(content)) {
      context.hasServiceInfo = true;
    }

    // Detect business type
    const businessTypes = {
      'healthcare': ['dentist', 'doctor', 'pharmacy', 'clinic'],
      'professional': ['lawyer', 'accountant', 'architect', 'consultant'],
      'technology': ['developer', 'programmer', 'designer', 'agency'],
      'hospitality': ['restaurant', 'hotel', 'cafe'],
      'retail': ['shop', 'store', 'boutique', 'salon']
    };

    for (const [type, keywords] of Object.entries(businessTypes)) {
      if (keywords.some(keyword => content.includes(keyword))) {
        context.businessType = type;
        break;
      }
    }

    // Detect location
    const moroccanCities = [
      'casablanca', 'rabat', 'marrakech', 'fes', 'agadir', 'tanger', 'meknes'
    ];

    for (const city of moroccanCities) {
      if (content.includes(city) || url.includes(city)) {
        context.location = city;
        break;
      }
    }

    return context;
  }

  /**
   * Calculate email confidence with context
   */
  calculateEmailConfidenceWithContext(email, context) {
    let confidence = 70; // Base confidence

    // Domain matching
    const emailDomain = email.split('@')[1];
    if (emailDomain === context.domain) {
      confidence += 20;
    } else if (emailDomain.includes(context.domain) || context.domain.includes(emailDomain)) {
      confidence += 10;
    }

    // Context bonuses
    if (context.hasContactSection) confidence += 15;
    if (context.hasBusinessInfo) confidence += 10;
    if (context.businessType !== 'unknown') confidence += 5;

    // URL path bonus
    if (context.path.includes('contact') || context.path.includes('about')) {
      confidence += 10;
    }

    // Penalties
    if (this.isPlatformEmail(email)) {
      confidence -= 30;
    }

    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * Calculate phone confidence with context
   */
  calculatePhoneConfidenceWithContext(phone, context) {
    let confidence = 70; // Base confidence

    // Moroccan format bonus
    if (/^\+212[67]\d{8}$/.test(phone)) {
      confidence += 20;
    }

    // Context bonuses
    if (context.hasContactSection) confidence += 15;
    if (context.hasLocationInfo) confidence += 10;
    if (context.businessType !== 'unknown') confidence += 5;

    // URL path bonus
    if (context.path.includes('contact') || context.path.includes('about')) {
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
   * Calculate analysis confidence
   */
  calculateAnalysisConfidence(analysis) {
    let confidence = 0;

    // Structure confidence
    if (analysis.structure.hasContactSection) confidence += 20;
    if (analysis.structure.hasBusinessInfo) confidence += 15;
    if (analysis.structure.hasServiceInfo) confidence += 10;
    if (analysis.structure.hasContactForm) confidence += 15;

    // Contact info confidence
    if (analysis.contactInfo.emails.length > 0) confidence += 20;
    if (analysis.contactInfo.phones.length > 0) confidence += 20;

    // Structured data confidence
    if (analysis.structuredData.jsonLd.length > 0) confidence += 10;
    if (analysis.structuredData.microdata.length > 0) confidence += 5;

    return Math.min(100, confidence);
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(analysis) {
    const recommendations = [];

    if (analysis.confidence < 50) {
      recommendations.push('Low confidence analysis - manual review recommended');
    }

    if (analysis.contactInfo.emails.length === 0) {
      recommendations.push('No emails found - check contact pages manually');
    }

    if (analysis.contactInfo.phones.length === 0) {
      recommendations.push('No phones found - check contact pages manually');
    }

    if (!analysis.structure.hasContactSection) {
      recommendations.push('No contact section detected - may need manual verification');
    }

    return recommendations;
  }
}

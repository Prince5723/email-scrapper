const validator = require('email-validator');

class EmailExtractor {
  constructor() {
    // Comprehensive email regex pattern
    this.emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    
    // Patterns to exclude common false positives
    this.excludePatterns = [
      /example\.com$/i,
      /test\.com$/i,
      /placeholder\.com$/i,
      /sample\.com$/i,
      /domain\.com$/i,
      /\.png$/i,
      /\.jpg$/i,
      /\.gif$/i,
      /\.svg$/i
    ];
  }

  /**
   * Extract emails from HTML content, optionally filtering by email provider
   * @param {string} html - HTML content to parse
   * @param {string} targetEmailProvider - Optional email provider to filter for (e.g., '@gmail.com')
   * @returns {Array} - Array of extracted email addresses
   */
  extractFromHTML(html, targetEmailProvider = null) {
    const emails = new Set();
    
    // Remove script and style tags
    const cleanHTML = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    
    // Extract emails using regex
    const matches = cleanHTML.match(this.emailPattern);
    
    if (matches) {
      matches.forEach(email => {
        const normalizedEmail = email.toLowerCase().trim();
        
        // Validate email
        if (this.isValidEmail(normalizedEmail)) {
          // If target email provider is specified, filter by it
          if (targetEmailProvider) {
            if (normalizedEmail.endsWith(targetEmailProvider.toLowerCase())) {
              emails.add(normalizedEmail);
            }
          } else {
            // Otherwise, accept all valid emails
            emails.add(normalizedEmail);
          }
        }
      });
    }
    
    return Array.from(emails);
  }

  /**
   * Validate email address
   * @param {string} email - Email address to validate
   * @returns {boolean} - True if valid, false otherwise
   */
  isValidEmail(email) {
    // Basic validation using library
    if (!validator.validate(email)) {
      return false;
    }
    
    // Check against exclusion patterns
    for (const pattern of this.excludePatterns) {
      if (pattern.test(email)) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Extract emails from text content, optionally filtering by email provider
   * @param {string} text - Plain text to parse
   * @param {string} targetEmailProvider - Optional email provider to filter for (e.g., '@gmail.com')
   * @returns {Array} - Array of extracted email addresses
   */
  extractFromText(text, targetEmailProvider = null) {
    const emails = new Set();
    const matches = text.match(this.emailPattern);
    
    if (matches) {
      matches.forEach(email => {
        const normalizedEmail = email.toLowerCase().trim();
        if (this.isValidEmail(normalizedEmail)) {
          // If target email provider is specified, filter by it
          if (targetEmailProvider) {
            if (normalizedEmail.endsWith(targetEmailProvider.toLowerCase())) {
              emails.add(normalizedEmail);
            }
          } else {
            // Otherwise, accept all valid emails
            emails.add(normalizedEmail);
          }
        }
      });
    }
    
    return Array.from(emails);
  }
}

module.exports = new EmailExtractor();


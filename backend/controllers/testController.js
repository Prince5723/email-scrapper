const emailExtractor = require('../services/emailExtractor');
const nameInference = require('../services/nameInference');

/**
 * Test email extraction
 */
exports.testEmailExtraction = async (req, res) => {
  try {
    // Sample HTML with emails
    const sampleHTML = `
      <html>
        <body>
          <p>Contact: john.doe@company.com</p>
          <p>Email: jane.smith@startup.io</p>
          <p>Reach out: ceo@business.com</p>
          <p>Invalid: test@example.com</p>
        </body>
      </html>
    `;

    const emails = emailExtractor.extractFromHTML(sampleHTML);
    
    const results = emails.map(email => {
      const inference = nameInference.inferName(email);
      return {
        email,
        name: inference.name,
        confidence: inference.confidence,
        method: inference.method
      };
    });

    res.json({
      success: true,
      message: 'Email extraction test',
      emailsFound: emails.length,
      results
    });
  } catch (error) {
    console.error('Test error:', error);
    res.status(500).json({
      success: false,
      message: 'Test failed',
      error: error.message
    });
  }
};

/**
 * Test direct search with mock data
 */
exports.testMockSearch = async (req, res) => {
  try {
    const { profile } = req.body;

    // Mock results for testing
    const mockResults = [
      {
        profile: profile.toLowerCase(),
        name: 'John Doe',
        email: 'john.doe@techcompany.com',
        platform: 'LinkedIn',
        searchEngine: 'Mock',
        confidence: 0.9,
        aiEnhanced: false,
        method: 'pattern-matching',
        sourceUrl: 'https://example.com/test'
      },
      {
        profile: profile.toLowerCase(),
        name: 'Jane Smith',
        email: 'jane.smith@startup.io',
        platform: 'GitHub',
        searchEngine: 'Mock',
        confidence: 0.85,
        aiEnhanced: false,
        method: 'pattern-matching',
        sourceUrl: 'https://example.com/test2'
      },
      {
        profile: profile.toLowerCase(),
        name: 'Bob Wilson',
        email: 'bob.wilson@company.com',
        platform: 'Company Website',
        searchEngine: 'Mock',
        confidence: 0.88,
        aiEnhanced: false,
        method: 'pattern-matching',
        sourceUrl: 'https://example.com/test3'
      }
    ];

    res.json({
      success: true,
      cached: false,
      aiEnhanced: false,
      count: mockResults.length,
      results: mockResults.map(r => ({
        profile: r.profile,
        name: r.name,
        email: r.email,
        platform: r.platform,
        search_engine: r.searchEngine,
        confidence: r.confidence,
        ai_enhanced: r.aiEnhanced,
        method: r.method,
        source_url: r.sourceUrl
      })),
      note: 'These are mock results for testing. Real scraping may return 0 results due to website restrictions.'
    });
  } catch (error) {
    console.error('Mock search error:', error);
    res.status(500).json({
      success: false,
      message: 'Mock search failed',
      error: error.message
    });
  }
};

/**
 * Test name inference
 */
exports.testNameInference = async (req, res) => {
  try {
    const testEmails = [
      'john.doe@company.com',
      'jane_smith@startup.io',
      'jdoe@business.com',
      'ceo@company.com',
      'contact@example.com',
      'sarah.johnson@tech.io'
    ];

    const results = testEmails.map(email => {
      const inference = nameInference.inferName(email);
      return {
        email,
        name: inference.name,
        confidence: inference.confidence,
        method: inference.method
      };
    });

    res.json({
      success: true,
      message: 'Name inference test',
      results
    });
  } catch (error) {
    console.error('Name inference test error:', error);
    res.status(500).json({
      success: false,
      message: 'Test failed',
      error: error.message
    });
  }
};


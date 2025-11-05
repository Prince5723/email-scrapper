const EmailResult = require('../models/EmailResult');
const webScraper = require('../services/webScraper');

/**
 * Search for emails based on profile
 */
exports.searchEmails = async (req, res) => {
  try {
    const { profile, limit = 10, searchEngine = 'Google', useCache = true, useAI = false } = req.body;

    // Validate input
    if (!profile || profile.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Profile keyword is required'
      });
    }

    const normalizedProfile = profile.toLowerCase().trim();

    // Check cache first if enabled (skip cache if AI is requested for fresh results)
    if (useCache && !useAI) {
      const cachedResults = await EmailResult.find({ profile: normalizedProfile })
        .sort({ extractedAt: -1 })
        .limit(parseInt(limit));

      if (cachedResults.length > 0) {
        // Check if cache is fresh (less than 24 hours old)
        const latestResult = cachedResults[0];
        const hoursSinceExtraction = (Date.now() - latestResult.extractedAt) / (1000 * 60 * 60);

        if (hoursSinceExtraction < 24) {
          return res.json({
            success: true,
            cached: true,
            aiEnhanced: false,
            count: cachedResults.length,
            results: cachedResults.map(r => ({
              profile: r.profile,
              name: r.name,
              email: r.email,
              platform: r.platform,
              search_engine: r.searchEngine,
              confidence: r.confidence,
              ai_enhanced: r.aiEnhanced || false,
              method: r.method || 'pattern-matching',
              source_url: r.sourceUrl
            }))
          });
        }
      }
    }

    // Perform new search
    console.log(`Searching for profile: ${normalizedProfile} (Engine: ${searchEngine}, AI: ${useAI})`);
    const results = await webScraper.searchAndExtract(normalizedProfile, {
      limit: parseInt(limit),
      searchEngine,
      useAI
    });

    // Save results to database
    const savedResults = [];
    for (const result of results) {
      try {
        const emailResult = new EmailResult(result);
        await emailResult.save();
        savedResults.push(emailResult);
      } catch (saveError) {
        // Handle duplicate emails gracefully
        if (saveError.code !== 11000) {
          console.error('Error saving result:', saveError);
        }
      }
    }

    // If no results found, provide helpful message
    if (savedResults.length === 0) {
      return res.json({
        success: true,
        cached: false,
        aiEnhanced: useAI,
        searchMethod: searchEngine,
        sitesSearched: ['LinkedIn', 'Indeed', 'GitHub'],
        emailProvidersSearched: ['@gmail.com', '@rediffmail.com', '@yahoo.com', '@outlook.com', '@hotmail.com'],
        count: 0,
        results: [],
        message: `No results found using ${searchEngine}. Search engines often block automated requests. LinkedIn, Indeed & GitHub have aggressive anti-scraping protection.`,
        suggestions: [
          'This is normal - search engines detect and block automated browsers',
          'Try different profile keywords',
          'Try a different search engine from the dropdown',
          'Reduce limit to 1-3 results',
          'Real scraping requires proxies + CAPTCHA solving'
        ]
      });
    }

    res.json({
      success: true,
      cached: false,
      aiEnhanced: useAI,
      searchMethod: searchEngine,
      sitesSearched: ['LinkedIn', 'Indeed', 'GitHub'],
      emailProvidersSearched: ['@gmail.com', '@rediffmail.com', '@yahoo.com', '@outlook.com', '@hotmail.com'],
      count: savedResults.length,
      results: savedResults.map(r => ({
        profile: r.profile,
        name: r.name,
        email: r.email,
        platform: r.platform,
        search_engine: r.searchEngine,
        confidence: r.confidence,
        ai_enhanced: r.aiEnhanced || false,
        method: r.method || 'pattern-matching',
        source_url: r.sourceUrl,
        targeted_email_provider: r.targetedEmailProvider || null
      }))
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during the search',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get search history with pagination
 */
exports.getHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, profile } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = profile ? { profile: profile.toLowerCase().trim() } : {};

    const results = await EmailResult.find(query)
      .sort({ extractedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await EmailResult.countDocuments(query);

    res.json({
      success: true,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      results: results.map(r => ({
        profile: r.profile,
        name: r.name,
        email: r.email,
        platform: r.platform,
        search_engine: r.searchEngine,
        confidence: r.confidence,
        source_url: r.sourceUrl,
        extracted_at: r.extractedAt
      }))
    });

  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get statistics
 */
exports.getStats = async (req, res) => {
  try {
    const totalEmails = await EmailResult.countDocuments();
    
    const profileStats = await EmailResult.aggregate([
      {
        $group: {
          _id: '$profile',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    const engineStats = await EmailResult.aggregate([
      {
        $group: {
          _id: '$searchEngine',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      stats: {
        totalEmails,
        topProfiles: profileStats.map(p => ({
          profile: p._id,
          count: p.count
        })),
        searchEngines: engineStats.map(e => ({
          engine: e._id,
          count: e.count
        }))
      }
    });

  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


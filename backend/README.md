# Backend - OSINT Email Extractor

## Overview

Node.js/Express backend for the OSINT Email Extractor application. Handles web scraping, email extraction, and AI-powered name inference.

## Structure

```
backend/
├── config/
│   └── database.js          # MongoDB connection
├── controllers/
│   └── searchController.js  # API endpoint logic
├── middleware/
│   └── rateLimiter.js      # Rate limiting configuration
├── models/
│   └── EmailResult.js      # MongoDB schema
├── routes/
│   └── searchRoutes.js     # API routes
├── services/
│   ├── emailExtractor.js   # Email extraction logic
│   ├── nameInference.js    # AI name inference
│   └── webScraper.js       # Web scraping service
├── .env                     # Environment variables
├── .gitignore
├── package.json
└── server.js               # Main entry point
```

## Installation

```bash
npm install
```

## Environment Variables

Create a `.env` file:

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/osint-db
NODE_ENV=development
```

## Running

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## API Documentation

See main README for detailed API documentation.

## Services

### Email Extractor (`services/emailExtractor.js`)
- Extracts emails using regex
- Validates emails
- Filters false positives

### Name Inference (`services/nameInference.js`)
- Infers names from email addresses
- Uses pattern matching and heuristics
- Returns confidence scores

### Web Scraper (`services/webScraper.js`)
- Searches Google and DuckDuckGo
- Extracts emails from URLs
- Uses Puppeteer for JS-heavy sites
- Determines platform from URL


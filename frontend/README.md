# Frontend - OSINT Email Extractor

## Overview

React-based frontend for the OSINT Email Extractor application. Provides a modern, user-friendly interface for searching and viewing professional email addresses.

## Features

- Profile keyword search
- Multi-engine selection (Google, DuckDuckGo)
- Results limit configuration
- Quick suggestion chips
- Confidence score visualization
- Responsive design
- Loading states and error handling

## Installation

```bash
npm install
```

## Running

Development mode:
```bash
npm start
```

Build for production:
```bash
npm run build
```

## Components

### App.js
Main application component containing:
- Search form
- Search options
- Results display
- Error handling
- Loading states

## Styling

The application uses custom CSS with:
- Purple gradient background
- Card-based layout
- Responsive grid
- Smooth animations
- Mobile-friendly design

## API Integration

The frontend communicates with the backend API using axios:
- POST `/api/search` - Perform search
- Proxy configured in `package.json`

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)


# 🎬 Movie & TV Watchlist App

A beautiful, feature-rich web application for tracking your favorite movies and TV series. Never forget what you want to watch next!

![App Preview](https://via.placeholder.com/800x400/31363f/76abae?text=Movie+%26+TV+Watchlist+App)

## 🚀 Quick Deploy to Render

This app is ready for immediate deployment to Render:

**Build Command**: `npm install && npm run build`
**Start Command**: `npm start`
**Health Check**: `/health`

See [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md) for complete deployment guide.

---

## 🌟 What This App Does

This is your personal digital watchlist manager - think of it like a smart notebook for all the movies and TV shows you want to watch or have already watched. Instead of keeping mental notes or scattered lists, this app helps you organize everything in one beautiful, easy-to-use place.

### 🎯 Perfect For:
- **Movie Enthusiasts** who discover new films faster than they can watch them
- **TV Show Binge-Watchers** who need to track multiple series
- **Families** wanting to keep a shared list of entertainment options
- **Anyone** who's ever forgotten that "great movie someone recommended"

---

## ✨ Key Features

### 🔍 **Smart Search**
- Search for any movie or TV show by name
- Get real-time results with beautiful posters and details
- See ratings, release dates, and descriptions instantly
- Powered by The Movie Database (TMDb) - the same data used by major streaming platforms

### 📚 **Personal Watchlist**
- Save movies and TV shows to your personal collection
- Mark items as "watched" or "unwatched"
- Beautiful grid layout with high-quality posters
- Dynamic background that changes based on your latest addition

### ⏱️ **Smart Time Calculator**
- See exactly how much time you'll need to watch everything
- Separate counters for movies and TV series
- Calculates based on actual movie runtimes and episode counts
- Filter by watched/unwatched status

### 🎨 **Beautiful Design**
- Modern, dark theme that's easy on the eyes
- Smooth animations and transitions
- Responsive design that works on phones, tablets, and computers
- Professional-grade user interface

### 💾 **Data Management**
- Export your entire watchlist as a file
- Import watchlists from other devices
- All data stored safely in your browser
- No account required - complete privacy

### 🔄 **Smart Filtering**
- View all items, only watched, or only unwatched
- Easy toggle between different views
- Quick overview of your watching progress

---

## 🚀 How to Use the App

### Getting Started
1. **Open the app** in your web browser
2. **Search for content** using the search bar at the top
3. **Click on any result** to add it to your watchlist
4. **Start building your collection!**

### Adding Content
1. Type a movie or TV show name in the search box
2. Browse through the results that appear
3. Click on the item you want to add
4. It's automatically saved to your watchlist!

### Managing Your Watchlist
- **Mark as watched**: Click the eye icon on any item
- **Remove items**: Click the X button to delete from your list
- **View details**: Click on any poster to see full information
- **Filter content**: Use the filter dropdown to show watched/unwatched items

### Time Tracking
The timer at the top shows:
- **Total time needed** to watch everything in your current filter
- **Number of movies** and **TV series** in your list
- **Real-time updates** as you add or remove content

### Backup & Sharing
- **Export**: Download your watchlist as a file
- **Import**: Upload a previously saved watchlist
- **Share**: Send your watchlist file to friends or family

---

## 📱 Device Compatibility

### ✅ Works On:
- **Desktop Computers** (Windows, Mac, Linux)
- **Tablets** (iPad, Android tablets)
- **Smartphones** (iPhone, Android)
- **Smart TVs** with web browsers
- **Any device** with a modern web browser

### 🌐 Browser Support:
- Chrome, Firefox, Safari, Edge
- No plugins or downloads required
- Works completely in your web browser

---

## 🔒 Privacy & Data

### Your Data is Safe:
- **No accounts required** - use immediately
- **No personal information collected**
- **All data stored locally** on your device
- **No tracking or analytics**
- **Complete privacy** - your watchlist stays private

### Data Storage:
- Uses your browser's local storage
- Data persists between sessions
- Can export/import for backup
- No data sent to external servers (except for movie information lookup)

---

## 🛠️ Technical Details

### For Developers and Tech-Savvy Users:

#### **Technology Stack:**
- **Frontend**: React 18 with modern JavaScript
- **Styling**: TailwindCSS with custom dark theme
- **Animation**: GSAP for smooth transitions
- **Build Tool**: Vite for fast development and building
- **Backend**: Express.js server for API handling
- **Data Source**: The Movie Database (TMDb) API

#### **Architecture:**
- **Single Page Application (SPA)** for smooth navigation
- **Full-stack JavaScript** application
- **RESTful API** design for data fetching
- **Component-based architecture** for maintainability
- **Responsive design** with mobile-first approach

#### **Key Components:**
- `SearchBar` - Intelligent search with debouncing and similarity matching
- `BookmarksGrid` - Animated grid layout for watchlist items
- `Timer` - Real-time calculation of total watch time
- `DialogBox` - Detailed information display for movies/TV shows
- `StreamingPlatforms` - Shows where content is available to watch

#### **APIs Used:**
- **TMDb API** - Movie and TV show data, posters, ratings
- **OMDb API** - Additional IMDb ratings and details
- **Multiple API keys** for reliability and rate limit handling

---

## 🚀 Installation & Setup

### For Regular Users:
**No installation needed!** The app runs directly in your web browser.

### For Developers:

#### **Prerequisites:**
- Node.js (version 18 or higher)
- npm (comes with Node.js)

#### **Quick Start:**
```bash
# Clone the repository
git clone <repository-url>

# Navigate to project directory
cd movie-watchlist-app

# Install dependencies
npm install

# Start the development server
npm run dev

# Open your browser to http://localhost:8080
```

#### **Available Scripts:**
```bash
npm run dev        # Start development server
npm run build      # Build for production
npm start          # Start production server
npm test           # Run tests
```

#### **Environment Setup:**
Create a `.env` file with your API keys:
```
TMDB_API_KEY=your_tmdb_api_key_here
OMDB_API_KEY=your_omdb_api_key_here
```

---

## 🌐 Deployment Options

### **For Hosting the App:**

#### **Option 1: Vercel (Recommended)**
- Perfect for full-stack applications
- Automatic deployments from git
- Free tier available
- Excellent performance

#### **Option 2: Render**
- Simple full-stack deployment
- Can run both frontend and backend
- Easy environment variable management
- Good for production use

#### **Option 3: Netlify**
- Great for static deployments
- Simple drag-and-drop deployment
- Good for frontend-only versions

---

## 📊 Project Statistics

- **Languages**: JavaScript, CSS, HTML
- **Total Components**: 15+ React components
- **UI Elements**: 25+ reusable UI components
- **API Endpoints**: 6 custom endpoints
- **Dependencies**: 50+ carefully selected packages
- **File Size**: ~2MB total application size
- **Performance**: Optimized for speed and responsiveness

---

## 🤝 Contributing

### How to Help Improve the App:

1. **Report Bugs**: Found something that doesn't work? Let us know!
2. **Suggest Features**: Have ideas for new features? Share them!
3. **Code Contributions**: Developers can submit pull requests
4. **Testing**: Help test on different devices and browsers
5. **Documentation**: Help improve this README or add tutorials

### **Development Process:**
```bash
# Fork the repository
# Create a feature branch
git checkout -b feature/amazing-new-feature

# Make your changes
# Test thoroughly
npm test

# Build to ensure everything works
npm run build

# Submit a pull request
```

---

## 📞 Support & Help

### **Having Issues?**
1. **Check this README** for common solutions
2. **Try refreshing** your browser
3. **Clear browser cache** if experiencing loading issues
4. **Check your internet connection** for search functionality

### **Technical Support:**
- Create an issue in the project repository
- Include your browser type and version
- Describe the steps to reproduce any problems

---

## 📜 License

This project is open source and available under the MIT License. Feel free to use, modify, and distribute as you see fit.

---

## 🎉 Enjoy Your Movie Nights!

This app was built with love for fellow movie and TV enthusiasts. Whether you're planning a movie marathon, keeping track of the latest Netflix series, or just organizing your entertainment wishlist, we hope this app makes your viewing experience even better!

**Happy Watching! 🍿📺**

---

*Last updated: 2025*

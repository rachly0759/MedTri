# ER Queue Management System

A web-based Emergency Room Queue Management System with intelligent triage assessment.

## Features

- **Real-time Patient Queue**: View and manage patient queue with ESI (Emergency Severity Index) based prioritization
- **Interactive Assessment**: 8-question symptom assessment to determine patient priority levels
- **Persistent Data Storage**: Patient data is stored in JSON format and persists between sessions
- **Responsive Design**: Works on both desktop and mobile devices
- **Visual Priority Indicators**: Color-coded ESI levels for quick identification

## Installation & Setup

### Option 1: Simple Version (No Server Required)
Simply open `index.html` in your web browser. Data is automatically saved to your browser's localStorage.

### Option 2: Server Version (Advanced)
If you want to use the server version with JSON file storage:

1. **Install Node.js** (if not already installed)
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Start the Server**:
   ```bash
   export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && npm start
   ```
4. **Access the Application**:
   Open your browser and navigate to `http://localhost:3000`

**Alternative Single Command:**
```bash
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && npm start
```

**To Stop the Server:**
Press `Ctrl + C` in the terminal where the server is running

**To Check if Server is Running:**
```bash
curl http://localhost:3000/api/patients
```

## File Structure

- `index.html` - Main HTML structure
- `styles.css` - CSS styling and responsive design
- `script.js` - JavaScript application logic and API calls
- `patients.json` - Patient data storage (automatically managed)
- `server.js` - Express.js server for API endpoints
- `package.json` - Node.js dependencies and scripts

## API Endpoints

- `GET /api/patients` - Retrieve all patients
- `POST /api/patients` - Add a new patient
- `PUT /api/patients` - Update all patients (bulk update)

## How It Works

1. **Queue View**: Displays current patients sorted by ESI priority
2. **Assessment Flow**: Interactive questionnaire determines patient priority (ESI 1-5)
3. **Data Persistence**: New assessments are automatically saved to `patients.json`
4. **Real-time Updates**: Queue updates immediately when new patients are added

## ESI Priority Levels

- **ESI 1 (Red)**: Immediate - Life-threatening conditions
- **ESI 2 (Orange)**: Emergent - High risk, shouldn't wait
- **ESI 3 (Yellow)**: Urgent - Moderate risk
- **ESI 4 (Green)**: Less Urgent - Lower risk
- **ESI 5 (Blue)**: Non-Urgent - Lowest risk

## Development

To run in development mode:
```bash
npm run dev
```

The server will start on port 3000 and automatically serve the static files.
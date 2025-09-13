const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'patients.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Load patients from JSON file
async function loadPatients() {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading patients:', error);
        return { patients: [], lastId: 0 };
    }
}

// Save patients to JSON file
async function savePatients(data) {
    try {
        await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving patients:', error);
        return false;
    }
}

// GET /api/patients - Get all patients
app.get('/api/patients', async (req, res) => {
    try {
        const data = await loadPatients();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load patients' });
    }
});

// POST /api/patients - Add a new patient
app.post('/api/patients', async (req, res) => {
    try {
        const newPatient = req.body;
        const data = await loadPatients();
        
        // Generate new ID
        data.lastId += 1;
        newPatient.id = `P${String(data.lastId).padStart(3, '0')}`;
        
        // Add to patients array
        data.patients.push(newPatient);
        
        // Save back to file
        const success = await savePatients(data);
        
        if (success) {
            res.json({ success: true, patient: newPatient });
        } else {
            res.status(500).json({ error: 'Failed to save patient' });
        }
    } catch (error) {
        console.error('Error adding patient:', error);
        res.status(500).json({ error: 'Failed to add patient' });
    }
});

// PUT /api/patients - Update all patients (for reordering, status changes, etc.)
app.put('/api/patients', async (req, res) => {
    try {
        const { patients, lastId } = req.body;
        const data = { patients, lastId };
        
        const success = await savePatients(data);
        
        if (success) {
            res.json({ success: true });
        } else {
            res.status(500).json({ error: 'Failed to update patients' });
        }
    } catch (error) {
        console.error('Error updating patients:', error);
        res.status(500).json({ error: 'Failed to update patients' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Patients data file: ${DATA_FILE}`);
});

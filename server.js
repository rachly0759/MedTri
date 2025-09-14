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
        const parsed = JSON.parse(data);
        
        // Validate data structure
        if (!parsed || typeof parsed !== 'object') {
            console.warn('Invalid data structure, resetting to default');
            return { patients: [], lastId: 0 };
        }
        
        // Ensure required properties exist
        if (!Array.isArray(parsed.patients)) {
            parsed.patients = [];
        }
        if (typeof parsed.lastId !== 'number') {
            parsed.lastId = parsed.patients.length;
        }
        
        return parsed;
    } catch (error) {
        console.error('Error loading patients:', error);
        console.log('Returning default empty structure');
        return { patients: [], lastId: 0 };
    }
}

// Save patients to JSON file
async function savePatients(data) {
    try {
        // Validate data before saving
        if (!data || typeof data !== 'object') {
            console.error('Invalid data provided to savePatients');
            return false;
        }
        
        if (!Array.isArray(data.patients)) {
            console.error('Invalid patients array in data');
            return false;
        }
        
        if (typeof data.lastId !== 'number' || data.lastId < 0) {
            console.error('Invalid lastId in data');
            return false;
        }
        
        // Create backup before saving
        try {
            const existingData = await fs.readFile(DATA_FILE, 'utf8');
            const backupFile = DATA_FILE.replace('.json', '.backup.json');
            await fs.writeFile(backupFile, existingData);
        } catch (backupError) {
            console.warn('Could not create backup:', backupError.message);
        }
        
        // Write the new data
        await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
        console.log(`Successfully saved ${data.patients.length} patients`);
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
        
        // Validate request data
        if (!patients || !Array.isArray(patients)) {
            console.error('Invalid patients array in request');
            return res.status(400).json({ error: 'Invalid patients data' });
        }
        
        if (typeof lastId !== 'number' || lastId < 0) {
            console.error('Invalid lastId in request');
            return res.status(400).json({ error: 'Invalid lastId' });
        }
        
        // Validate each patient object
        for (let i = 0; i < patients.length; i++) {
            const patient = patients[i];
            if (!patient || typeof patient !== 'object') {
                console.error(`Invalid patient at index ${i}`);
                return res.status(400).json({ error: `Invalid patient data at index ${i}` });
            }
            
            if (!patient.id || typeof patient.id !== 'string') {
                console.error(`Patient at index ${i} missing valid id`);
                return res.status(400).json({ error: `Patient at index ${i} missing valid id` });
            }
            
            if (typeof patient.esi !== 'number' || patient.esi < 1 || patient.esi > 5) {
                console.error(`Patient ${patient.id} has invalid ESI level`);
                return res.status(400).json({ error: `Patient ${patient.id} has invalid ESI level` });
            }
        }
        
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

// POST /api/patients/recover - Recover from backup if main file is corrupted
app.post('/api/patients/recover', async (req, res) => {
    try {
        const backupFile = DATA_FILE.replace('.json', '.backup.json');
        
        try {
            const backupData = await fs.readFile(backupFile, 'utf8');
            const parsed = JSON.parse(backupData);
            
            // Validate backup data
            if (parsed && Array.isArray(parsed.patients)) {
                await fs.writeFile(DATA_FILE, backupData);
                console.log('Successfully recovered patients from backup');
                res.json({ success: true, message: 'Data recovered from backup' });
            } else {
                throw new Error('Backup data is also corrupted');
            }
        } catch (backupError) {
            console.error('Backup recovery failed:', backupError);
            res.status(500).json({ error: 'Backup recovery failed' });
        }
    } catch (error) {
        console.error('Error during recovery:', error);
        res.status(500).json({ error: 'Recovery failed' });
    }
});

// GET /api/patients/status - Check data file status
app.get('/api/patients/status', async (req, res) => {
    try {
        const data = await loadPatients();
        const backupFile = DATA_FILE.replace('.json', '.backup.json');
        
        let backupExists = false;
        try {
            await fs.access(backupFile);
            backupExists = true;
        } catch {
            backupExists = false;
        }
        
        res.json({
            success: true,
            patientCount: data.patients.length,
            lastId: data.lastId,
            backupExists: backupExists,
            dataFile: DATA_FILE
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to check status' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Patients data file: ${DATA_FILE}`);
});

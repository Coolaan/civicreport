console.log("✅ departments.js loaded");

const express = require('express');
const Department = require('../models/Department');
const router = express.Router();

// Create a new department
router.post('/', async (req, res) => {
  console.log("Incoming department payload:", req.body);

  try {
    let { name, category, description, contactEmail, contactPhone, location } = req.body;

    if (!name || !category) {
      return res.status(400).json({ message: 'Name and category are required.' });
    }

    // 🔍 Parse location safely
    if (typeof location === 'string') {
      try {
        location = JSON.parse(location);
      } catch (err) {
        console.log("⚠️ Failed to parse location JSON:", location);
      }
    }

    console.log("Parsed location:", location);

    if (!location || !Array.isArray(location.coordinates)) {
      return res.status(400).json({
        message: 'Invalid or missing location. Must include coordinates [longitude, latitude].'
      });
    }

    const department = new Department({
      name,
      category,
      description,
      contactEmail,
      contactPhone,
      location: {
        type: 'Point',
        coordinates: location.coordinates.map(Number),
        address: location.address,
        city: location.city,
        state: location.state
      }
    });

    console.log("Saving department:", department);
    await department.save();

    res.status(201).json({ message: 'Department created successfully.', department });
  } catch (error) {
    console.error('❌ Error creating department:', error);
    res.status(500).json({ message: 'Server error while creating department.', error: error.message });
  }
});

// routes/departments.js
// Find nearest department by location and category
router.post('/nearest', async (req, res) => {
  try {
    const { lat, lon, category } = req.body;
    if (!lat || !lon || !category) {
      return res.status(400).json({ message: 'lat, lon, and category required' });
    }

    const nearest = await Department.findOne({
      category: category.toLowerCase(),
      isActive: true
    })
      .near('location', {
        center: {
          type: 'Point',
          coordinates: [parseFloat(lon), parseFloat(lat)]
        },
        maxDistance: 50000 // 50 km radius
      });

    if (!nearest)
      return res.status(404).json({ message: 'No department found nearby' });

    res.json({ department: nearest });
  } catch (error) {
    console.error('Error finding nearest department:', error);
    res.status(500).json({ message: 'Error finding nearest department', error: error.message });
  }
});


// Get all departments
router.get('/', async (req, res) => {
  try {
    const departments = await Department.find().sort({ createdAt: -1 });
    res.json(departments);
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ message: 'Error fetching departments.', error: error.message });
  }
});

// Get department by ID
router.get('/:id', async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) return res.status(404).json({ message: 'Department not found.' });
    res.json(department);
  } catch (error) {
    console.error('Error fetching department:', error);
    res.status(500).json({ message: 'Error fetching department.', error: error.message });
  }
});

// Update department
router.put('/:id', async (req, res) => {
  try {
    const updates = req.body;
    const department = await Department.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!department) return res.status(404).json({ message: 'Department not found.' });
    res.json({ message: 'Department updated successfully.', department });
  } catch (error) {
    console.error('Error updating department:', error);
    res.status(500).json({ message: 'Error updating department.', error: error.message });
  }
});

// Deactivate or activate department
router.patch('/:id/toggle', async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) return res.status(404).json({ message: 'Department not found.' });

    department.isActive = !department.isActive;
    await department.save();

    res.json({ message: `Department ${department.isActive ? 'activated' : 'deactivated'}.`, department });
  } catch (error) {
    console.error('Error toggling department:', error);
    res.status(500).json({ message: 'Error toggling department.', error: error.message });
  }
});

module.exports = router;

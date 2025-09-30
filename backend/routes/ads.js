```javascript
const express = require('express');
const router = express.Router();
const Ad = require('../models/Ad');

// ...existing code...

router.get('/category/:category/:subcategory', async (req, res) => {
    const { category, subcategory } = req.params;
    try {
        const ads = await Ad.find({ category, subcategory });
        res.json(ads);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ...existing code...

module.exports = router;
```
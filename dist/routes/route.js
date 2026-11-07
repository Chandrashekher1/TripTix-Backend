"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = __importDefault(require("../middleware/auth"));
const admin_1 = __importDefault(require("../middleware/admin"));
const routes_1 = require("../models/routes");
const router = express_1.default.Router();
// GET / — find route by origin and destination
router.get('/', async (req, res) => {
    try {
        const { origin, destination } = req.query;
        if (!origin || !destination) {
            return res.status(400).json({ message: 'Missing origin or destination.' });
        }
        const route = await routes_1.Routes.findOne({ origin, destination });
        if (!route)
            return res.status(404).json({ message: 'No routes found.' });
        return res.json({ success: true, data: route });
    }
    catch (err) {
        const error = err;
        return res.status(500).json({ success: false, message: 'Internal Server error.', error: error.message });
    }
});
// POST / — create new route (admin)
router.post('/', [auth_1.default, admin_1.default], async (req, res) => {
    try {
        const { origin, destination, distance } = req.body;
        if (!origin || !destination || !distance) {
            return res.status(400).json({ message: 'Missing or invalid fields: origin, destination, distance' });
        }
        const existingRoute = await routes_1.Routes.findOne({ origin, destination });
        if (existingRoute)
            return res.status(409).json({ message: 'Route already exists' });
        let route = new routes_1.Routes({ origin, destination, distance });
        route = await route.save();
        return res.status(200).json({ success: true, message: 'Routes created successfully.' });
    }
    catch (err) {
        const error = err;
        return res.status(500).json({ success: false, message: 'Internal Server error.', error: error.message });
    }
});
// PATCH /:id — update route (admin)
router.patch('/:id', [auth_1.default, admin_1.default], async (req, res) => {
    try {
        const { origin, destination, distance } = req.body;
        const route = await routes_1.Routes.findByIdAndUpdate(req.params.id, { origin, destination, distance }, { new: true });
        if (!route)
            return res.status(404).json({ message: 'Route not found.' });
        return res.json({ success: true, data: route });
    }
    catch (err) {
        const error = err;
        return res.status(500).json({ success: false, message: 'Internal server error.', error: error.message });
    }
});
// DELETE /:id — delete route (admin)
router.delete('/:id', [auth_1.default, admin_1.default], async (req, res) => {
    try {
        const route = await routes_1.Routes.findByIdAndDelete(req.params.id);
        if (!route)
            return res.status(404).json({ message: 'Route is not available with this ID.' });
        return res.json({ success: true, message: 'Route deleted successfully.' });
    }
    catch (err) {
        const error = err;
        return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=route.js.map
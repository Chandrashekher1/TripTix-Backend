"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function admin(req, res, next) {
    if (!req.user?.isAdmin) {
        res.status(403).send('Access denied.');
        return;
    }
    next();
}
exports.default = admin;
//# sourceMappingURL=admin.js.map
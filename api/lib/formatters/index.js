"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatAPA = exports.formatGBT7714 = exports.formatLSYJ = void 0;
exports.formatCitation = formatCitation;
const lsyj_js_1 = require("./lsyj.js");
Object.defineProperty(exports, "formatLSYJ", { enumerable: true, get: function () { return lsyj_js_1.formatLSYJ; } });
const gbt7714_js_1 = require("./gbt7714.js");
Object.defineProperty(exports, "formatGBT7714", { enumerable: true, get: function () { return gbt7714_js_1.formatGBT7714; } });
const apa_js_1 = require("./apa.js");
Object.defineProperty(exports, "formatAPA", { enumerable: true, get: function () { return apa_js_1.formatAPA; } });
function formatCitation(citation, format) {
    switch (format) {
        case 'lsyj': return (0, lsyj_js_1.formatLSYJ)(citation);
        case 'gbt7714': return (0, gbt7714_js_1.formatGBT7714)(citation);
        case 'apa': return (0, apa_js_1.formatAPA)(citation);
        default: return (0, lsyj_js_1.formatLSYJ)(citation);
    }
}

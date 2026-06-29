"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateId = generateId;
exports.detectLanguage = detectLanguage;
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
function detectLanguage(text) {
    if (/[\u3040-\u30ff]/.test(text))
        return 'ja';
    if (/[\u4e00-\u9fa5]/.test(text))
        return 'zh';
    return 'en';
}

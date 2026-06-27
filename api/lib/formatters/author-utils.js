"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatAuthorName = formatAuthorName;
exports.joinAuthorNames = joinAuthorNames;
/**
 * 将单个作者格式化为"名字+角色"字符串
 */
function formatAuthorName(author, roleStyle = 'direct', defaultRoles = ['著', 'author']) {
    const { name, role } = author;
    if (!role || defaultRoles.includes(role) || roleStyle === 'none')
        return name;
    switch (roleStyle) {
        case 'direct': return name + role;
        case 'parens': return name + '(' + role + ')';
        case 'suffix': return name + ', ' + role;
    }
}
/**
 * 拼接作者名字列表
 * @param separator - 普通分隔符（默认 '、'）
 * @param lastSeparator - 最后两个元素之间的分隔符（如 ' and '），不设则用 separator
 * @param etAlAfter - 超过此数量时截断为 "第一个 + etAlText"
 * @param etAlText - 截断时的省略文本（默认 'et al.'）
 */
function joinAuthorNames(names, opts = {}) {
    const { separator = '、', lastSeparator, etAlAfter, etAlText = 'et al.' } = opts;
    if (names.length === 0)
        return '';
    if (etAlAfter && names.length > etAlAfter) {
        return names[0] + ' ' + etAlText;
    }
    if (lastSeparator && names.length > 1) {
        return names.slice(0, -1).join(separator) + lastSeparator + names[names.length - 1];
    }
    return names.join(separator);
}

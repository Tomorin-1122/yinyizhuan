// endnote-parser.ts

/**
 * Parses EndNote XML exports to extract bibliographic data.
 */

import * as fs from 'fs';
import * as xml2js from 'xml2js';

/**
 * Function to parse EndNote XML data.
 * @param {string} xml - The XML string to parse.
 * @returns {Promise<object>} - A promise that resolves with the parsed data.
 */
export const parseEndNoteXML = (xml: string): Promise<object> => {
    return new Promise((resolve, reject) => {
        xml2js.parseString(xml, { explicitArray: false }, (err, result) => {
            if (err) {
                return reject(err);
            }
            resolve(result);
        });
    });
};

/**
 * Function to read and parse an EndNote XML file.
 * @param {string} filePath - The path to the XML file.
 * @returns {Promise<object>} - A promise that resolves with the parsed data.
 */
export const parseEndNoteFile = (filePath: string): Promise<object> => {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                return reject(err);
            }
            parseEndNoteXML(data)
                .then(resolve)
                .catch(reject);
        });
    });
};

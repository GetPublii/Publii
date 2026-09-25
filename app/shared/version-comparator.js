/*
 * Compares dot-separated numeric versions (e.g. "0.48.0", "3.3.0.0").
 * Returns 1 when v1 is newer, -1 when v2 is newer and 0 when both are equal.
 * Missing and non-numeric parts (e.g. an undefined version) are treated as 0.
 */
module.exports = function (v1, v2) {
    let parts1 = String(v1).split('.').map(n => parseInt(n, 10));
    let parts2 = String(v2).split('.').map(n => parseInt(n, 10));
    let partsToCheck = Math.max(parts1.length, parts2.length);

    for (let i = 0; i < partsToCheck; i++) {
        let num1 = parts1[i] || 0;
        let num2 = parts2[i] || 0;

        if (num1 > num2) {
            return 1;
        }

        if (num1 < num2) {
            return -1;
        }
    }

    return 0;
}

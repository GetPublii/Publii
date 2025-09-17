module.exports = function (v1, v2) {
    let parts1 = v1.split('.').map(n => parseInt(n, 10));
    let parts2 = v2.split('.').map(n => parseInt(n, 10));
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

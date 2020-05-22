// Components lines counter
const glob = require('glob');
const fs = require('fs');

glob(__dirname + '/../app/src/?(components|router|store)/**/*.?(vue|js)', {}, async (err, files) => {
    let basePath = __dirname.replace('/internal-tools', '/');
    let results = [];
    let maximumFilenameLength = 0
    console.log('Total number of analyzed files: ', files.length);
    console.log(''.padEnd(70, '='));

    for (let i = 0; i < files.length; i++) {
        let fileName =  files[i].replace(basePath + 'app/src/components/', '')
                                .replace(basePath + 'app/src/router/', '')
                                .replace(basePath + 'app/src/store/', '');

        if (fileName.length > maximumFilenameLength) {
            maximumFilenameLength = fileName.length;
        }

        try {
            let lines = await countLines(files[i]);
            let rating = '';

            if (lines > 250) {
                rating = '!';
            }

            if (lines > 500) {
                rating = '!!';
            }

            if (lines > 750) {
                rating = '!!!';
            }

            if (lines > 1000) {
                rating = '!!!!';
            }

            if (lines > 1500) {
                rating = '!!!!!';
            }

            results.push({
                file: fileName,
                lines: lines,
                rating: rating
            });
        } catch (err) {
            console.log(err);
        }
    }

    results.sort((a, b) => b.lines - a.lines);

    for (let i = 0; i < results.length; i++) {
        console.log(results[i].file.padEnd(maximumFilenameLength + 5, ' '), (results[i].lines + ' LOC').padEnd(10, ' '), results[i].rating);
    }

    console.log(''.padEnd(70, '='));
    console.log('Total lines of code:', results.reduce((prev, next) => prev + next.lines, 0));
});

function countLines (filePath) {
    return new Promise ((resolve, reject) => {
        let lines = 0;

        fs.createReadStream(filePath).on('data', (buffer) => {
            let id = -1;
            lines--;
            
            do {
                id = buffer.indexOf(10, id + 1);
                lines++;
            } while (id !== -1);
        }).on('end', () => {
            resolve(lines);
        }).on('error', reject);
    });
};

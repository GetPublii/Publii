const blocksMapping = require('./../../../../src/components/block-editor/blocks-mapping.js');

class BlocksToHtml {
    static parse (inputJson) {
        let outputText = '';

        if (inputJson.trim() === '') {
            return outputText;
        }

        outputText = [];
        inputJson = JSON.parse(inputJson);

        for (let block of inputJson) {
            try {
                let blockParser = blocksMapping[block.type];
                let blockContent = blockParser(block);
                outputText.push(blockContent);
            } catch (err) {
                console.error(err);
            }
        }

        return outputText.join("\n");
    }
}

module.exports = BlocksToHtml;

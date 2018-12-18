class PostViewSettings {
    static override(postViewSettings, defaultPostViewConfig) {
        let outputConfig = {};

        // Generate default settings structure
        let defaultViewFields = Object.keys(defaultPostViewConfig);

        for(let i = 0; i < defaultViewFields.length; i++) {
            let field = postViewSettings[defaultViewFields[i]];
            let defaultField = defaultPostViewConfig[defaultViewFields[i]];

            if(typeof field !== 'undefined' && (!field.type || (field.type && field.type === 'select'))) {
                if (
                    defaultField === 0 ||
                    defaultField === '0' ||
                    defaultField.value === 0 ||
                    defaultField.value === '0'
                ) {
                    outputConfig[defaultViewFields[i]] = false;
                } else if (
                    defaultField === 1 ||
                    defaultField === '1' ||
                    defaultField.value === 1 ||
                    defaultField.value === '1'
                ) {
                    outputConfig[defaultViewFields[i]] = true;
                } else {
                    if (typeof defaultField.value !== 'undefined') {
                        outputConfig[defaultViewFields[i]] = defaultField.value;
                    } else if (typeof defaultField !== 'object') {
                        outputConfig[defaultViewFields[i]] = defaultField;
                    }
                }
            } else {
                if (defaultField === '0') {
                    defaultField = 0;
                }

                if (defaultField === '1') {
                    defaultField = 1;
                }

                outputConfig[defaultViewFields[i]] = defaultField;
            }
        }

        // Override values with the post settings
        let postViewFields = Object.keys(postViewSettings);

        for(let i = 0; i < postViewFields.length; i++) {
            let field = postViewSettings[postViewFields[i]];

            if(typeof field !== 'undefined' && field.value) {
                if(field.value !== "") {
                    outputConfig[postViewFields[i]] = field.value;
                }
            } else if(typeof field === 'string' && field !== "") {
                outputConfig[postViewFields[i]] = field;
            }

            if((field.type && field.type === 'select') || !field.type) {
                if(
                    field === 0 ||
                    field === '0' ||
                    field.value === 0 ||
                    field.value === '0'
                ) {
                    outputConfig[postViewFields[i]] = false;
                } else if(
                    field === 1 ||
                    field === '1' ||
                    field.value === 1 ||
                    field.value === '1'
                ) {
                    outputConfig[postViewFields[i]] = true;
                } else {
                    if (typeof field.value !== 'undefined' && field.value !== '') {
                        outputConfig[postViewFields[i]] = JSON.stringify(field.value).replace(/"/g, '');
                    } else if (typeof field !== 'object' && field !== '') {
                        outputConfig[postViewFields[i]] = JSON.stringify(field).replace(/"/g, '');
                    }
                }
            }
        }

        // Fix potential issues with deep objects
        for(let i = 0; i < defaultViewFields.length; i++) {
            let field = outputConfig[defaultViewFields[i]];

            if(typeof field === 'undefined') {
                console.log(defaultViewFields[i] + ' NOT EXISTS!');
                continue;
            }

            if(field.type && field.value) {
                outputConfig[defaultViewFields[i]] = field.value;
            }
        }

        return outputConfig;
    }
}

module.exports = PostViewSettings;

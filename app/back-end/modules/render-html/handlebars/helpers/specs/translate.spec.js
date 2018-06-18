const assert = require('assert');
const Handlebars = require('handlebars');
const translate = require('../translate.js');

describe('Handlebars - translate helper', function() {
    describe('#resolveObject', function() {
        it('should return undefined when there is no arguments', function() {
            assert.equal(undefined, translate.__resolveObject());
        });

        it('should return undefined when one of the arguments is empty', function() {
            assert.equal(undefined, translate.__resolveObject(undefined, false));
            assert.equal(undefined, translate.__resolveObject(false));
        });

        it('should return undefined when the path doesn\'t exist in the passed object', function() {
            assert.equal(undefined, translate.__resolveObject({}, 'a'));
        });

        it('should return proper value when the path exist in the passed object', function() {
            assert.equal(1, translate.__resolveObject({'a': 1}, 'a'));
        });

        it('should return proper value when the path exist in the passed object (nested)', function() {
            assert.equal(1, translate.__resolveObject({'a': {'b': {'c': 1}}}, 'a.b.c'));
        });
    });

    describe('#translate', function() {
        it('should return `[MISSING TRANSLATION]` when there is no translations', function() {
            let translator = translate.__translate.bind({
                translations: {
                    user: false,
                    theme: false
                }
            });

            assert.equal('[MISSING TRANSLATION]', translator());
        });

        it('should return proper value when there is translations', function() {
            let translator = translate.__translate.bind({
                translations: {
                    user: {
                        'key': 'Hello'
                    },
                    theme: false
                }
            });

            assert.equal('Hello', translator('key'));
        });

        it('should return proper value when there is no translations in the user\'s override', function() {
            let translator = translate.__translate.bind({
                translations: {
                    user: {},
                    theme: {
                        'key': 'Hello'
                    }
                }
            });

            assert.equal('Hello', translator('key'));
        });

        it('should return user value when there is translations in the theme\'s language file', function() {
            let translator = translate.__translate.bind({
                translations: {
                    user: {
                        'key': 'Hello'
                    },
                    theme: {
                        'key': 'Hello2'
                    }
                }
            });

            assert.equal('Hello', translator('key'));
        });

        it('should return user value when there is nested translations object', function() {
            let translator = translate.__translate.bind({
                translations: {
                    user: {
                        params: {
                            'key': 'Hello'
                        }
                    },
                    theme: {
                        'key': 'Hello2'
                    }
                }
            });

            assert.equal('Hello', translator('params.key'));
        });

        it('should return [WRONG TRANSLATION ARGUMENTS NUMBER] when there is too few arguments', function() {
            let translator = translate.__translate.bind({
                translations: {
                    user: {
                        'key': 'Hello %s'
                    },
                    theme: {
                        'key': 'Hello2'
                    }
                }
            });

            assert.equal('[WRONG TRANSLATION ARGUMENTS NUMBER]', translator('key', {}));
        });

        it('should return [WRONG TRANSLATION ARGUMENTS NUMBER] when there is too much arguments', function() {
            let translator = translate.__translate.bind({
                translations: {
                    user: {
                        'key': 'Hello %s'
                    },
                    theme: {
                        'key': 'Hello2'
                    }
                }
            });

            assert.equal('[WRONG TRANSLATION ARGUMENTS NUMBER]', translator('key', 'John', 'Doe', {}));
        });

        it('should return properly replaced text when there is text with one replacement', function() {
            let translator = translate.__translate.bind({
                translations: {
                    user: {
                        'key': 'Hello %s'
                    },
                    theme: {
                        'key': 'Hello2'
                    }
                }
            });

            assert.equal('Hello John', translator('key', 'John', {}));
        });

        it('should return properly replaced text when there is text with few replacements', function() {
            let translator = translate.__translate.bind({
                translations: {
                    user: {
                        'key': 'Hello %s %s'
                    },
                    theme: {
                        'key': 'Hello2'
                    }
                }
            });

            assert.equal('Hello John Doe', translator('key', 'John', 'Doe', {}));
        });

        it('should return properly replaced text when the argument is a number', function() {
            let translator = translate.__translate.bind({
                translations: {
                    user: {
                        'key': 'Current date is %s %s'
                    },
                    theme: {
                        'key': 'Hello2'
                    }
                }
            });

            assert.equal('Current date is 12 2017', translator('key', 12, 2017, {}));
        });

        it('should return [NO NUMBER FOR THE PLURAL PHRASE] when there is no argument', function() {
            let translator = translate.__translate.bind({
                translations: {
                    user: {
                        plural: {
                            0: 'Zero',
                            1: 'One',
                            2: 'Two',
                            'default': 'More'
                        }
                    },
                    theme: false
                }
            });

            assert.equal('[NO NUMBER FOR THE PLURAL PHRASE]', translator('plural', {}));
        });

        it('should return [THERE IS NO DEFINITION FOR THE DEFAULT VALUE IN THE PLURAL PHRASE] when there is no definition for the default plural value', function() {
            let translator = translate.__translate.bind({
                translations: {
                    user: {
                        plural: {
                            0: 'Zero',
                            1: 'One',
                            2: 'Two'
                        }
                    },
                    theme: false
                }
            });

            assert.equal('[THERE IS NO DEFINITION FOR THE DEFAULT VALUE IN THE PLURAL PHRASE]', translator('plural', 101, {}));
        });

        it('should return proper translations for a different numbers in plural case', function() {
            let translator = translate.__translate.bind({
                translations: {
                    user: {
                        plural: {
                            0: 'Zero',
                            1: 'One',
                            2: 'Two',
                            'default': 'More'
                        }
                    },
                    theme: false
                }
            });

            assert.equal('Zero', translator('plural', 0, {}));
            assert.equal('One', translator('plural', 1, {}));
            assert.equal('Two', translator('plural', 2, {}));
            assert.equal('More', translator('plural', 3, {}));
            assert.equal('More', translator('plural', 10, {}));
            assert.equal('More', translator('plural', 2048, {}));
        });
    });
});

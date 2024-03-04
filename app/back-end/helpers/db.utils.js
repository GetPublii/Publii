const os = require('os');

/*
 * Other helper functions
 */
class DBUtils {
    constructor (dbInstance) {
        this.DB = dbInstance; 
        this.statement = '';
        this.useWASM = os.platform() === 'linux';
    }

    prepare (sqlStatement) {
        this.statement = sqlStatement;
        return this;
    }

    get (paramsObject = null) {
        if (this.useWASM) {
            if (paramsObject) {
                paramsObject = this.transformParams(paramsObject);
                return this.DB.get(this.statement, paramsObject);
            }

            return this.DB.get(this.statement);
        }

        if (paramsObject !== null) {
            return this.DB.prepare(this.statement).get(paramsObject);
        }

        return this.DB.prepare(this.statement).get();
    }

    run (paramsObject = null) {
        if (this.useWASM) {
            if (paramsObject) {
                paramsObject = this.transformParams(paramsObject);
                return this.DB.run(this.statement, paramsObject);
            }

            return this.DB.run(this.statement);
        }

        if (paramsObject !== null) {
            return this.DB.prepare(this.statement).run(paramsObject);
        }

        return this.DB.prepare(this.statement).run();
    }

    all (paramsObject = null) {
        if (this.useWASM) {
            if (paramsObject) {
                paramsObject = this.transformParams(paramsObject);
                return this.DB.all(this.statement, paramsObject);
            }

            return this.DB.all(this.statement);
        }

        if (paramsObject !== null) {
            return this.DB.prepare(this.statement).all(paramsObject);
        }

        return this.DB.prepare(this.statement).all();
    }

    exec (sqlQueries) {
        this.DB.exec(sqlQueries);
    }

    close () {
        this.DB.close();
    }

    /**
     * Prefix all params in object with "@"
     */
    transformParams (paramsObject) {
        const newParamsObject = {};

        for (const key in paramsObject) {
            if (paramsObject.hasOwnProperty(key)) {
                newParamsObject["@" + key] = paramsObject[key];
            }
        }

        return newParamsObject;
    }
}

module.exports = DBUtils;

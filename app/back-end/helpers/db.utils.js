/*
 * Other helper functions
 */
class DBUtils {
    constructor (dbInstance) {
        this.DB = dbInstance; 
        this.statement = '';
    }

    prepare (sqlStatement) {
        this.statement = sqlStatement;
        return this;
    }

    get (paramsObject = null) {
        if (paramsObject) {
            paramsObject = this.transformParams(paramsObject);
            return this.DB.get(this.statement, paramsObject);
        }

        return this.DB.get(this.statement);
    }

    run (paramsObject = null) {
        if (paramsObject) {
            paramsObject = this.transformParams(paramsObject);
            return this.DB.run(this.statement, paramsObject);
        }

        return this.DB.run(this.statement);
    }

    all (paramsObject = null) {
        if (paramsObject) {
            paramsObject = this.transformParams(paramsObject);
            return this.DB.all(this.statement, paramsObject);
        }

        return this.DB.all(this.statement);
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

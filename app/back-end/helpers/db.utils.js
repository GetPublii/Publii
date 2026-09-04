/*
 * DB helper functions
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
        if (paramsObject !== null) {
            return this.DB.prepare(this.statement).get(paramsObject);
        }

        return this.DB.prepare(this.statement).get();
    }

    run (paramsObject = null) {
        if (paramsObject !== null) {
            return this.DB.prepare(this.statement).run(paramsObject);
        }

        return this.DB.prepare(this.statement).run();
    }

    all (paramsObject = null) {
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
}

module.exports = DBUtils;

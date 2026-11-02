/*
 * node:sqlite returns rows without prototype - plugins can access the DB
 * via the renderer, so rows are returned as plain objects (as with better-sqlite3)
 */
function toPlainRow (row) {
    return row === undefined ? row : Object.assign({}, row);
}

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
            return toPlainRow(this.DB.prepare(this.statement).get(paramsObject));
        }

        return toPlainRow(this.DB.prepare(this.statement).get());
    }

    run (paramsObject = null) {
        if (paramsObject !== null) {
            return this.DB.prepare(this.statement).run(paramsObject);
        }

        return this.DB.prepare(this.statement).run();
    }

    all (paramsObject = null) {
        if (paramsObject !== null) {
            return this.DB.prepare(this.statement).all(paramsObject).map(toPlainRow);
        }

        return this.DB.prepare(this.statement).all().map(toPlainRow);
    }

    exec (sqlQueries) {
        this.DB.exec(sqlQueries);
    }

    close () {
        this.DB.close();
    }
}

module.exports = DBUtils;

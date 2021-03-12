class Storage {

    #socket;
    #database;

    constructor (socket, database) {
        this.#socket = socket;
        this.#database = database;
    }

    /** 
     * @param {String} key 
     * @returns {*}
     */
    get (key) {
        this.#socket.emit("get", this.#database, key);
        return new Promise(resolve => {
            this.#socket.on("get", (db, k, value, err) => {
                if (err) {
                    console.log(err)
                    return resolve(err);
                }
                if (db == this.#database && k == key) {
                    resolve(value)
                }
            }) 
        })
    }

    /** 
     * @param {String} key 
     * @param {String} value 
     * @returns {*}
     */
    set (key, value) {
        this.#socket.emit("set", this.#database, key, value);
        return new Promise(resolve => {
            this.#socket.on("set", (db, k, value, err) => {
                if (err) {
                    console.log(err)
                    return resolve(err);
                }
                if (db == this.#database && k == key) {
                    resolve(value)
                }
            }) 
        })
    }

    /** 
     * @param {String} key 
     * @returns {Boolean}
     */
    has (key) {
        this.#socket.emit("has", this.#database, key);
        return new Promise(resolve => {
            this.#socket.on("has", (db, k, value, err) => {
                if (err) {
                    console.log(err)
                    return resolve(err);
                }
                if (db == this.#database && k == key) {
                    resolve(value)
                }
            }) 
        })
    }

    /** 
     * @param {String} key 
     * @returns {Boolean}
     */
    exist (key) {
        return this.has(key);
    }

}

class Client {

    #io;
    #socket;

    constructor (address, id, pwd) {
        this.#io = require("socket.io-client")
        this.#socket = this.#io(address)

        this.#socket.on("connect", () => {
            this.#socket.emit("auth", id, pwd);
        })

        this.#socket.on("disconnect", () => {
            console.log("Disconnected from the server")
        })

        this.#socket.on("auth", (r, config) => {
            if (r) {
                console.log(`Authentified as '${id}' on '${address}'`)
            } else {
                console.log(`Authentification failed! Invalid username or password!`)
            }
        })
    }

    /** 
     * @param {String} database 
     */
    getPermission (database) {
        this.#socket.emit("access", database);
        return new Promise(resolve => {
            this.#socket.on("access", (db, perm) => {
                if (!perm) return;
                if (db == database) {
                    resolve(perm)
                }
            }) 
        })
    }

    /** 
     * @param {String} database 
     * @returns {Storage}
     */
    getDatabase (database) {
        return new Promise(async resolve => {
            if (!(await this.getPermission(database)).writing && !(await this.getPermission(database)).reading) return resolve(console.log("Unable to get this database, your permission can't read or write on this database."));
            resolve(new Storage(this.#socket, database));
            console.log(`Getting database '${database}' with :`)
            console.log((await this.getPermission(database)))
        })
    }

}

module.exports = Client;
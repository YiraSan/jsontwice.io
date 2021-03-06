class StorageInterface {

    #socket;
    #database;

    constructor (socket, database) {
        this.#socket = socket;
        this.#database = database
    }

    /** 
     * @param {String} key 
     * @returns {*}
     */
    get (key) {
        this.#socket.emit("get", this.#database, key);
        return new Promise(resolve => {

            setTimeout(()=>{
                resolve("DATABASE TIMED_OUT")
            }, 10000)

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
            
            setTimeout(()=>{
                resolve("DATABASE TIMED_OUT")
            }, 10000)

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
     * @returns {*}
     */
    remove (key) {
        this.#socket.emit("remove", this.#database, key);
        return new Promise(resolve => {
            
            setTimeout(()=>{
                resolve("DATABASE TIMED_OUT")
            }, 10000)

            this.#socket.on("remove", (db, k, err) => {
                if (err) {
                    console.log(err)
                    return resolve(err);
                }
                if (db == this.#database && k == key) {
                    resolve(true)
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
            
            setTimeout(()=>{
                resolve("DATABASE TIMED_OUT")
            }, 10000)
            
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

class AcceleratedStorageInterface extends StorageInterface {

    #quick;

    constructor (socket, database) {
        super (socket, database);
        this.#quick = {};
        setTimeout(()=>{

            socket.on("edit", async (d, key) => {
                if (database != d) return;
                if (this.#quick[key] != null && this.#quick[key] != undefined)
                this.#quick[key] = await super.get(key);
            })

        },1000)
    }

    get (key) {
        if (this.#quick[key] != null && this.#quick[key] != undefined) return Promise.resolve(this.#quick[key]);
        return new Promise(async resolve => {
            var value = await super.get(key);
            this.#quick[key] = value;
            resolve(value)
        });
    }

    has (key) {
        return this.#quick[key] ? Promise.resolve(this.#quick[key]) : super.has(key);
    }

    set (key, value) {
        this.#quick[key] = value;
        return super.set(key, value);
    }

    remove (key) {
        this.#quick[key] = null;
        return super.remove(key);
    }

}

class Client {

    #io;
    #socket;
    #options;

    constructor (address, id, pwd, options={
        log: true,
    }) {
        this.#io = require("socket.io-client")
        this.#socket = this.#io(address)
        this.#options = options;

        this.#socket.on("connect", () => {
            this.#socket.emit("auth", id, pwd);
        })

        this.#socket.on("disconnect", () => {
            if (this.#options.log) console.log("Disconnected from the server")
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
     * @returns {StorageInterface}
     */
    getDatabase (database) {
        return new AcceleratedStorageInterface(this.#socket, database);
    }

}

module.exports = { Client, Storage: StorageInterface, AcceleratedStorage: AcceleratedStorageInterface };
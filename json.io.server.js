function run () {

const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const osu = require('node-os-utils')

const chalk = require('chalk')

const fs = require('fs')
var hash = require('hash.js');

var register = [];
var users = {};

var csl = {
    users: [],
    message: "Initialization...",
    title: `                        ${chalk.magenta("JSONTWICE.IO")} - ${chalk.cyan(require('./package.json').version)}`
}

async function updateConsole() {

    var interSide = "+--------------------------------------------------------------------+"
    
    console.clear();
    console.log(interSide)
    console.log(csl.title)
    console.log(interSide)
    console.log(csl.message)
    console.log("+------------------------------ USER --------------------------------+")

    if (csl.users.length == 0) {
        console.log(`                                ${chalk.red("....")}`)
    } else {
        for (let i = 0; i < csl.users.length; i++) {
            if (users[csl.users[i].name]) {
                if (users[csl.users[i].name].admin == true) csl.users[i].role = chalk.red("ADMINISTRATOR");
                if (users[csl.users[i].name].role) csl.users[i].role = users[csl.users[i].name].role;
            }
            if (csl.users[i].ip.includes("127.0.0.1")) csl.users[i].ip = "localhost";
            console.log(`${csl.users[i].name} - [${csl.users[i].ip}] (${csl.users[i].role})`)
        }
    }

    console.log(interSide)

    var cpu = Math.floor(100-(await osu.cpu.free()))
    var mem = 100-(await osu.mem.info()).freeMemPercentage
    var memS = (await osu.mem.info()).usedMemMb
    if (cpu < 30) {
        cpu = chalk.green(cpu)
    } else if (cpu < 60) {
        cpu = chalk.yellow(cpu)
    } else {
        cpu = chalk.red(cpu)
    }
    if (mem < 50) {
        mem = chalk.green(mem)
    } else if (mem < 70) {
        mem = chalk.yellow(mem)
    } else {
        mem = chalk.red(mem)
    }
    console.log(`CPU: ${cpu}% - RAM: ${(await mem)}% (${memS}mo)`)
    console.log(interSide)
    
}

function getDatabase(name) {
    var rtn = false;
    for (let i = 0; i < register.length; i++) {
        if (register[i].identifier == name) {
            rtn = register[i].filesystem;
            break;
        }
    }
    return rtn;
}

if (fs.existsSync("database/config.json")) {

    if (!fs.existsSync("backup/")) fs.mkdirSync("backup/");
    if (!fs.existsSync("database/data/")) fs.mkdirSync("database/data/");

    const config = low(new FileSync("database/config.json"))

    if (!config.has("files").value() || config.get("files").value().length == 0) {
        csl.message = "Erreur lors de la lecture des fichiers dans la config\nNo files in config"
        return updateConsole();
    }

    var files = config.get("files").value();

    for (let i = 0; i < files.length; i++) {
        register.push({"identifier": files[i], "filesystem": low(new FileSync("database/data/"+files[i]))})
    }

    users[config.get("admin.id").value()] = {
        pwd: config.get("admin.pwd").value(),
        admin: true,
    };

    var user_config = config.get("users").value();
    
    user_config.forEach((v, i) => {
        var id = v.id; 
        users[id] = {
            pwd: v.pwd,
            access: v.access,
            role: v.role,
        }
    })

    csl.message = "Starting server.."
    updateConsole();

    const server = require('http').createServer()
    const io = require('socket.io')(server)

    server.listen(config.get("port").value())

    function editSocket(id, name) {
        if (!id) return;
        if (!name) return;
        for (let i = 0; i < csl.users.length; i++) {
            if (csl.users[i].id == id) {
                csl.users[i].name = name;
                break;
            }
        }
        return updateConsole();
    }

    function deleteSocket(id) {
        if (!id) return;
        for (let i = 0; i < csl.users.length; i++) {
            if (csl.users[i].id == id) {
                csl.users.splice(i, 1);
                break;
            }
        }
        return updateConsole();
    }

    function checkUser(id, pwd) {
        
        if (!id) return false;
        if (!pwd) return false;

        if (users[id] == undefined || !users[id]) return false;

        var password = hash.sha512().update(pwd).digest("hex");

        if (users[id].pwd == password) {
            return true;
        } else {
            return false;
        }
   
    }

    function getAuthorized(user, db) {
        if (!user || !db) return {
            writing: false,
            reading: false,
        };
        var user = users[user];
        if (user.admin == true) return {
            writing: true,
            reading: true,
        };
        if (config.has(`roles.${user.role}.${db}.writing`).value() || config.has(`roles.${user.role}.${db}.reading`).value()) {
            var r = config.get(`roles.${user.role}.${db}.reading`).value()
            var w = config.has(`roles.${user.role}.${db}.writing`).value()
            if (!r) r = false;
            if (!w) w = false;
            return {
                writing: w,
                reading: r,
            };
        } else if (config.has(`roles.${user.role}.${db}`).value()) {
            if (config.get(`roles.${user.role}.${db}`).value() == true) return {
                writing: true,
                reading: true,
            };
            if (config.get(`roles.${user.role}.${db}`).value() == false) return false;
        }
        if (user['access'][db] == undefined) return {
            writing: false,
            reading: false,
        };
        if (user['access'][db].writing != undefined || user['access'][db].reading != undefined) {
            if (!user['access'][db].reading || user['access'][db].reading == undefined) user['access'][db].reading = false;
            if (!user['access'][db].writing || user['access'][db].writing == undefined) user['access'][db].writing = false;
            return {
                writing: user['access'][db].writing,
                reading: user['access'][db].reading,
            };
        } else if (user['access'][db] == true) return {
            writing: true,
            reading: true,
        };
        return {
            writing: false,
            reading: false,
        };
    }

    io.on("connection", socket => {

        var USER = false;

        // CONNECTION...
        csl.users.push({name: "NOT AUTHENTIFIED", id: socket.id, ip: socket.request.connection.remoteAddress, role: "?"})
        updateConsole()

        socket.on('auth', (user, pwd) => {
            
            if (USER != false) return;

            if (!user || !pwd) return socket.emit('auth', false);

            if (checkUser(user, pwd)) {
                editSocket(socket.id, user)
                socket.emit('auth', true)
                USER = user;
            } else {
                socket.emit('auth', false)
            }
            
        })

        socket.on('get', (database, key) => {
            var db = getDatabase(database)
            if (typeof db != "object") return socket.emit('get', database, key, null, "Database doesn't exist");
            if (getAuthorized(USER, database).reading == true) {
                return socket.emit('get', database, key, db.get(key).value());
            } else {
                return socket.emit('get', database, key, null, "Access Denied");
            }
        })

        socket.on('set', (database, key, value) => {
            var db = getDatabase(database)
            if (typeof db != "object") return socket.emit('set', database, key, false, "Database doesn't exist");
            if (getAuthorized(USER, database).writing == true) {
                db.set(key, value).write();
                return socket.emit('set', database, key, true);
            } else {
                return socket.emit('set', database, key, false, "Access Denied");
            }
        })

        socket.on('has', (database, key) => {
            var db = getDatabase(database)
            if (typeof db != "object") return socket.emit('has', database, key, null, "Database doesn't exist");
            if (getAuthorized(USER, database).reading == true) {
                return socket.emit('has', database, key, db.has(key).value());
            } else {
                return socket.emit('has', database, key, null, "Access Denied");
            }
        })

        socket.on('access', database => {
            socket.emit('access', database, getAuthorized(USER, database))
        })

        // WHEN DISCONNECTING...
        socket.on('disconnecting', () => {
            deleteSocket(socket.id)
        })

    })

    csl.message = `                       Server started on ${require('chalk').yellow(config.get("port").value())}`
    updateConsole();

    setInterval(()=>{
        updateConsole();
    }, 1000)

} else {

    csl.message = "Creating database..."
    updateConsole();

    if (!fs.existsSync("database/")) fs.mkdirSync("database/");

    const config = low(new FileSync("database/config.json"))

    config.set("admin", {
        id: "root",
        pwd: hash.sha512().update("root").digest("hex"),
    }).write()

    config.set("users", [{
        id: "default",
        pwd: hash.sha512().update("default").digest("hex"),
        access: {
            default_db: true,
        },
        role: "default_user",
    }]).write()

    config.set("roles", {
        default_user: {
            default_user_db: true,
        },
        banned: {
            default_db: false,
            default_user_db: false,
        }
    }).write()

    config.set("files", ["default_db", "default_user_db"]).write()

    config.set("port", 3000).write()

    config.set("server", {
        main_server: {
            active_backup: false,
            active_backup_server: false,
            backup_server: [],
            time_beetween_backup: 3600,
            max_backup: 3,
        },
        backup_server: {
            time_beetween_backup: 3600,
            max_backup: 5,
            can_send_data: false,
        },
        mode: "main_server",
    }).write()

    csl.message = "Database config created!\nPlease check and edit it :P"
    updateConsole();

}

}

module.exports = () => {
    run();
};
// IMPORT ->

const FileSync  = require('lowdb/adapters/FileSync')
const chalk     = require('chalk')
const low       = require('lowdb')
const osu       = require('node-os-utils')
const fs        = require('fs')

var hash        = require('hash.js');
var term        = require( 'terminal-kit' ).terminal;

// SERVER ->

function run () {

var register = [];
var users = {};

var aka = {};
var akaComplete = [];

var csl = {
    users: [],
    message: "Initialization...",
    title: `                        ${chalk.magenta("JSONTWICE.IO")} - ${chalk.cyan(require('./package.json').version)}`
}

async function updateConsole() {

    var config = false;

    if (fs.existsSync("database/config.json")) config = low(new FileSync("database/config.json"))

    var interSide = "+--------------------------------------------------------------------+"
    
    console.clear();
    console.log(interSide)
    console.log(csl.title)
    console.log(interSide)
    console.log(csl.message)

    try {
        if (config.get("server.console_mode").value() == false) {

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
    
        }
    } catch (error) {
        
    }

    if (csl.message != "") console.log(interSide);
    if (config.get("server.console_mode").value() == true) csl.message = "";

    if (typeof config != "object" || config.get("server.console_mode").value() == true) return;
    if (config.get("server.active_sys_usage").value() == true) {
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

    var config = low(new FileSync("database/config.json"))

    if (!config.has("files").value() || config.get("files").value().length == 0) {
        csl.message = "Erreur lors de la lecture des fichiers dans la config\nNo files in config"
        return updateConsole();
    }

    var files = config.get("files").value();

    for (let i = 0; i < files.length; i++) {
        if (files[i].includes(".")) {
            csl.message = chalk.red(`Database '${files[i]}' can't contain a point.`)
            updateConsole();
            process.exit(0)
        }
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

    function end () {
        io.close();
        server.close();
        process.exit();
    }

    function editSocket(id, name) {
        if (!id) return;
        if (!name) return;
        for (let i = 0; i < csl.users.length; i++) {
            if (csl.users[i].id == id) {
                csl.users[i].name = name;
                break;
            }
        }
        if (config.get("server.console_mode").value() != true) {
            updateConsole();
        }
    }

    function deleteSocket(id) {
        if (!id) return;
        for (let i = 0; i < csl.users.length; i++) {
            if (csl.users[i].id == id) {
                csl.users.splice(i, 1);
                break;
            }
        }
        if (config.get("server.console_mode").value() != true) {
            updateConsole();
        }
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
        if (config.get("server.console_mode").value() != true) {
            updateConsole();
        }

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

    if (config.get("server.console_mode").value() == true) {
        
        var database = {
            id: ".",
            name: "GLOBAL"
        }
    
        var ans = (args) => {

            if (args[0].toLowerCase() == "db" || args[0].toLowerCase() == "database") {

                if (!args[1]) {
                    console.log(chalk.red("ERROR: Please specify a database!"))
                } else {
                    if (typeof getDatabase(args[1]) != "object" && args[1] != ".") {
                        console.log(chalk.red("ERROR: The database doesn't exist!"))
                        return;
                    }
                    database.id = args[1];
                    if (args[1]==".") return database.name = "GLOBAL";
                    database.name = args[1].toUpperCase();
                }

                return;

            } else if (args[0].toLowerCase() == "clear") {

                return updateConsole();

            } else if (args[0].toLowerCase() == "help") {

                var is = " ";

                console.log(`   clear                 Clear the console\n   help                  help command\n   close                 Close the server\n   who                   Who is connected\n${is}\n   database|db [name]    Enter in a database\n   set [key] [value]     Set an information by a key\n   get [key]             Get an information by a key`)
                
                return;

            } else if (args[0].toLowerCase() == "close") {

                console.log(chalk.red("Closing server..."))
                end();

            } else if (args[0].toLowerCase() == "rl" || args[0].toLowerCase() == "reload") {

                config = low(new FileSync("database/config.json"))

                for (let i = 0; i < register.length; i++) {
                    register[i].filesystem = low(new FileSync(`database/data/${register[i].identifier}`))
                }

                return;

            } else if (args[0].toLowerCase() == "who") {

                if (csl.users.length != 0) {
                    for (let i = 0; i < csl.users.length; i++) {
                        if (users[csl.users[i].name]) {
                            if (users[csl.users[i].name].admin == true) csl.users[i].role = chalk.red("ADMINISTRATOR");
                            if (users[csl.users[i].name].role) csl.users[i].role = users[csl.users[i].name].role;
                        }
                        if (csl.users[i].ip.includes("127.0.0.1")) csl.users[i].ip = "localhost";
                        console.log(`${csl.users[i].name} - [${csl.users[i].ip}] (${csl.users[i].role})`)
                    }
                } else {
                    console.log(`No one connected`)
                }

                return;

            } else if (args[0].toLowerCase() == "get") {

                if (!args[1]) return console.log(chalk.red("ERROR: Please specify the key!"));

                if (database.id == "." || database.id == null) {

                    console.log(config.get(args[1]).value())

                } else {

                    console.log(getDatabase(database.id).get(args[1]).value())

                }

                return;

            } else if (args[0].toLowerCase() == "set") {

                if (!args[1]) return console.log(chalk.red("ERROR: Please specify the key!"));
                if (!args[2]) return console.log(chalk.red("ERROR: Please specify the value!"));
                if (args[3]) return console.log(chalk.red("ERROR: You can't put a value over than an args."));

                if (typeof args[2] == "string") {
                    args[2] = args[2].toLowerCase()
                }

                if (args[2] == "false") { args[2] = false }
                if (args[2] == "true") { args[2] = true }

                if (!isNaN(parseInt(args[2]))) { args[2] = parseInt(args[2]) }

                if (database.id == "." || database.id == null) {

                    try {
                        config.set(args[1], args[2]).write()
                        console.log(chalk.green("Succesfully edit."))
                    } catch (error) {
                        console.log(chalk.red("ERROR: "+error))
                    }

                } else {

                    try {
                        getDatabase(database.id).set(args[1], args[2]).write()
                        console.log(chalk.green("Succesfully edit."))
                    } catch (error) {
                        console.log(chalk.red("ERROR: "+error))
                    }

                }

                return;

            } else {

                if (args[0].split(" ")[0] != "") {
                    console.log(chalk.red("Unknown Command"))
                }

                return;

            }
    
        }

        function cmd () {

            var db;

            if (database.id == "." || database.id == null) {
                db = config.value();
            } else {
                db = getDatabase(database.id).value();
            }

            var complete = [
                'db', 
                'db .', 
                'database', 
                'database .',
                'close',
                'get',
                'set',
                'help',
                'clear',
                'who',
            ];
        
            register.forEach(v=>{
                complete.push(`db ${v.identifier}`)
                complete.push(`database ${v.identifier}`)
            });

            var databaseKey = [];
            for(var k in db) {
                databaseKey.push(`get ${k}`);
                databaseKey.push(`set ${k}`);
            }

            var autoComplete = complete.concat(databaseKey);
        
            term(`${database.name} > `);
            
            term.inputField(
                {
                    history: true, 
                    autoComplete: autoComplete, 
                    autoCompleteHint: true,
                    tokenHook: function(token, isEndOfInput, previousTokens, term, config) {
                        var previousText = previousTokens.join(' ');
                        switch (token) {
                            case 'set':
                                config.style = term.white;
                                return previousTokens.length ? null : term.red;
                            case 'get':
                                config.style = term.white;
                                return previousTokens.length ? null : term.brightBlue;
                            case 'close':
                                config.style = term.white;
                                return previousTokens.length ? null : term.bold.red;
                            case 'database':
                                config.style = term.cyan;
                                return previousTokens.length ? null : term.magenta;
                            case 'db':
                                config.style = term.cyan;
                                return previousTokens.length ? null : term.magenta;
                        }
                    }
                },
                function(error, input) {
                    if (error) {
                        console.log("\n"+chalk.red(`ERROR: ${error}`))
                    } else {
                        
                        var args = input.split(" ")
                        console.log("")
                        ans(args);
                        return cmd();
        
                    }
                }
            )
        
        }
    
        console.log(`\nFind all commands in 'help' | jsontwice.io@${(require('./package.json')).version}\nCreated by YiraSan\n`)

        cmd();

    } else {

        setInterval(()=>{
            updateConsole();
        }, 1000)

    }

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
        active_sys_usage: false,
        console_mode: true,
        mode: "main_server",
    }).write()

    csl.message = "Database config created!\nPlease check and edit it :P"
    updateConsole();

}

}

module.exports = () => {
    run();
};
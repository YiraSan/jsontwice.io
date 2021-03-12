const Client = require('./json.io.client')
const runServer = require('./json.io.server')

const hash = require('hash.js')

var createUser = (user, password) => {
    var password = hash.sha512().update(password).digest('hex')
    var low = require('lowdb')
    var filesync = require('lowdb/adapters/FileSync')
    var config = low(new filesync("database/config.json"))

    var userk = config.get("users").value()

    userk.push({
        "id": user,
        "pwd": password,
        "access": {},
        "role": "default_user"
    })

    config.set("users", userk).write();
}

var adminPwd = (password) => {
    var password = hash.sha512().update(password).digest('hex')
    var low = require('lowdb')
    var filesync = require('lowdb/adapters/FileSync')
    var config = low(new filesync("database/config.json"))
    config.set("admin.pwd", password).write();
}

module.exports = { Client, runServer, createUser, adminPwd };
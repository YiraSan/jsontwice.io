<div align="center">
  <img src="https://cdn.cmtapp.fr/jsontwice.png" height="300px"><br>
  <a href="https://www.npmjs.com/package/jsontwice.io"><img src="https://img.shields.io/npm/v/jsontwice.io?style=for-the-badge" alt="Version" /></a>  
  <a href="https://www.npmjs.com/package/jsontwice.io"><img src="https://img.shields.io/npm/dt/jsontwice.io?style=for-the-badge" alt="Downloads" /></a><br>
  A powerfull json-server using socket.io
</div>

# Contents Table

- [Installation](#installation)
- [Usage](#usage)
  - [Getting Started](#getting-started)
  - [Client](#client)
    - [getPermission](#getPermission)
    - [getDatabase](#getDatabase)
    - [Storage](#storage)
        - [get](#get)
        - [set](#set)
        - [has](#has)
        - [exist](#exist)
    - [Object](#object)
        - [Array](#array)
        - [ArrayList](#arraylist)
  - [Server](#server)
  - [Web](#web)

# Installation

Simple ;)

| NPM | YARN |
| --- | ---- |
| `npm i jsontwice.io` | `yarn i jsontwice.io` |

# Usage

JsonTwice.IO need to be used in an async function/process, to use "await".

## Getting Started

**Client**

```js
const { Client } = require('jsontwice.io')

const client = new Client("http://localhost:3000/", "root", "root") // DEFAULT USERNAME & PASSWORD OF THE ADMIN ACCOUNT

async () => { // THAT'S AN EXAMPLE, THIS ASYNC FUNCTION ARE NEVER EXECUTED IF YOU COPY IT
    
    var database = await client.getDatabase("mySuperDatabaseName") // Don't work if you can't read and write on this database
    var something = await database.get("something")

    console.log(something) // Return something :)

};

``` 

**Server**

```js
const { runServer, createUser } = require('jsontwice.io')

runServer();

// You can edit the configuration of your server inside the package jsontwice.io, in the "database" dir.

``` 

## Client

***

### getPermission

Reveal the permission you have in a specific database.

|Parameter|Type|Description|
|-|-|:-|
|database|[String](https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Objets_globaux/String)|The name of an existing database|

**@Returns** `{Object}` - The read and write permission as a json object.

***

### getDatabase

Return the storage class of a specific database.

|Parameter|Type|Description|
|-|-|:-|
|database|[String](https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Objets_globaux/String)|The name of an existing database|

**@Returns** `{Storage}`

***

## Storage

The edition class of a specific database

***

### get

Get a value by a key.

|Parameter|Type|Description|
|-|-|:-|
|key|[String](https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Objets_globaux/String)|The key of the value|

**@Returns** `{*}`

***

### set

Set a value by a key.

|Parameter|Type|Description|
|-|-|:-|
|key|[String](https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Objets_globaux/String)|The key of the value|
|value|*|The value|

***

### has

|Parameter|Type|Description|
|-|-|:-|
|key|[String](https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Objets_globaux/String)|The key of the value|

**@Returns** `{Boolean}` - Return true if the key exist, or false else.

***

### exist

**@Returns** `{Function}` - has function;

***

## Object

Json Object example.

### Array

**Get**

```js
var array = await database.get("somethingLikeAnArray")

array["yeah"] // return array.yeah
array.yeah // return array.yeah
``` 

**Set**

```js
await database.set("somethingLikeAnArray", {
    example: "That's an example",
    idk: "...",
})
``` 

### ArrayList

**Set a new list**

```js
var list = []

list.push("one")
list.push("two")

await database.set("somethingLikeAnArrayList", list)
```

**Get a list**

```js
var list = await database.get("somethingLikeAnArray")

list[0] // return "one"
list[1] // return "two"
list[2] // return null
```

**Edit a list**

```js
var list = await database.get("somethingLikeAnArrayList")

list.push("three")

await database.set("somethingLikeAnArrayList", list)
```

**See the result**

```js
var list = await database.get("somethingLikeAnArrayList")

list[0] // return "one"
list[1] // return "two"
list[2] // return "three"
``` 

***

## Server

**Create the server for the first time**

```js 
const { runServer } = require('jsontwice.io')

runServer()
```

**You'll see a new dir in the jsontwice.io package, named 'database'**

Inside you can find the 'config.json'
Let's configure your server :)

**Create a new user**
```js
const { createUser } = require('jsontwice.io')

createUser("username", "password");

// You can edit his permission inside the 'config.json' file.
```

**Change the admin password**
```js
const { adminPwd } = require('jsontwice.io')

adminPwd("the new password");
```

**EDIT THE CONFIG NEEDS A RESTART OF THE SERVER AND PLEASE DON'T EDIT YOUR CONFIG WHILE SERVER RUNNING**

***

## Web 

**Soon**

***

<div align="center">
    <a href="https://www.npmjs.com/package/jsontwice.io"><img src="https://nodei.co/npm/jsontwice.io.png?downloads=true&stars=true" alt="installInfo" /></a><br>
</div>

Rayane Bakkali &copy; 2021

var soundcloud = require("./soundcloud")
var express    = require("express")
var logger     = require("beautiful-log")
var mongo      = require("promised-mongo")

var db         = mongo("soundbase")
var network    = require("./network")(soundcloud, db)

soundcloud.init({
	id: "c83cb321de3b21b1ca4435fb5913a3c2",
	secret: "8ac987a0fc511567e46c79ae78877c12",
	uri: "http://localhost:1337/return"
})

var gen_id = function(num) {
	return Math.floor(Math.random() * 216506041)
}

let queue = []
let count = 0

var loop = function() {
	let active;
	if (queue.length == 0 || Math.random() < 0.1) {
		queue = []	
		active = gen_id()
	} else {
		active = queue.unshift()
	}

	return network.search(100, active)
	  .then((set) => {
		count += set.length	  
		for (let s of set) {
			queue.push(s.id)
		}
	  	return loop()
	  })
	  .catch(loop)
}

setInterval( () => console.log(`Current Indexed: ${count}`), 60000)
loop()

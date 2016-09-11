var soundcloud = require("./soundcloud")
var express    = require("express")
var logger     = require("beautiful-log")
var mongo      = require("promised-mongo")
var PriorityQueue = require("es-collections").PriorityQueue

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

let pq = new PriorityQueue((a, b) => a.val - b.val)
let count = 0

var loop = function() {
	let active;
	if (pq.size == 0 || pq.size > 100000) {
		pq = new PriorityQueue((a, b) => a.val - b.val)
		active = gen_id()
	} else {
		active = pq.remove().id
	}

	return network.search(100, active)
	  .then((set) => {
		count += set.length	  
		for (let s of set) {
			pq.add({ val: Math.random(), id: s.id })
		}
	  	return loop()
	  })
	  .catch(loop)
}

let start = Date.now()
setInterval(() => {
	let spent = (Date.now() - start) / 1000;
	console.log(`Current Indexed: ${count} (${(count/spent).toFixed(4)} tracks/sec)`);
}, 5000)
loop()

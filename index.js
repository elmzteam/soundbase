var soundcloud    = require("./soundcloud")
var express       = require("express")
var logger        = require("beautiful-log")
var mongo         = require("promised-mongo")

var db            = mongo("soundbase")
var network       = require("./network")(soundcloud, db)

soundcloud.init({
	id: "c83cb321de3b21b1ca4435fb5913a3c2",
	secret: "8ac987a0fc511567e46c79ae78877c12",
	uri: "http://localhost:1337/return"
})

var app = express();
app.use("/static", express.static(__dirname + "/static"))

var abort = (res) => (e) => {
	res.status(503).send({status: "ERROR"});
	return console.error(e);
}

app.get("/return", (req, res) => {
	var code = req.query.code;

	soundcloud.authorize(code)
	  .then((token) => logger.log(`Received token ${token}`))
	  .then(() => res.send({status: "OK"}))
	  .catch(abort(res))
})

app.get("/auth", (req, res) => {
	res.redirect(soundcloud.getConnectUrl());
})

app.get("/test/:q", (req, res) => {
	soundcloud.get("/tracks?q="+req.params.q)
	  .then((d) => res.send({data: d}))
	  .catch(abort(res))
})

app.get("/search/:track", (req, res) => {
	network.search(req.query.num || 25, req.params.track)
	  .then((d) => {return {status: "OK", data: d}})
	  .then((d) => res.send(d))
	  .catch(abort(res))
})

app.listen(1337)

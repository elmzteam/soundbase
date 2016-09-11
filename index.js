var soundcloud    = require("./soundcloud")
var express       = require("express")
var logger        = require("beautiful-log")
var mongo         = require("promised-mongo")
var bodyparser    = require("body-parser");
var nodemailer    = require('nodemailer');

var db            = mongo("soundbase")
var network       = require("./network")(soundcloud, db)

var transport = nodemailer.createTransport("smtps://soundscapepennapps%40gmail.com:daydreamop@smtp.gmail.com");

soundcloud.init({
	id: "c83cb321de3b21b1ca4435fb5913a3c2",
	secret: "8ac987a0fc511567e46c79ae78877c12",
	uri: "http://localhost:1337/return"
})

var app = express();
app.use(bodyparser.json());
app.use("/static", express.static(__dirname + "/static"))

app.get("/", (req, res) => res.sendFile(__dirname + "/static/index.html"));

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

app.get("/query/:q", (req, res) => {
	soundcloud.get("/tracks?q="+req.params.q)
	  .then((data) => data.map(network.marshall))
	  .then((d) => res.send({status: "OK", data: d}))
	  .catch(abort(res))
})

app.get("/search/:track", (req, res) =>
	search(parseInt(req.query.num) || 25, req.params.track)
	  .then((data) => res.send(data))
	  .catch(abort(res)));

app.get("/sample", (req, res) =>
	sample(parseInt(req.query.num) || 25)
	  .then((data) => res.send({status: "OK", data: data}))
	  .catch(abort(res)));

var prev = [];
var current = [];

app.post("/start", (req, res) => {
	prev = current;
	current = [];
	res.status(200).send();
});

app.post("/save", (req, res) => {
	const {url} = req.body;
	soundcloud.get(`/${url.substring(url.indexOf("tracks"), url.indexOf("stream") - 1)}`)
	  .then(({title: title, permalink_url: url}) => {
		current.push({title, url});
		res.status(200).send();
	  }).catch(abort(res));
});

app.post("/email", (req, res) => {
	console.log(prev);
	let message = `<p>Hey there,</p>

<p>We hope you enjoyed the Soundscape demo.  Here are the tracks you picked:<p>
<ul>
${prev.map((track) => `<li><a href=${track.url}>${track.title}</a></li>`).join("\n")}
</ul>
<p>Thanks for checking us out!</p>`;

	let options = {
		from: "Soundscape Team <soundscapepennapps@gmail.com>",
		to: req.body.email,
		subject: "Your Soundscape Tracks",
		html: message
	};

	transport.sendMail(options, (err, info) => {
		if (err) {
			res.status(500).send();
			console.error(err);
			return;
		}
		console.log("Email sent.");
		res.status(200).send();
	})
});

function search(number, track) {
	return network.search(number, track)
	  .then((d) => {
	  	if (d.length > 0) {
	  		return d;
	  	} else {
	  		return sample(25);
	  	}
	  })
	  .then((d) => ({ status: "OK", data: d }))
}

function sample(size) {
	return db.songs.aggregate({ $sample: { size }});
}

app.listen(1337)

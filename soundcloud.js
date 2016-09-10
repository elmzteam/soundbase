let soundcloud = require("node-soundcloud")

let promiseSC = soundcloud;
promiseSC._authorize = promiseSC.authorize;
promiseSC._get = promiseSC.get;
promiseSC._put = promiseSC.put;
promiseSC._post = promiseSC.post;

promiseSC.authorize = (code) => new Promise((resolve, reject) => {
	promiseSC._authorize(code, (err, data) => {
		if (err) return reject(err)
		return resolve(data)
	})
})

promiseSC.get = (code) => new Promise((resolve, reject) => {
	promiseSC._get(code, (err, data) => {
		if (err) return reject(err)
		return resolve(data)
	})
})

promiseSC.put = (code) => new Promise((resolve, reject) => {
	promiseSC._put(code, (err, data) => {
		if (err) return reject(err)
		return resolve(data)
	})
})

promiseSC.post = (code) => new Promise((resolve, reject) => {
	promiseSC._post(code, (err, data) => {
		if (err) return reject(err)
		return resolve(data)
	})
})

module.exports = promiseSC

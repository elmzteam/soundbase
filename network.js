let shuffle = (arr) =>
	arr.sort(() => Math.floor(Math.random()*3)-1)

let networkManager = function(soundcloud, db) {
	if (! (this instanceof networkManager)) {
		return new networkManager(soundcloud, db)
	}
	this.soundcloud = soundcloud;
	this.db = db
}

networkManager.prototype = {
	_dbSearch: function(num, track) {
		track = parseInt(track)
		return this.db.edges.find({
			songs: track
		}).limit(2*num)
		  .then((edges) => {
			let promises = []
			for (let edge of edges) {
				let [first, second] = edge.songs
			        let connector = track == first ? second : first;

				promises.push(this.db.songs.findOne({id: connector}, {_id: 0}))
			}

		  	return Promise.all(promises)
		}).then((songs) => {
			songs = shuffle(songs)
			let base = Math.floor(num/2)
			return songs.slice(0, base + Math.floor(Math.random() * (num - base)))
		})
	},
	search: function (num, track) {
		track = parseInt(track)
		let cachedStore = {}
		const that = this
		const users = Math.ceil(Math.sqrt(num*2));
		const tracks = Math.ceil(Math.sqrt(num*2));

		return this._dbSearch(num, track).then((cached) => {
			cachedStore = cached;
			num = num - cached.length;

			let comments = `/tracks/${track}/comments`;

			return this.soundcloud.get(comments)
		}).then((comms) => {
			//Somewhat expensive, only do it on a fresh search
			comms = shuffle(comms)
			let userList = []
			for (let i = 0; i < Math.min(users, comms.length); i++) {
				userList.push(
					that.soundcloud.get(`/users/${comms[i].user.id}/favorites`));
			}
			return Promise.all(userList);
		}).then((faves) => {
			let trackSet = new Set();
			let objs = {}
			let promises = []
			for (let i = 0; trackSet.size < num && i < num; i++) {
				for (let fav of faves) {
					if (i >= fav.length) continue;
					if (fav[i].id == track) continue
					if (trackSet.size >= num) return Promise.all(promises);
					trackSet.add(fav[i].id);
					let obj = {
						id: fav[i].id || 0,
						stream_url: fav[i].stream_url || "",
						artwork_url: fav[i].artwork_url || "",
						title: fav[i].title || "",
						description: fav[i].description || "", 
					}
					promises.push(that.db.songs.update({id: fav[i].id}, {$set: obj}, {upsert: true})
					  .then(() => that.db.edges.findOne({songs: {$all: [track, fav[i].id]}, user: fav[i].user.id}))
					  .then((e) => e ? null : that.db.edges.insert({songs: [track, fav[i].id], user: fav[i].user.id}))
					  .then(() => obj))
				}
			}
			return Promise.all(promises)
		}).then((d) => cachedStore.concat(d))
	}
}

module.exports = networkManager

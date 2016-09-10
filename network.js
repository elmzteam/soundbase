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
		return this.db.songs.find({
			id: {$not: {$eq: track}}, 
			adjacent: track}, 
		{id: 0, adjacent: 0}).limit(2*num)
		  .then((songs) => {
			songs = shuffle(songs)
			let base = Math.floor(num/2)
			return songs.slice(0, base + Math.floor(Math.random() * (num - base)))
		  })
	},
	search: function (num, track) {
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
			for (let i = 0; trackSet.size < num && i < num; i++) {
				for (let fav of faves) {
					if (i >= fav.length) continue;
					if (trackSet.size >= num) return [trackSet, objs];
					trackSet.add(fav[i].id);
					objs[fav[i].id] = {
						id: fav[i].id,
						stream_url: fav[i].stream_url,
						artwork_url: fav[i].artwork_url,
						title: fav[i].title,
						description: fav[i].description, 
					}
				}
			}
			return [trackSet, objs]
		}).then(([trackSet, objs]) => {
			let promises = [];
			let mongoSet = [...trackSet]
			for (let id of mongoSet) {	
				promises.push(that.db.songs.update({id: id}, {$set: objs[id], $addToSet: {
					adjacent: track,
				}}, {upsert: true})
				  .then(() => objs[id]))
			}
			return Promise.all(promises)
		}).then((d) => cachedStore.concat(d))
	}
}

module.exports = networkManager

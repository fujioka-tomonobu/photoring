'use strict';

var fs = require('fs');

/**
 * socket.io
 */
this.onConnect = function(socket){
	
	console.log("socket.io connected.");
	
	/**
	 * Receive photo
	 */
	socket.on('photo_send', function(request) {
		var photoId = Date.now();
		request.photoId = photoId;
		socket.broadcast.emit('photo_delivery', request);
		fs.writeFile('./storage/' + photoId, JSON.stringify(request, null, '    '), function(err){
			if(err) throw err;
		});
	});
};

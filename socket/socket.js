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
		socket.broadcast.emit('photo_delivery', request);
	});
	
	
	/**
	 * Receive Remove Request
	 */
	socket.on('photo_remove_send', function(request) {
		socket.broadcast.emit('photo_remove_delivery', request);
		fs.unlink('./storage/' + request.photoId, function(err){
		});
	});
};

'use strict';

var express = require('express');
var fs = require('fs');
var router = express.Router();

/* GET photos listing. */
router.get('/', function(req, res, next) {
	
	fs.readdir('./storage', function(err, files){
		if (err) throw err;
		var photos = [];
		files.forEach(function(file){
			photos.push(file);
		});

		res.send(photos);
	});
	
});

/* GET photo */
router.get('/:id', function(req, res, next) {
	var text = fs.readFileSync('./storage/' + req.params.id, 'utf8');
	res.send(text);
	/*
	var text = fs.readFileSync('./storage/' + req.params.id, 'utf8');
	
	res.header({"Content-Type": "image/*"});
	res.send(JSON.parse(text).photo);
	*/
});

module.exports = router;

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

/* GET photoId */
router.get('/photoId', function(req, res, next) {
	res.send({photoId : Date.now()});
});

/* GET photo */
router.get('/:id', function(req, res, next) {
	fs.readFile('./storage/' + req.params.id, 'utf8', function(err, text){
		res.send(text);
	});
});

/* POST photo */
router.post('/', function(req, res) {
	fs.writeFile('./storage/' + req.body.photoId, JSON.stringify(req.body, null, '    '), function(err){
		if(err) {
			console.log(err);
			throw err;
		}
		res.send({message : 'OK', photoId: req.body.photoId});
	});
});

module.exports = router;

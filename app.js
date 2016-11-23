var express = require("express");
var app = express();
var gpio = require("gpio");

var gpio203 = gpio.export(203, {
   direction: "out",
   ready: function() {
   console.log("GPIO 203 VALUE: ", gpio203.value);
   }
});

app.get("/", function(req, res){
	if (gpio203.value == 1) {
		res.send('<h2>Preklopnik 2Mbit linkov!</h2><a href="/1" style="background-color:red">PRIMARY</a><br><a href="/0">BACKUP</a>');
	} else {
		res.send('<h2>Preklopnik 2Mbit linkov!</h2><a href="/1">PRIMARY</a><br><a href="/0" style="background-color:red">BACKUP</a>');
	};
});

app.get("/0", function(req, res){
	gpio203.set(0);
	setTimeout(function() {
		console.log("GPIO 203 VALUE: ", gpio203.value);
		if (gpio203.value == 1) {
			res.send('<h2>Preklopnik 2Mbit linkov!</h2><a href="/1" style="background-color:red">PRIMARY</a><br><a href="/0">BACKUP</a>');
		} else {
			res.send('<h2>Preklopnik 2Mbit linkov!</h2><a href="/1">PRIMARY</a><br><a href="/0" style="background-color:red">BACKUP</a>');
		};
	}, 100);
});

app.get("/1", function(req, res){
	gpio203.set(1);
	setTimeout(function() {
	    console.log("GPIO 203 VALUE: ", gpio203.value);
		if (gpio203.value == 1) {
			res.send('<h2>Preklopnik 2Mbit linkov!</h2><a href="/1" style="background-color:red">PRIMARY</a><br><a href="/0">BACKUP</a>');
		} else {
			res.send('<h2>Preklopnik 2Mbit linkov!</h2><a href="/1">PRIMARY</a><br><a href="/0" style="background-color:red">BACKUP</a>');
		};
	}, 100);
});

app.listen(80, function(){
	console.log("Server is listening on port 80!!!");
});
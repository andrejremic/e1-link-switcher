var express = require("express");
var app = express();
var gpio = require("gpio");

app.get("/", function(req, res){
	res.send("Hello world!");
});

var gpio203 = gpio.export(203, {
   direction: "out",
   ready: function() {
   	console.log("GPIO 203 VALUE: ", gpio203.value);
   }
});

app.get("/0", function(req, res){
	res.send("Izbrali ste 0!");
	gpio203.set(0);
	setTimeout(function() {
	console.log("GPIO 203 VALUE: ", gpio203.value);
	}, 1000);
});

app.get("/1", function(req, res){
	res.send("Izbrali ste 1!");
	gpio203.set(1);
	setTimeout(function() {
	console.log("GPIO 203 VALUE: ", gpio203.value);
	}, 1000);
});


app.listen(80,function(){
	console.log("Server is listening on port 80!!!");
});
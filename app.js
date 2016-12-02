var os = require('os');
var express = require('express');
var app = express();
var bodyParser =  require("body-parser"); 
var Gpio = require('onoff').Gpio;

var eth0IP = os.networkInterfaces().eth0[0].address;

// CONFIGURATION
var webuiPort = 80;
var pin7preklop = new Gpio(203, 'high'); // export GPIO to userspace, export: gpio 203 (pin 7), direction: out, value: 1

app.use(bodyParser.urlencoded({extended: true}));

app.set('view engine', 'ejs');

app.get('/', function(req, res){
	res.render('home');
});

app.post('/preklop', function(req, res){
	var aktivnaPovezava = req.body.preklop;git
	console.log('Preklop na', aktivnaPovezava.toUpperCase()+'.');
});

process.on('SIGINT', function () { // CTRL+C
  console.log('\nPreklopnik USTAVLJEN!')
  pin7preklop.unexport(); 
  process.exit(); // ustavimo aplikacijo
});

app.listen(webuiPort, function(){
	console.log('Preklopnik ZAGNAN.\nSpletni vmesnik je dosegliv na http://'+eth0IP+':'+webuiPort+'.');
});
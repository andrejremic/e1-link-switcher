var os = require('os');
var express = require('express');
var app = express();
var bodyParser =  require("body-parser"); 
var Gpio = require('onoff').Gpio;

var eth0IP = os.networkInterfaces().eth0[0].address;

// CONFIGURATION
var webuiPort = 80;
var pin7preklop = new Gpio(203, 'out'); // export GPIO to userspace, export: gpio 203 (pin 7), direction: out, value: 0
var	statusPovezave;

app.use(bodyParser.urlencoded({extended: true}));

app.use(express.static('public'));
app.set('view engine', 'ejs'); // da ni potrebno pisat .ejs

function mapAktivnaPovezava(val){
	if (val===1) return 'REDUNDANTNA';
	if (val===0) return 'PRIMARNA';
	if (val==='PRIMARNA') return 0;
	if (val==='REDUNDANTNA') return 1;
};

pin7preklop.read(function(err, value){
	pin7preklop.stanjeIzhoda = value;
	statusPovezave = mapAktivnaPovezava(value);
	console.log('Trenutno aktivna povezava: '+statusPovezave);
});

statusPovezave = mapAktivnaPovezava(pin7preklop.stanjeIzhoda);

app.post('/preklop', function(req, res){
	aktivnaPovezava = parseInt(req.body.preklop);
	pin7preklop.write(aktivnaPovezava, function(){
		statusPovezave = mapAktivnaPovezava(aktivnaPovezava);
		console.log('WEBUI preklop na: '+statusPovezave);
		res.send({success: 'true'});
	});
});

app.post('/status', function(req, res){
	console.log('WEBUI POST /status: '+statusPovezave);
	res.send({status: mapAktivnaPovezava(statusPovezave)});
});

app.get('/', function(req, res){
	res.render('home');
});


process.on('SIGINT', function () { // CTRL+C
  console.log('\nPreklopnik USTAVLJEN!')
  pin7preklop.unexport(); 
  process.exit(); // ustavimo aplikacijo
});

app.listen(webuiPort, function(){
	console.log('Preklopnik ZAGNAN.\nSpletni vmesnik je dosegliv na http://'+eth0IP+':'+webuiPort+'.');
});
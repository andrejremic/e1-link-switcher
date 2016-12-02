var os = require('os');
var express = require('express');
var app = express();
var bodyParser =  require("body-parser"); 
var Gpio = require('onoff').Gpio;

var eth0IP = os.networkInterfaces().eth0[0].address;

// CONFIGURATION
var webuiPort = 80;
var pin7preklop = new Gpio(203, 'out'); // export GPIO to userspace, export: gpio 203 (pin 7), direction: out, value: 1


app.use(bodyParser.urlencoded({extended: true}));

app.use(express.static('public'));
app.set('view engine', 'ejs'); // da ni potrebno pisat .ejs

function mapAktivnaPovezava(val){
	if (val===1) return 'backup';
	if (val===0) return 'master';
	if (val==='master') return 0;
	if (val==='backup') return 1;
};


pin7preklop.read(function(err, value){
	if (err) {
    	throw err;
    }
	pin7preklop.stanjeIzhoda = value;
	console.log('Trenutno aktivna povezava: '+mapAktivnaPovezava(value).toUpperCase());
});

app.post('/preklop', function(req, res){
	aktivnaPovezava = req.body.preklop;
	console.log(aktivnaPovezava);
	pin7preklop.write(aktivnaPovezava, function(err){
		console.log('ERROR:', err);
	});
	res.send({success: 'true'});
});

app.get('/', function(req, res){
	pin7preklop.read(function(err, value){
		if (err) {
	    	throw err;
	    }
		res.render('home', {aktivnaPovezava: value});
	});
});


process.on('SIGINT', function () { // CTRL+C
  console.log('\nPreklopnik USTAVLJEN!')
  pin7preklop.unexport(); 
  process.exit(); // ustavimo aplikacijo
});

app.listen(webuiPort, function(){
	console.log('Preklopnik ZAGNAN.\nSpletni vmesnik je dosegliv na http://'+eth0IP+':'+webuiPort+'.');
});
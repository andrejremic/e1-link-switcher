var os 	 					= require('os'),
	express  				= require('express'),
	bodyParser 				= require('body-parser'), 
	Gpio  					= require('onoff').Gpio,
	mongoose  				= require('mongoose'),
	passport  				= require('passport'),
	User 					= require('./models/user.js'),  
	LocalStratey  			= require('passport-local'),
	passportLocalMongoose  	= require('passport-local-mongoose');

mongoose.connect('mongodb://localhost/auth_demo_app');

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  // we're connected!
});

var app = express();
app.set('view engine', 'ejs'); // da ni potrebno pisat .ejs
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static('public'));
app.use(require('express-session')({
	secret: 'To je res neki kar noben ne bo pogruntal!',
	resave: false,
	saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStratey(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

var eth0IP = os.networkInterfaces().eth0[0].address;

/////////////////
// Auth Routes //
/////////////////

// handling - dodajanje uporabnika
app.post('/adduser', function(req, res){
	// var newUser = User({username: req.body.username})
	req.body.username
	req.body.password
	User.register(new User({username: req.body.username}), req.body.password, function(err, user){
		if(err){
			console.log(Date()+' '+err); // TODO: uporabnika obvesti o morebitnih napakah
			return res.render('adduser', {bodyClass: 'login'});
		} 
		passport.authenticate('local')(req, res, function(){
			res.redirect("/login");
		});
	});
});


//////////////////
// LOGIN ROUTES //
//////////////////

// render login form
app.get('/login', function(req,res){
	res.render('login', {bodyClass: 'login'});
});

// login logic
// middleware
app.post('/login', passport.authenticate('local', {
	successRedirect: '/',
	failureRedirect: '/login'
	}) ,function(req, res){
}); 

app.get('/logout', function(req, res){
	req.logout();
	res.redirect('/');
});


///////////////////
// CONFIGURATION //
///////////////////

var webuiPort = 80;
var pin7preklop = new Gpio(203, 'high'); // export GPIO to userspace, export: gpio 203 (pin 7), direction: out, value: 1
var pin18stikalo = new Gpio(201, 'in', 'both');
var pin16led = new Gpio(200, 'out');
var	statusPovezave;


function mapAktivnaPovezava(val){
	if (val===0) return 'REDUNDANTNA';
	if (val===1) return 'PRIMARNA';
	if (val==='PRIMARNA') return 1;
	if (val==='REDUNDANTNA') return 0;
};

function pin7Read(callback){
	pin7preklop.read(function(err, value){		
		if (err) {
		    throw err;
	    }
		pin7preklop.stanjeIzhoda = value;
		// console.log(pin7preklop.stanjeIzhoda);
		statusPovezave = mapAktivnaPovezava(value);
		callback();
	});
};

pin7Read(function(){
	console.log(Date()+' Trenutno aktivna povezava: '+statusPovezave);
});


pin18stikalo.watch(function (err, value) {
	if (err) {
	    throw err;
    }
    pin7Read(function(){
    	// console.log('pin7preklop.stanjeIzhoda: '+pin7preklop.stanjeIzhoda);
	    pin18stikalo.rocniPreklop = 1-pin7preklop.stanjeIzhoda;
	    // console.log('pin18stikalo.rocniPreklop: '+pin18stikalo.rocniPreklop);
	    var rocniPreklopIme = mapAktivnaPovezava(pin18stikalo.rocniPreklop);
	    pin7preklop.write(pin18stikalo.rocniPreklop, function(){
			console.log(Date()+' ROČNI PREKLOP preklop na: '+rocniPreklopIme);
			pin16led.writeSync(pin18stikalo.rocniPreklop);
		});
    });
});

app.post('/preklop', function(req, res){
	pin7Read(function(){
		aktivnaPovezava = parseInt(req.body.preklop);
		// console.log('aktivnaPovezava: '+aktivnaPovezava);
		// console.log('pin7preklop.stanjeIzhoda: '+pin7preklop.stanjeIzhoda);
		// console.log('statusPovezave: '+statusPovezave);
		if (pin7preklop.stanjeIzhoda!=aktivnaPovezava){
			pin7preklop.write(aktivnaPovezava, function(){
				statusPovezave = mapAktivnaPovezava(aktivnaPovezava);
				console.log(Date()+' WEBUI preklop na: '+statusPovezave);
				res.send({success: 'true'});	// preklopil	
			});
		} else {
			res.send({success: 'false'});   // ni preklopil, ker ni spremembe
		};
	});
});

app.post('/status', function(req, res){
	pin7Read(function(){
		console.log(Date()+' WEBUI POST /status: '+statusPovezave);
		res.send({status: mapAktivnaPovezava(statusPovezave)});
	});
});

app.get('/', isLogedIn, function(req, res){
	res.render('home', {bodyClass: 'default', currentUsername: req.user.username, currentUsername: req.user.username});
});

app.get('/config', isLogedIn, function(req, res){
	res.render('config', {bodyClass: 'default', currentUsername: req.user.username});
});

function isLogedIn(req, res, next){
	if(req.isAuthenticated()){
		console.log(Date()+' islogedIn: '+req.user.username+' JE prijavljen');
		return next();
	}
	res.redirect('/login');
	console.log(Date()+' islogedIn: NI prijavljen');
};


process.on('SIGINT', function () { // CTRL+C
  console.log('\n'+Date()+' Preklopnik USTAVLJEN!')
  pin7preklop.unexport(); 
  pin18stikalo.unexport(); 
  pin16led.unexport(); 
  process.exit(); // ustavimo aplikacijo
});

app.listen(webuiPort, function(){
	console.log(Date()+' Preklopnik ZAGNAN. >>> Spletni vmesnik je dosegliv na http://'+eth0IP+':'+webuiPort+'. <<<');
});
var os 	 					= require('os'),
	moment  				= require('moment'),
	express  				= require('express'),
	passport 				= require('passport'),
	Strategy 				= require('passport-local').Strategy,
	Gpio  					= require('onoff').Gpio,
	db 						= require('./db');

// Configure the local strategy for use by Passport.
//
// The local strategy require a `verify` function which receives the credentials
// (`username` and `password`) submitted by the user.  The function must verify
// that the password is correct and then invoke `cb` with a user object, which
// will be set at `req.user` in route handlers after authentication.
passport.use(new Strategy(
  function(username, password, cb) {
    db.users.findByUsername(username, function(err, user) {
      if (err) { return cb(err); }
      if (!user) { return cb(null, false); }
      if (user.password != password) { return cb(null, false); }
      return cb(null, user);
    });
  }));


// Configure Passport authenticated session persistence.
//
// In order to restore authentication state across HTTP requests, Passport needs
// to serialize users into and deserialize users out of the session.  The
// typical implementation of this is as simple as supplying the user ID when
// serializing, and querying the user record by ID from the database when
// deserializing.
passport.serializeUser(function(user, cb) {
  cb(null, user.id);
});

passport.deserializeUser(function(id, cb) {
  db.users.findById(id, function (err, user) {
    if (err) { return cb(err); }
    cb(null, user);
  });
});



// Create a new Express application.
var app = express();

app.set('view engine', 'ejs'); // da ni potrebno pisat .ejs

app.use(express.static('public'));

// Use application-level middleware for common functionality, including
// logging, parsing, and session handling.
//app.use(require('morgan')('combined'));
app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(require('express-session')({ secret: 'lep dan!', resave: false, saveUninitialized: false }));

// Initialize Passport and restore authentication state, if any, from the
// session.
app.use(passport.initialize());
app.use(passport.session());



///////////////////
// CONFIGURATION //
///////////////////

var webuiPort = 80;
var pin7preklop = new Gpio(203, 'high'); // export GPIO to userspace, export: gpio 203 (pin 7), direction: out, value: 1
var pin18stikalo = new Gpio(201, 'in', 'both');
var pin16led = new Gpio(200, 'out');
var	statusPovezave;

var eth0IP = os.networkInterfaces().eth0[0].address;

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
		pin7preklop.readTimestamp = moment(); 
		// console.log(pin7preklop.stanjeIzhoda);
		statusPovezave = mapAktivnaPovezava(value);
		callback();
	});
};

pin7Read(function(){
	console.log(pin7preklop.readTimestamp.format('DD-MM-YYYY H:mm:ss')+' Trenutno aktivna povezava: '+statusPovezave);
});


pin18stikalo.watch(function (err, value) {
	if (err) {
	    throw err;
    }
    //console.log('WATCH: '+value);
    pin7Read(function(){
    	//console.log('pin7preklop.stanjeIzhoda: '+pin7preklop.stanjeIzhoda);
	    pin18stikalo.rocniPreklop =  1 ^ pin7preklop.stanjeIzhoda;
	    // console.log('pin18stikalo.rocniPreklop: '+pin18stikalo.rocniPreklop);
	    var rocniPreklopIme = mapAktivnaPovezava(pin18stikalo.rocniPreklop);
	    pin7preklop.write(pin18stikalo.rocniPreklop, function(){	    	
	    	pin7preklop.preklopTimestamp = moment();
			console.log(pin7preklop.preklopTimestamp.format('DD-MM-YYYY H:mm:ss')+' ROČNI PREKLOP preklop na: '+rocniPreklopIme+' '+pin18stikalo.rocniPreklop);
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
				pin7preklop.preklopTimestamp = moment();
				console.log(pin7preklop.preklopTimestamp.format('DD-MM-YYYY H:mm:ss')+' WEBUI preklop na: '+statusPovezave);
				res.send({success: 'true'});	// preklopil	
			});
		} else {
			res.send({success: 'false'});   // ni preklopil, ker ni spremembe
		};
	});
});

app.post('/status', function(req, res){
	pin7Read(function(){
		console.log(pin7preklop.readTimestamp.format('DD-MM-YYYY H:mm:ss')+' WEBUI POST /status: '+statusPovezave);
		res.send({status: mapAktivnaPovezava(statusPovezave), refreshTimestamp: pin7preklop.readTimestamp.format('H:mm:ss')});
	});
});

app.get('/status', function(req, res){
	pin7Read(function(){
		res.send({status: pin7preklop.stanjeIzhoda ? 'primary' : 'backup', uptime: parseInt(os.uptime())}); // če je true(1) = primary, če je false(0) = backup; uptime je v sekundah
	});
});

app.get('/login',
  function(req, res){
    res.render('login', {bodyClass: 'login'});
});

app.post('/login', 
  passport.authenticate('local', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
});

app.get('/logout',
  function(req, res){
    req.logout();
    res.redirect('/');
});
  

app.get('/',
  require('connect-ensure-login').ensureLoggedIn(),
  function(req, res){
	res.render('home', {bodyClass: 'default', currentUsername: req.user.displayName});
});




// app.get('/config', function(req, res){
// 	res.render('config', {bodyClass: 'default', currentUsername: 'test'});
// });


process.on('SIGINT', function () { // CTRL+C
  console.log('\n'+moment().format('DD-MM-YYYY H:mm:ss')+' Preklopnik USTAVLJEN!')
  pin7preklop.unexport(); 
  pin18stikalo.unexport(); 
  pin16led.unexport(); 
  process.exit(); // ustavimo aplikacijo
});

app.listen(webuiPort, function(){
	console.log(moment().format('DD-MM-YYYY H:mm:ss')+' Preklopnik ZAGNAN. >>> Spletni vmesnik je dosegliv na http://'+eth0IP+':'+webuiPort+'. <<<');
});
var os 	 					= require('os'),
	express  				= require('express'),
	bodyParser 				= require("body-parser"), 
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
			console.log(err); // TODO: uporabnika obvesti o morebitnih napakah
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
var	statusPovezave;


function mapAktivnaPovezava(val){
	if (val===0) return 'REDUNDANTNA';
	if (val===1) return 'PRIMARNA';
	if (val==='PRIMARNA') return 1;
	if (val==='REDUNDANTNA') return 0;
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

app.get('/', isLogedIn, function(req, res){
	console.log(req.user);
	res.render('home', {bodyClass: 'default', currentUsername: req.user.username, currentUsername: req.user.username});
});

app.get('/config', isLogedIn, function(req, res){
	res.render('config', {bodyClass: 'default', currentUsername: req.user.username});
});

function isLogedIn(req, res, next){
	if(req.isAuthenticated()){
		console.log('islogedIn: JE prijavljen');
		return next();
	}
	res.redirect('/login');
	console.log('islogedIn: NI prijavljen');
};


process.on('SIGINT', function () { // CTRL+C
  console.log('\nPreklopnik USTAVLJEN!')
  pin7preklop.unexport(); 
  process.exit(); // ustavimo aplikacijo
});

app.listen(webuiPort, function(){
	console.log('Preklopnik ZAGNAN.\nSpletni vmesnik je dosegliv na http://'+eth0IP+':'+webuiPort+'.');
});
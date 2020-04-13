// Define required packages
var fs 		= require('fs');				// To access the filesystem e.g. for database and config file
var express = require('express');			// The http API
var parser  = require('body-parser');		// Express module that exposes POST form data to a object called req.body
var pug  	= require('pug');				// The template engine for rendering the webpages
var moment 	= require('moment');			// A JavaScript library to format times and dates
var request = require('request');			// To make a http request - here to send the notification using PushOver.net API
var sqlite3 = require("sqlite3").verbose();	// The database engine
var config 	= require('./config.json');		// The configuration stored in a simple JSON file
var os		= require('os');				// Needed to request hostname

// Prepare the setup
// =============================================================================

var app        = express();       			// Activate the http based API system      
app.set('view engine', 'pug');				// Use PUG as template engine
app.set('views', './view')					// Define where the templates are stored
app.use(express.static('./public'));		// Define where static files (e.g. CSS and JS) are stored
app.use(parser.urlencoded());				// Initiate the body parser to parse standard HTML POST forms
var port = process.env.PORT || 8088;        // Set the port
var router = express.Router();              // Init the express API endpoint router
var notifierFuture;							// This stores the future object that sends the notification after the configured period


// Define the API endpoints
// =============================================================================

app.use('/tracker', router);

// Define the GET endpoint for root - shows a page to continue to event entry or monitor last events data
app.get('/', function(req, res) {
	res.set('Content-Type', 'text/html');
	res.render('index', 
		{
			header		: config.header,
			title		: config.title,
			hostname	: os.hostname(),
			port		: port,
			app_icon	: config.app_icon
		}
	);
});	

// This GET endpoint uses a given timestamp request parameter or if not given the current time and stores it in the database.
// Then a timer is set to trigger the notification after the time configured in the config.json file.
// A maybe existing not fired notification will be deleted before.
app.get('/event', function(req, res) {
	var timestamp = Date.now();
	let param = req.query.timestamp;
	if (param)
	{
		console.log("Found a timestamp in GET parameters: " +param +" of type " +typeof param);
		timestamp = Number(param);
	}
	console.log("Event at " +moment(timestamp).format('h:mm:ss') +" registered.");
	db.run("insert into Bottles (dTime) VALUES (" +timestamp +")");
    
	clearTimeout(notifierFuture);
	notifierFuture = setTimeout(sendNotification,																	// The function to send notification
								config.notification.timer -(Date.now()-timestamp),									// The timeout in miliseconds
								config.notification.message + moment(timestamp).locale(config.locale).format('LT'),	// First argument (message)
								config.notification.app_token);														// Second argument (app_token for PushOver)
	res.redirect('/monitor');
});

// The page to monitor the last events time
app.get('/monitor', function(req, res) {
    console.log('Requesting timer');
	db.each("SELECT * FROM Bottles ORDER BY rowid DESC LIMIT 1", function(err, row) {
    res.set('Content-Type', 'text/html');
	res.render('monitor', 
		{
			serving: moment(row.dTime).locale(config.locale).format('LT'), 
			timeAgo: moment(row.dTime).fromNow(),
			header : config.header,
			title  : config.title,
			app_icon	: config.app_icon
		}
	);
  });
});

// The manual input page
app.get('/input', function(req, res) {
    console.log('Requesting manual input page');
	res.set('Content-Type', 'text/html');
		res.render('input', 
		{
			header 		: config.header,
			title  		: config.title,
			hostname	: os.hostname(),
			port		: port,
			app_icon	: config.app_icon
		}
	);
  });

// The manual notification request page
app.get('/notifier', function(req, res) {
    console.log('Requesting notification input page');
	res.set('Content-Type', 'text/html');
		res.render('notifier', 
		{
			header 		: config.header,
			title  		: config.title,
			hostname	: os.hostname(),
			port		: port
		}
	);
  });
  
  
// The summary page for a notification setup including the sending of the message
app.post('/notification', function(req, res) {
	console.log('Requesting notification sending page');
	setTimeout(sendNotification,			// The function to send notification
		Number(req.body.minutes)*1000*60,	// The timeout in miliseconds
		req.body.message,					// First argument (message)
		config.notification.generic_app);	// Second argument (app_token for PushOver)
	res.set('Content-Type', 'text/html');
		res.render('push', 
		{
			message 	: req.body.message,
			minutes 	: req.body.minutes,
			title  		: config.title,
			hostname	: os.hostname(),
			port		: port
		}
	);
  });
  
function sendNotification(message, app_token) {
	var messageObject = { 	"user"		: config.notification.user_id,
							"token"		: app_token,
							"message"	: message};
	request({
		url		: "https://api.pushover.net/1/messages.json",
		method	: "POST",
		json	: true,
		body	: messageObject}, 
		function (error, response, body){}
	);
}
  
  
// Prepare database and launch the system
// =============================================================================

// Read the database file if exists or create table if not existing
var file 	= config.db_file;
var exists 	= fs.existsSync(file);
var db 		= new sqlite3.Database(file);
db.serialize(function() {
  if(!exists) {
    db.run("CREATE TABLE " +config.db_name +" (dTime INTEGER)");
  }
});

// Start the endpoints
app.listen(port);
console.log('UnTiBaNo started and is listening on port ' + port +" check http://" +os.hostname() +":8088/");
console.log('============================================================================================');
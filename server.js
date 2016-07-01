var express     = require('express');
var app         = express();
var bodyParser  = require('body-parser');
var morgan      = require('morgan');
var mongoose    = require('mongoose');
var jwt         = require('jsonwebtoken');
var config      = require('./config');
var User        = require('./app/models/user');

var port = process.env.PORT || 8080;
mongoose.connect(config.database);
app.set('superSecret', config.secret);

// use body parser to get info from POST and URL params
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// use morgan to log requests to the console
app.use(morgan('dev'));

// basic routes
app.get('/', function(req, res) {
    res.send('Hello! The API is at http://localhost:' + port + '/api');
});

app.get('/setup', function(req, res) {
    // create a sample user
    var nick = new User({
        name: 'Nick Cerminara',
        password: 'password',
        admin: true
    });

    // save the sample user
    nick.save(function(err) {
        if (err) throw err;

        console.log('User saved successfully');
        res.json({ success: true});
    });
});

// Routes---------------------------------------------------------------------------------------
// get an instance of the router for api routes
var apiRoutes = express.Router();
// AUTHENTICATION ROUTE
apiRoutes.post('/authenticate', function(req, res) {
    // find the user
    User.findOne({
        name: req.body.name
    }, function(err, user) {
        if(err) throw err;
        if(!user) {
            res.json({ success: false, message: 'Authentication failed. User not found.' });
        } else if (user) {
            // check if password matches
            if (user.password != req.body.password) {
                res.json({ success: false, message: 'Authentication failed. Wrong password.' });
            } else {
                // if user is found and password is right => create token
                var token = jwt.sign(user, app.get('superSecret'), {
                    expiresIn: 1440 // expires in 24 hours
                });

                // return the information including token as JSON
                res.json({
                    success: true,
                    message: 'Enjoy your token!',
                    token: token
                });
            }
        }
    });
});

// route middleware to verify a token
apiRoutes.use(function(req, res, next) {
    // check header or url parameters or post parameters for token
    var token = req.body.token || req.query.token || req.headers['x-access-token'];
    //decode token
    if(token) {
        jwt.verify(token, app.get('superSecret'), function(err, decoded) {
            if(err) {
                return res.json({ success: false, message: 'Failed to authenticate token.' });
            } else {
                // if all good, save to request for use in other routes
                req.decoded = decoded;
                next();
            }
        });
    } else {
        // if there is no token
        // return an error
        return res.status(403).send({
            success: false,
            message: 'No token provided.'
        });
    }
});

// route to show a random message (GET http://localhost:8080/api/)
apiRoutes.get('/', function(req, res) {
    res.json({ message: 'Welcome to the API '});
});

// route to return all users
apiRoutes.get('/users', function(req, res) {
    User.find({}, function(err, users) {
        res.json(users);
    });
});

// apply the routes to our application with the prefix /api
app.use('/api', apiRoutes);

// start the server
app.listen(port);
console.log('Server started on port: ' + port);
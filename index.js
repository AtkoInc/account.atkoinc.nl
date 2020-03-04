require('dotenv').config()
require('https').globalAgent.options.rejectUnauthorized = false;

const express = require('express')
const hbs  = require('express-handlebars')
const session = require('express-session')
const axios = require('axios')
const bodyParser = require('body-parser')
const urlencodedParser = bodyParser.urlencoded({ extended: true });

var passport = require('passport');
var logger = require('./logger')

const tenantResolver = require('./tenantResolver')
const userProfile = require('./models/userprofile')

const PORT = process.env.PORT || 3000;

app = express();
app.use(express.json());

app.engine('hbs',  hbs( { 
    extname: 'hbs', 
    defaultLayout: 'main', 
    layoutsDir: __dirname + '/views/layouts/',
    partialsDir: __dirname + '/views/partials/',
    helpers: {
        ifEquals: (arg1, arg2, options) => {
            return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
        },
        jwt: function (token){
            var atob = require('atob');
            if (token != null) {
                var base64Url = token.split('.')[1];
                var base64 = base64Url.replace('-', '+').replace('_', '/');
                return JSON.stringify(JSON.parse(atob(base64)), undefined, '\t');
            } else {
                return "Invalid or empty token was parsed"
            }
        }
    }
  } ) );

app.set('view engine', 'hbs');

app.use('/static', express.static('static'));
app.use('/scripts', express.static(__dirname + '/node_modules/clipboard/dist/'));

app.use(session({
  cookie: { httpOnly: true },
  secret: process.env.SESSION_SECRET,
  saveUninitialized: false,
  resave: true
}));

app.use(passport.initialize({ userProperty: 'userContext' }));
app.use(passport.session());

passport.serializeUser((user, next) => {
    next(null, user);
  });
  
  passport.deserializeUser((obj, next) => {
    next(null, obj);
  });

const tr = new tenantResolver();

function parseJWT (token){
    var atob = require('atob');
    if (token != null) {
        var base64Url = token.split('.')[1];
        var base64 = base64Url.replace('-', '+').replace('_', '/');
        return JSON.parse(atob(base64))
    } else {
        return "Invalid or empty token was parsed"
    }
}

function parseError(error){
    try{
        if(error.response.status === 403 && error.response.headers['www-authenticate']){
            var error_description_pattern = /.*error_description=\"([^\"]+)\",.*/
            var scope_pattern = /.*scope=\"([^\"]+)\".+/
            var des = error.response.headers['www-authenticate'].match(error_description_pattern)[1]
            var scopeRequired = error.response.headers['www-authenticate'].match(scope_pattern)[1]
            return des+ " Required Scope: "+scopeRequired
        } 

        if(error.response.data.errorSummary){
            return error.response.data.errorSummary
        }
        if (error.response.data.error_description){
        return error.response.data.error_description
        }
        else {
            logger.error(error)
            return "Unable to parse error cause. Check console."
        }
    } catch(error){
        return "Unable to parse error cause. Check console."
    }
}

const router = express.Router();

router.get("/", async (req, res, next) => {
    logger.verbose("/ requested")
    const requestingTenant = tr.getRequestingTenant(req);

    res.render("index",{
        tenant: requestingTenant.tenant,
    });

});

router.get("/authorization-code/default",
    //TODO: How to get the correct strategy here?
    passport.authenticate('default', {failureRedirect: '/error'}),
    (req, res) => {
        res.redirect('/me');
    }
);

router.get("/me",tr.ensureAuthenticated(), async (req, res, next) => {
    logger.verbose("/me requested")
    const tokenSet = req.userContext.tokens;
    axios.defaults.headers.common['Authorization'] = `Bearer `+tokenSet.access_token
    try {
        const response = await axios.get(tr.getRequestingTenant(req).tenant+'/api/v1/users/me')
        var profile = new userProfile(response.data)
        res.render("me",{
            tenant: tr.getRequestingTenant(req).tenant,
            tokenSet: req.userContext.tokens,
            user: profile,
        });
    }
    catch(error) {
        res.render("me",{
            tenant: tr.getRequestingTenant(req).tenant,
            tokenSet: req.userContext.tokens,
            user: new userProfile(),
            error: parseError(error)
        });
    }
});

router.post("/me/edit", [tr.ensureAuthenticated(), urlencodedParser], async (req, res, next) => {
    const tokenSet = req.userContext.tokens;
    axios.defaults.headers.common['Authorization'] = `Bearer `+tokenSet.access_token

    try {        
        await axios.post(tr.getRequestingTenant(req).tenant+'/api/v1/users/me', {
            'profile': {
                firstName: req.body.first_name,
                lastName: req.body.last_name
            }
        })

        res.redirect('/me');
    }
    catch(error) {
        res.render("me",{
            tenant: tr.getRequestingTenant(req).tenant,
            tokenSet: req.userContext.tokens,
            user: new userProfile(),
            error: parseError(error)
        });
    }
});

router.get("/me/edit",tr.ensureAuthenticated(), async (req, res, next) => {
    logger.verbose("/me requested")
    const tokenSet = req.userContext.tokens;
    axios.defaults.headers.common['Authorization'] = `Bearer `+tokenSet.access_token
    try {
        const response = await axios.get(tr.getRequestingTenant(req).tenant+'/api/v1/users/me')
        var profile = new userProfile(response.data)
        res.render("edit-profile",{
            tenant: tr.getRequestingTenant(req).tenant,
            tokenSet: req.userContext.tokens,
            user: profile,
        });
    }
    catch(error) {
        res.render("me",{
            tenant: tr.getRequestingTenant(req).tenant,
            tokenSet: req.userContext.tokens,
            user: new userProfile(),
            error: parseError(error)
        });
    }
});

router.post("/me/change-password",[tr.ensureAuthenticated(), urlencodedParser], async (req, res, next) => {
    logger.verbose("/password-reset posted")
    const tokenSet = req.userContext.tokens;
    axios.defaults.headers.common['Authorization'] = `Bearer `+tokenSet.access_token
    try {
        const response = await axios.get(tr.getRequestingTenant(req).tenant+'/api/v1/users/me')
        var changePasswordLink = response.data._links.changePassword.href;

        var body = {
            oldPassword: req.body.current_password,
            newPassword: req.body.password
        }

        await axios.post(changePasswordLink, body);

        res.redirect('/me');
    }
    catch(error) {
        res.render("change-password",{
            error: parseError(error)
        });
    }
});

router.get("/me/change-password",tr.ensureAuthenticated(), async (req, res, next) => {
    logger.verbose("/password-reset requested")
    const tokenSet = req.userContext.tokens;
    axios.defaults.headers.common['Authorization'] = `Bearer `+tokenSet.access_token
    try {
        const response = await axios.get(tr.getRequestingTenant(req).tenant+'/api/v1/users/me')

        res.render("change-password",{
            tenant: tr.getRequestingTenant(req).tenant,
            tokenSet: req.userContext.tokens
        });
    }
    catch(error) {
        res.render("me",{
            tenant: tr.getRequestingTenant(req).tenant,
            tokenSet: req.userContext.tokens,
            user: new userProfile(),
            error: parseError(error)
        });
    }
});

router.get("/me/configure-mfa",tr.ensureAuthenticated(), async (req, res, next) => {
    logger.verbose("/configure-mfa requested")
    const tokenSet = req.userContext.tokens;
    axios.defaults.headers.common['Authorization'] = `Bearer `+tokenSet.access_token
    try {
        var idToken = parseJWT(req.userContext.tokens.id_token);
        const enrolled = await axios.get(tr.getRequestingTenant(req).tenant+'/api/v1/users/'+idToken.sub+'/factors');
        const toEnroll = await axios.get(tr.getRequestingTenant(req).tenant+'/api/v1/users/'+idToken.sub+'/factors/catalog');

        res.render("configure-mfa",{
            tenant: tr.getRequestingTenant(req).tenant,
            tokenSet: req.userContext.tokens,
            enrolledFactors: enrolled.data,
            factorsToEnroll: toEnroll.data
        });
    }
    catch(error) {
        res.render("me",{
            tenant: tr.getRequestingTenant(req).tenant,
            tokenSet: req.userContext.tokens,
            user: new userProfile(),
            error: parseError(error)
        });
    }
});

router.get("/logout", tr.ensureAuthenticated(), (req, res) => {
    logger.verbose("/logout requsted")
    let protocol = "http"
    if(req.secure){
        logger.verbose("Request was secure")
        protocol = "https"
    }
    else if(req.get('x-forwarded-proto')){
        protocol = req.get('x-forwarded-proto').split(",")[0]
        logger.verbose("Request had forwarded protocol "+protocol)
    }
    const tenant = tr.getRequestingTenant(req).tenant
    const tokenSet = req.userContext.tokens;
    const id_token_hint = tokenSet.id_token
    req.logout();
    req.session.destroy();
    res.redirect(tenant+'/oauth2/v1/logout?id_token_hint='
        + id_token_hint
        + '&post_logout_redirect_uri='
        + encodeURI(protocol+"://"+req.headers.host)
        );
});

router.get("/error",async (req, res, next) => {
    res.render("error",{
        msg: "An error occured, unable to process your request."
       });
});

app.use(router)  

app.listen(PORT, () => logger.info('app started'));
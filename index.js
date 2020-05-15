require('dotenv').config()
require('https').globalAgent.options.rejectUnauthorized = false;
const express = require('express')
const hbs  = require('express-handlebars')
const session = require('express-session')
const axios = require('axios')
const bodyParser = require('body-parser')
const flash = require('connect-flash')
const urlencodedParser = bodyParser.urlencoded({ extended: true });

var passport = require('passport');
var logger = require('./logger')

const tenantResolver = require('./tenantResolver')
const userProfile = require('./models/userprofile')

const PORT = process.env.PORT || 3000;

app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(flash());

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
        },
        'select': function(selected, options) {
            return options.fn(this).replace(
                new RegExp(' value=\"' + selected + '\"'),
                '$& selected="selected"');
        }
    }
  } ) );

app.set('view engine', 'hbs');

app.use('/assets', express.static('assets'));
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

router.get('/', function(req, res, next) {
  res.redirect("/home");
    //res.render('index', {layout: 'home', template: 'home'});
});

router.get("/home",tr.ensureAuthenticated(), async (req, res, next) => {
    logger.verbose("/home requested");
    const tokenSet = req.userContext.tokens;
    axios.defaults.headers.common['Authorization'] = `Bearer `+tokenSet.access_token
    try {
        const response = await axios.get(tr.getRequestingTenant(req).tenant+'/api/v1/users/me')
        var profile = new userProfile(response.data)
        res.render("account_home",{
            layout: 'main',
            template: 'account_home',
            tenant: tr.getRequestingTenant(req).tenant,
            tokenSet: req.userContext.tokens,
            user: profile,
        });
    }
    catch(error) {
        res.render("account_home",{
            layout: 'main',
            template: 'account_home',
            tenant: tr.getRequestingTenant(req).tenant,
            tokenSet: req.userContext.tokens,
            user: new userProfile(),
            error: parseError(error)
        });
    }
});

router.get('/forgetme', function(req, res, next) {
  res.render('account_delete', {layout: 'main', template: 'account_delete'});
});

router.get("/tokens",tr.ensureAuthenticated(), async (req, res, next) => {
    logger.verbose("/tokens requested")
    const tokenSet = req.userContext.tokens;
    axios.defaults.headers.common['Authorization'] = `Bearer `+tokenSet.access_token
    try {
        const response = await axios.get(tr.getRequestingTenant(req).tenant+'/api/v1/users/me')
        var profile = new userProfile(response.data)
        res.render("tokens",{
            tenant: tr.getRequestingTenant(req).tenant,
            tokenSet: req.userContext.tokens,
            user: profile,
        });
    }
    catch(error) {
        res.render("tokens",{
            tenant: tr.getRequestingTenant(req).tenant,
            tokenSet: req.userContext.tokens,
            user: new userProfile(),
            error: parseError(error)
        });
    }
});

router.get("/account",tr.ensureAuthenticated(), async (req, res, next) => {
    logger.verbose("/account requested")
    const tokenSet = req.userContext.tokens;
    axios.defaults.headers.common['Authorization'] = `Bearer `+tokenSet.access_token
    try {
        const response = await axios.get(tr.getRequestingTenant(req).tenant+'/api/v1/users/me')
        var profile = new userProfile(response.data)
        res.render("account_edit",{
            tenant: tr.getRequestingTenant(req).tenant,
            tokenSet: req.userContext.tokens,
            user: profile,
        });
    }
    catch(error) {
        res.render("account_edit",{
            tenant: tr.getRequestingTenant(req).tenant,
            tokenSet: req.userContext.tokens,
            user: new userProfile(),
            error: parseError(error)
        });
    }
});

router.get("/account_profile",tr.ensureAuthenticated(), async (req, res, next) => {
    logger.verbose("/account profile requested")
    const tokenSet = req.userContext.tokens;
    axios.defaults.headers.common['Authorization'] = `Bearer `+tokenSet.access_token
    try {
        const response = await axios.get(tr.getRequestingTenant(req).tenant+'/api/v1/users/me')
        var profile = new userProfile(response.data)
        
        res.render("account_profile",{
            tenant: tr.getRequestingTenant(req).tenant,
            tokenSet: req.userContext.tokens,
            user: profile,
            flash: req.flash('msg'),
        });
    }
    catch(error) {
        res.render("account_profile",{
            tenant: tr.getRequestingTenant(req).tenant,
            tokenSet: req.userContext.tokens,
            user: new userProfile(),
            error: parseError(error)
        });
    }
});

router.post("/account_profile", [tr.ensureAuthenticated(), urlencodedParser], async (req, res, next) => {
    const tokenSet = req.userContext.tokens;
    axios.defaults.headers.common['Authorization'] = `Bearer `+tokenSet.access_token

    try {        
        await axios.post(tr.getRequestingTenant(req).tenant+'/api/v1/users/me', {
            'profile': {
                firstName: req.body.first_name,
                lastName: req.body.last_name,
                title: req.body.title,
            }
        })

        req.flash('msg', 'Profile updated');
        res.redirect('/account_profile');
    }
    catch(error) {
        res.render("account_profile",{
            tenant: tr.getRequestingTenant(req).tenant,
            tokenSet: req.userContext.tokens,
            user: new userProfile(),
            error: parseError(error)
        });
    }
});

router.post("/changepassword",[tr.ensureAuthenticated(), urlencodedParser], async (req, res, next) => {
    logger.verbose("/changepassword posted")
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
        req.flash('msg', 'Password updated');
        res.redirect('/changepassword');
    }
    catch(error) {
        res.render("account_password",{
            error: parseError(error)
        });
    }
});

router.get("/changepassword",tr.ensureAuthenticated(), async (req, res, next) => {
    logger.verbose("/changepassword requested")
    const tokenSet = req.userContext.tokens;
    axios.defaults.headers.common['Authorization'] = `Bearer `+tokenSet.access_token
    try {
        const response = await axios.get(tr.getRequestingTenant(req).tenant+'/api/v1/users/me')

        res.render("account_password",{
            tenant: tr.getRequestingTenant(req).tenant,
            tokenSet: req.userContext.tokens,
            flash: req.flash('msg'),
        });
    }
    catch(error) {
        res.render("account_password",{
            tenant: tr.getRequestingTenant(req).tenant,
            tokenSet: req.userContext.tokens,
            user: new userProfile(),
            error: parseError(error)
        });
    }
});

router.get("/configuremfa",tr.ensureAuthenticated(), async (req, res, next) => {
    logger.verbose("/configuremfa requested")
    const tokenSet = req.userContext.tokens;
    axios.defaults.headers.common['Authorization'] = `Bearer `+tokenSet.access_token
    try {
        var idToken = parseJWT(req.userContext.tokens.id_token);
        const enrolled = await axios.get(tr.getRequestingTenant(req).tenant+'/api/v1/users/'+idToken.sub+'/factors');
        const toEnroll = await axios.get(tr.getRequestingTenant(req).tenant+'/api/v1/users/'+idToken.sub+'/factors/catalog');

        var smsEnrolled = false;
        var smsFactorId = '';
        var otpEnrolled = false;
        var otpFactorId = '';
        enrolled.data.forEach(function(factor){
            if(factor.factorType == 'sms'){
                smsEnrolled = true;
                smsFactorId = factor.id;
            }
            else if(factor.factorType == 'token:software:totp'){
                otpEnrolled = true;
                otpFactorId = factor.id;
            }
        })
        
        res.render("account_mfa",{
            tenant: tr.getRequestingTenant(req).tenant,
            tokenSet: req.userContext.tokens,
            enrolledFactors: enrolled.data,
            factorsToEnroll: toEnroll.data,
            smsEnrolled: smsEnrolled,
            smsFactorId: smsFactorId,
            otpEnrolled: otpEnrolled,
            otpFactorId: otpFactorId,
            flash: req.flash('msg'),
        });
    }
    catch(error) {
        res.render("account_mfa",{
            tenant: tr.getRequestingTenant(req).tenant,
            tokenSet: req.userContext.tokens,
            user: new userProfile(),
            error: parseError(error)
        });
    }
});

router.post("/configuresms",[tr.ensureAuthenticated(),urlencodedParser], async (req, res, next) => {
    logger.verbose("/configuresms requested")
    const tokenSet = req.userContext.tokens;
    axios.defaults.headers.common['Authorization'] = `Bearer `+tokenSet.access_token
    
    try {
        var idToken = parseJWT(req.userContext.tokens.id_token);
        var body = {
            "factorType": "sms",
            "provider":"OKTA",
            "profile": {
                "phoneNumber": req.body.phone_number
            }
        }

        await axios.post(tr.getRequestingTenant(req).tenant+'/api/v1/users/'+idToken.sub+'/factors?updatePhone=true', body);
        
        const enrolled = await axios.get(tr.getRequestingTenant(req).tenant+'/api/v1/users/'+idToken.sub+'/factors');

        var factorActive = false;
        var factorId = false;
        enrolled.data.forEach(function(factor){
            if(factor.factorType == 'sms'){
                factorId = factor.id;

                if(factor.status == 'ACTIVE'){
                    factorActive = true;
                }
            }
        })

        if(factorActive){
            req.flash('msg', 'SMS Factor enrolled');
            res.redirect('/configuremfa');
        }else{
            var factorId = factorId;
            res.render("mfa_verifysms",{
                tenant: tr.getRequestingTenant(req).tenant,
                tokenSet: req.userContext.tokens,
                factorId: factorId,
            });
        }
    }
    catch(error) {
        res.render("account_mfa",{
            tenant: tr.getRequestingTenant(req).tenant,
            tokenSet: req.userContext.tokens,
            error: error,
        });
    }
});

router.post("/verifysms",[tr.ensureAuthenticated(), urlencodedParser], async (req, res, next) => {
    logger.verbose("/verify requested")
    const tokenSet = req.userContext.tokens;
    axios.defaults.headers.common['Authorization'] = `Bearer `+tokenSet.access_token
    
    try {
        var idToken = parseJWT(req.userContext.tokens.id_token);
        var body = {
            "passCode": req.body.verification_code,
        }

        await axios.post(tr.getRequestingTenant(req).tenant+'/api/v1/users/'+idToken.sub+'/factors/'+req.body.factor_id+'/lifecycle/activate', body);
        
        req.flash('msg', 'SMS Factor enrolled');
        res.redirect('/configuremfa');
    }
    catch(error) {
        res.render("account_mfa",{
            tenant: tr.getRequestingTenant(req).tenant,
            tokenSet: req.userContext.tokens,
            error: parseError(error),
        });
    }
});


router.post("/removesms",[tr.ensureAuthenticated(), urlencodedParser], async (req, res, next) => {
    logger.verbose("/removesms requested")
    const tokenSet = req.userContext.tokens;
    axios.defaults.headers.common['Authorization'] = `Bearer `+tokenSet.access_token
    
    try {
        var idToken = parseJWT(req.userContext.tokens.id_token);
        var factorId = req.body.sms_factor_id;

        var url = tr.getRequestingTenant(req).tenant+'/api/v1/users/'+idToken.sub+'/factors/'+factorId;
        
        var result = await axios.delete(url);
        
        req.flash('msg', 'SMS Factor reset');
        res.redirect('/configuremfa');
    }
    catch(error) {
        res.render("account_mfa",{
            tenant: tr.getRequestingTenant(req).tenant,
            tokenSet: req.userContext.tokens,
            error: parseError(error),
        });
    }
});

router.post("/removeotp",[tr.ensureAuthenticated(), urlencodedParser], async (req, res, next) => {
    logger.verbose("/removeotp requested")
    const tokenSet = req.userContext.tokens;
    axios.defaults.headers.common['Authorization'] = `Bearer `+tokenSet.access_token
    
    try {
        var idToken = parseJWT(req.userContext.tokens.id_token);
        var factorId = req.body.otp_factor_id;

        var url = tr.getRequestingTenant(req).tenant+'/api/v1/users/'+idToken.sub+'/factors/'+factorId;
        
        var result = await axios.delete(url);
        
        req.flash('msg', 'OTP Factor reset');
        res.redirect('/configuremfa');
    }
    catch(error) {
        res.render("account_mfa",{
            tenant: tr.getRequestingTenant(req).tenant,
            tokenSet: req.userContext.tokens,
            error: parseError(error),
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

var delegateRouter = require('./routes/delegation')(tr)
app.use('/delegate', delegateRouter)

router.get("/error",async (req, res, next) => {
    res.render("error",{
        msg: "An error occured, unable to process your request."
       });
});

app.use(router)  

app.listen(PORT, () => logger.info('app started'));
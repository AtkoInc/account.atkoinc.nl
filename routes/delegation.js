const express = require('express');
const router = express.Router();
const axios = require('axios');

module.exports = function (tenantResolver){
  tr = tenantResolver;

  router.get('/', tr.ensureAuthenticated(), async function(req, res, next) {
    try {
      var tenant = tr.getRequestingTenant(req)
        var response = await axios.get(tenant.delegationServiceUrl+'/entity/agents'
          +'?id='+req.userContext.userinfo.sub,{headers:{Authorization: tenant.delegationServiceSecret}})
          res.render('delegate',{delegates: response.data.agents,error: req.query.error});
    }
    catch(err) {
      console.log(err)
      // set locals, only providing error in development
      res.locals.message = err.message;
      res.locals.error = req.app.get('env') === 'development' ? err : {};

      // render the error page
      res.status(err.status || 500);
      res.render('error', { title: 'Error' });
      } 
  });

  router.post('/add', tr.ensureAuthenticated(), async function(req, res, next) {
    try {
      var tenant = tr.getRequestingTenant(req)
      await axios.post(tenant.delegationServiceUrl + 
        '/entity/agents/?id='+ req.userContext.userinfo.sub+"&agentid="+req.body.delegateUser,
        null, //this is an issue with POSTS with no body
        {headers:{Authorization: tenant.delegationServiceSecret}})
      res.redirect('/delegate')
    } catch(err) {
      if(err.response && err.response.status === 404){
        console.log("not found")
        res.redirect('/delegate?error=User '+req.body.delegateUser+' not found')
        return
      }
      console.log(err)
      // set locals, only providing error in development
      res.locals.message = err.message;
      res.locals.error = req.app.get('env') === 'development' ? err : {};

      // render the error page
      res.status(err.status || 500);
      res.render('error', { title: 'Error' });
      } 
  })

  router.get('/remove/:id', tr.ensureAuthenticated(), async function(req, res, next) {
    try{
      var tenant = tr.getRequestingTenant(req)
      await axios.delete(tenant.delegationServiceUrl + 
        '/entity/agents/?id='+ req.userContext.userinfo.sub+"&agentid="+req.params.id,
        {headers:{Authorization: tenant.delegationServiceSecret}})
      res.redirect('/delegate')
    }
    catch(err) {
      console.log(err)
      // set locals, only providing error in development
      res.locals.message = err.message;
      res.locals.error = req.app.get('env') === 'development' ? err : {};

      // render the error page
      res.status(err.status || 500);
      res.render('error', { title: 'Error' });
      } 
  })

  return router;
}

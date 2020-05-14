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
          res.render('delegate',{delegates: response.data.agents});
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

  router.get('/remove/:id', tr.ensureAuthenticated(), async function(req, res, next) {
    var tenant = tr.getRequestingTenant(req)
    await axios.delete(tenant.delegationServiceUrl + 
      '/entity/agents/?id='+ req.userContext.userinfo.sub+"&agentid="+req.params.id,
      {headers:{Authorization: tenant.delegationServiceSecret}})
    res.redirect('/delegate')
  })

  return router;
}

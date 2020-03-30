var logger = require('../logger.js')

class UserProfile {
    constructor(profileJson) {
        if(profileJson){
            try {
                this.userName = profileJson.profile.email
                this.firstName = profileJson.profile.firstName
                this.lastName = profileJson.profile.lastName
                this.name = profileJson.profile.firstName + " " + profileJson.profile.lastName
                this.phoneNumber = profileJson.profile.mobilePhone
                this.email = profileJson.profile.email
                this.title = profileJson.profile.title
                this.crmStatus = profileJson.profile.crm_status
                if (this.mfaPreferred) {
                    this.mfaPreferred = profileJson.profile.mfa_preferred    
                } else {
                    this.mfaPreferred = 'false'
                }
                this.lastLogin = profileJson.lastLogin
                this.lastUpdate = profileJson.lastUpdated
            }
            catch(error) {
                logger.error(error);
            }
        }
    }
}

module.exports = UserProfile
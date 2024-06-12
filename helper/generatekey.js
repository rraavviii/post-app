const crypto=require('crypto')
const key=crypto.randomBytes(32).toString('hex')
module.exports=key
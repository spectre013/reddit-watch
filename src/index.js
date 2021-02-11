'use strict';
const snoowrap = require('snoowrap');
const env = require('dotenv').config()
const r = new snoowrap({
    userAgent: 'redditwatch - https://www.zoms.net/reddit-watch',
    clientId: env.parsed.cliendid,
    clientSecret: env.parsed.clientsecret,
    accessToken:env.parsed.accessToken
});

r.getHot().map(post => post.title).then(console.log);
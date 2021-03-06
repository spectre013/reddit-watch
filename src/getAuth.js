'use strict';
const env = require('dotenv').config();
const express = require('express');
const axios = require('axios');
const FormData = require('form-data');
const snoowrap = require('snoowrap');

const app = express();
const port = 3000;
const redirect = 'http://127.0.0.1:3000/callback'

const r = new snoowrap({
    userAgent: 'redditwatch - https://www.zoms.net/reddit-watch',
    clientId: env.parsed.cliendid,
    clientSecret: env.parsed.clientsecret,
    accessToken:''
});
// TODO: move this to browser storage
let tokenInfo = {}


app.get('/', (req, res) => {

    if(tokenInfo.accessToken) {
        let response = "<ul>"
        r.getHot('all',{limit:10}).map(post => post.title).then((data) => {
            data.forEach((item) => {
                response += `<li>{{ item.title }}</li>`;
            })
           res.send(response);
        });
    } else {
        res.send('<a href="/auth">Login</a>')
    }
})


app.get('/auth',(req,res) => {
    const callback = encodeURI(redirect);
    const url = `https://www.reddit.com/api/v1/authorize?client_id=${env.parsed.clientid}&response_type=code&state=${env.parsed.state}&redirect_uri=${callback}&duration=permanent&scope=identity,read,save,vote`;
    console.log("Redirecting to ", url);
    res.redirect(url);
});

app.get('/callback',async (req,res) => {
    const state = req.query.state;
    const code = req.query.code;
    console.log(state,code);
    if(state === 'spaceman-spiff') {
        const session_url = 'https://www.reddit.com/api/v1/access_token';
        const username = env.parsed.clientid;
        const password = env.parsed.clientsecret;
        const data = Buffer.from(username + ':' + password,'utf-8');
        const basicAuth = 'Basic ' + data.toString("base64");
        let params = new URLSearchParams()
        params.append('grant_type','authorization_code')
        params.append('code',code)
        params.append('redirect_uri',redirect)


        console.log("params:",basicAuth,params)
        axios.post(session_url, params,
                {
                    headers: {
                        'Authorization': 'Basic ' + data.toString("base64"),
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'User-Agent': 'redditwatch - https://www.zoms.net/reddit-watch'
                    }
        }).then((r) => {
            tokenInfo = r.data;
            console.log('response', r.data)

        }).catch((e) => {
            console.log('err', e.data)
        });
            console.log('done');

    }

});


app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})
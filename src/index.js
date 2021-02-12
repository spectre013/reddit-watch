'use strict';
import dotenv from 'dotenv'
import express  from'express';
import axios from 'axios';
import snoowrap from 'snoowrap';
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'

const env = dotenv.config()
const app = express();
const port = 5001;
const redirect = 'http://127.0.0.1:5000/api/callback';
let db;
(async () => {
    // open the database
    db = await open({
        filename: './rw.db',
        driver: sqlite3.Database
    })
})()


let r = {};
// TODO: move this to browser storage
let tokenInfo = {
    access_token: '',
    token_type: 'bearer',
    expires_in: 3600,
    refresh_token: '',
    scope: 'identity read save vote'
}


app.get('/api/', index)
app.get('/api/auth',auth);
app.get('/api/callback',callback);


async function index(req, res) {
    const user = tokenDecode(req.header('user'));
    const sql = `SELECT token FROM auth where user = '${user}'`

    const token = await db.get(sql);
    console.log("UserInfo:",user,sql,token);

    // if(tokenInfo.refreshToken !== '') {
    //     await getSnoo();
    //     let response = "<ul>"
    //     r.getHot('all',{limit:10}).map(post => post.title).then((data) => {
    //         data.forEach((item) => {
    //             response += `<li>${item.title}</li>`;
    //         })
    //         res.send(response);
    //     });
    //     res.send("authenticated");
    // } else {
    //     res.send({'message':'up'})
    // }
    res.send(token);
}

async function auth(req,res) {
        const callback = encodeURI(redirect);
        const url = `https://www.reddit.com/api/v1/authorize?client_id=${env.parsed.clientid}&response_type=code&state=${env.parsed.state}&redirect_uri=${callback}&duration=permanent&scope=identity,read,save,vote`;
        console.log("Redirecting to ", url);
        res.redirect(url);
}

async function callback(req,res) {
    const state = req.query.state;
    const code = req.query.code;

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
        try {
            const response = await axios.post(session_url, params,
                {
                    headers: {
                        'Authorization': 'Basic ' + data.toString("base64"),
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'User-Agent': 'redditwatch - https://www.zoms.net/reddit-watch'
                    }
                });

            tokenInfo = response.data.response;


            const snoo = getSnoo(tokenInfo.refresh_token)
            const me = snoo.getMe();

            const userSql = `SELECT id FROM auth where user = '${user}'`
            const id = await db.get(userSql);
            let sql = `update auth set token = ${tokenInfo.refresh_token} where id = ${me.name}`;
            if(!id) {
                sql = `insert into auth name,token values ('${me.token}','${tokenInfo.refresh_token}')`;
            }
            db.run(sql);
            res.send('');
        } catch(e) {
            console.log('err', e.message);
            res.send({err:e.message});
        }

    }

}

async function getSnoo(token) {
   return new snoowrap({
        userAgent: 'redditwatch - https://www.zoms.net/reddit-watch',
        clientId: env.parsed.cliendid,
        clientSecret: env.parsed.clientsecret,
        refreshToken: token
    });
}

const server = app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})

process.on('SIGTERM', () => {
    console.info('SIGTERM signal received.');
    console.log('Closing http server.');
    server.close(() => {
        console.log('Http server closed.');
        // boolean means [force], see in mongoose doc
        db.close(false, () => {
            console.log('MongoDb connection closed.');
        });
    });
});

async function query(sql) {
    try {
        const data = await db.get(sql);
        return data;
    } catch (e) {
        throw e.message;
    }
}

function tokenDecode(token) {
    let bufferObj = Buffer.from(token, "base64");
    return bufferObj.toString("utf-8");
}
function tokenEncode(token) {
    let bufferObj = Buffer.from(token, "utf8");
    return bufferObj.toString("base64");

}

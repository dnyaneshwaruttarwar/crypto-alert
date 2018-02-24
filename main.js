var http = require("http");
var express = require('express');
var app = express();
var mysql = require('mysql');
var bodyParser = require('body-parser');
var schedule = require('node-schedule');
var nodemailer = require('nodemailer');
var unirest = require('unirest');
var squel = require('squel');
var squel = require('squel');

//start mysql connection
var connection = mysql.createConnection({
    host: 'localhost', //mysql database host name
    user: 'root', //mysql database user name
    password: 'root', //mysql database password
    database: 'nodejs' //mysql database name
});

connection.connect(function(err) {
    if (err) throw err;
    console.log('You are now connected...');
});
//end mysql connection

//start body-parser configuration
app.use(bodyParser.json()); // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
    extended: true
}));
//end body-parser configuration

var exchangeList = [];


var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'danny.uttarwar.crypto@gmail.com',
        pass: 'Tech145$'
    }
});

var mailOptions = {
    from: 'danny.uttarwar.crypto@gmail.com',
    to: 'dnyaneshwar.uttarwar@zconsolutions.com',
    subject: 'Alert: New Coin Added',
    text: 'That was easy!'
};

//create app server
var server = app.listen(3000, "127.0.0.1", function() {

    var host = server.address().address;
    var port = server.address().port;

    console.log("Example app listening at http://%s:%s", host, port);


    function getExchangeList() {
        return new Promise(function(resolve, reject) {
            connection.query('SELECT * FROM exchange', function(error, results, fields) {
                if (error) {
                    reject(error);
                } else {
                    exchangeList = results;
                    resolve(results);
                }
            });
        });
    }

    function fillCoins(exchange, index) {
        return new Promise(function(resolve, reject) {
            var getCoinsQuery = 'SELECT * FROM coin where exchangeId = ' + exchange.id;

            connection.query(getCoinsQuery, function(error, results, fields) {
                if (error) {
                    reject(error);
                    throw error;
                } else {
                    exchangeList[index].coins = [];
                    exchangeList[index].coins = results;
                    resolve(results);
                }
            });

        });
    }

    function getAllCoinsFromDB() {
        return new Promise(function(resolve, reject) {
            var allCoinsFromDBPromises = [];
            for (var i = 0, iLen = exchangeList.length; i < iLen; i++) {
                // console.log(exchangeList[i].name);
                allCoinsFromDBPromises.push(fillCoins(exchangeList[i], i));
            }
            Promise.all(allCoinsFromDBPromises)
                .then(function(data) {
                    resolve(data);
                })
                .catch(function(err) {
                    reject(err);
                });
        });
    }

    function getCoinsFromAPI(exchange, index) {
        return new Promise(function(resolve, reject) {
            var Request = unirest.get(exchange.apikey);

            Request.header('Content-Type', 'application/json').end(function(response) {
                exchangeList[index].coinsFromAPI = [];
                var list = [];
                var coin = {};
                if (exchange.name === 'bittrex') {
                    list = response.body.result;
                    for (var i = 0, iLen = list.length; i < iLen; i++) {
                        coin = {};
                        coin.exchangeId = exchange.id;
                        coin.name = list[i].CurrencyLong;
                        coin.code = list[i].Currency;
                        coin.pair = '';
                        coin.baseName = list[i].CoinType;
                        coin.baseCode = '';
                        exchangeList[index].coinsFromAPI.push(coin);
                    }
                } else if (exchange.name === 'kucoin') {
                    list = response.body.data;
                    for (var j = 0, jLen = list.length; j < jLen; j++) {
                        coin = {};
                        coin.exchangeId = exchange.id;
                        coin.name = '';
                        coin.code = list[j].coinType;
                        coin.pair = list[j].symbol;
                        coin.baseName = '';
                        coin.baseCode = list[j].coinTypePair;
                        exchangeList[index].coinsFromAPI.push(coin);
                    }
                } else if (exchange.name === 'binance') {
                    if (response && response.body && response.body.data) {
                        list = response.body.data;
                        for (var k = 0, kLen = list.length; k < kLen; k++) {
                            coin = {};
                            coin.exchangeId = exchange.id;
                            coin.name = list[k].baseAssetName;
                            coin.code = list[k].baseAsset;
                            coin.pair = list[k].symbol;
                            coin.baseName = list[k].quoteAssetName;
                            coin.baseCode = list[k].quoteAsset;
                            exchangeList[index].coinsFromAPI.push(coin);
                        }
                    }
                } else if (exchange.name === 'cryptopia') {
                    if (response && response.body && response.body.data) {
                        list = response.body.Data;
                        for (var l = 0, lLen = list.length; l < lLen; l++) {
                            if (list[l].BaseSymbol == 'BTC') {
                                coin = {};
                                coin.exchangeId = exchange.id;
                                coin.name = list[l].Currency;
                                coin.code = list[l].Symbol;
                                coin.pair = list[l].Label;
                                coin.baseName = list[l].BaseCurrency;
                                coin.baseCode = list[l].BaseSymbol;
                                exchangeList[index].coinsFromAPI.push(coin);
                            }
                        }
                    }
                }
                // else if (exchange.name === 'poloniex') {
                //     if (response && response.body && response.body.data) {
                //         list = response.body.Data;
                //         for (var m = 0, mLen = list.length; m < mLen; m++) {
                //             if (list[m].BaseSymbol == 'BTC') {
                //                 coin = {};
                //                 coin.exchangeId = exchange.id;
                //                 coin.name = list[m].name;
                //                 coin.code = list[m].Symbol;
                //                 coin.pair = '';
                //                 coin.baseName = '';
                //                 coin.baseCode = '';
                //                 exchangeList[index].coinsFromAPI.push(coin);
                //             }
                //         }
                //     }
                // }
                resolve(response);
            });
        });
    }

    function getAllCoinsFromAPI() {
        return new Promise(function(resolve, reject) {
            var allCoinsFromAPIPromises = [];
            for (var i = 0, iLen = exchangeList.length; i < iLen; i++) {
                // console.log(exchangeList[i].name);
                allCoinsFromAPIPromises.push(getCoinsFromAPI(exchangeList[i], i));
            }
            Promise.all(allCoinsFromAPIPromises)
                .then(function(data) {
                    resolve(data);
                })
                .catch(function(err) {
                    reject(err);
                });
        });
    }

    function addCoinToDB(coin, exchange) {
        return new Promise(function(resolve, reject) {
            var sql = squel.insert()
                .into('coin')
                .set("exchangeId", coin.exchangeId)
                .set("name", coin.name)
                .set("code", coin.code)
                .set("pair", coin.pair)
                .set("baseName", coin.baseName)
                .set("baseCode", coin.baseCode)
                .toString();

            mailOptions.text = "New Coin Added \n\n Coin Name: " + coin.code + "\n\n Exchange Name: " + exchange.name;

            transporter.sendMail(mailOptions, function(error, info) {
                if (error) {
                    console.log(error);
                } else {
                    console.log('Email sent: ' + info.response);
                }
            });

            // send({ // Overriding default parameters
            //     subject: 'attached'
            // }, function(err, res) {
            //     console.log('* [example 1.1] send() callback returned: err:', err, '; res:', res);
            // });

            connection.query(sql, coin, function(error, results, fields) {
                if (error) {
                    reject(error);
                    throw error;
                } else {
                    resolve(results);
                }
            });
        });
    }

    function checkCoinExist(coin, existingCoinList, exchange) {
        return new Promise(function(resolve, reject) {
            if (existingCoinList.map(function(item) { return item.code; }).indexOf(coin.code) == -1) {
                addCoinToDB(coin, exchange)
                    .then(function(data) {
                        resolve(data);
                    })
                    .catch(function(err) {
                        reject(err);
                    });
            } else {
                resolve(true);
            }
        });
    }

    function matchCoins() {
        return new Promise(function(resolve, reject) {
            var promises = [];
            for (var i = 0, iLen = exchangeList.length; i < iLen; i++) {
                for (var j = 0, jLen = exchangeList[i].coinsFromAPI.length; j < jLen; j++) {
                    promises.push(checkCoinExist(exchangeList[i].coinsFromAPI[j], exchangeList[i].coins, exchangeList[i]));
                }
            }
            Promise.all(promises)
                .then(function(data) {
                    resolve(data);
                })
                .catch(function(err) {
                    reject(err);
                });
        });
    }

    var j = schedule.scheduleJob('*/5 * * * *', function() {
        exchangeList = [];
        getExchangeList()
            .then(function(data) {
                getAllCoinsFromDB()
                    .then(function(data) {
                        getAllCoinsFromAPI()
                            .then(function(data) {
                                matchCoins()
                                    .then(function(data) {
                                        console.log("done");
                                    })
                                    .catch(function(err) {
                                        throw err;
                                    });
                            })
                            .catch(function(err) {
                                throw err;
                            });
                    })
                    .catch(function(err) {
                        throw err;
                    });
            }).catch(function(error) {
                throw err;
            });
    });

});


app.get('/exchange', function(req, res) {
    var postData = req.body;
    connection.query('SELECT * FROM exchange', postData, function(error, results, fields) {
        if (error) throw error;
        res.end(JSON.stringify(results));
    });
});

app.get('/exchange/:id', function(req, res) {
    console.log(req);
    connection.query('SELECT * FROM exchange where id=?', [req.params.id], function(error, results, fields) {
        if (error) throw error;
        res.end(JSON.stringify(results));
    });
});

app.post('/exchange', function(req, res) {
    var postData = req.body;
    connection.query('INSERT INTO exchange SET ?', postData, function(error, results, fields) {
        if (error) throw error;
        res.end(JSON.stringify(results));
    });
});

app.delete('/exchange/:id', function(req, res) {
    connection.query('DELETE FROM `exchange` WHERE `id`=?', [req.params.id], function(error, results, fields) {
        if (error) throw error;
        res.end('Record has been deleted!');
    });
});

app.get('/coin', function(req, res) {
    var postData = req.body;
    connection.query('SELECT * FROM coin', postData, function(error, results, fields) {
        if (error) throw error;
        res.end(JSON.stringify(results));
    });
});

app.get('/coin/:id', function(req, res) {
    console.log(req);
    connection.query('SELECT * FROM coin where id=?', [req.params.id], function(error, results, fields) {
        if (error) throw error;
        res.end(JSON.stringify(results));
    });
});

app.post('/coin', function(req, res) {
    var postData = req.body;
    connection.query('INSERT INTO coin SET ?', postData, function(error, results, fields) {
        if (error) throw error;
        res.end(JSON.stringify(results));
    });
});

app.delete('/coin/:id', function(req, res) {
    connection.query('DELETE FROM `coin` WHERE `id`=?', [req.params.id], function(error, results, fields) {
        if (error) throw error;
        res.end('Record has been deleted!');
    });
});
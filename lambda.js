/**
 * Created by sergelichtveld on 29/07/18.
 */

'use strict';
const rp = require('request-promise');
const cheerio = require('cheerio');
const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient({region: 'eu-west-1'});
const ses = new AWS.SES({region: 'eu-west-1'});

function run(callback, event, context){

    // 1) get page results
    let results = [];

    let forbidden = ['selecthuur','huurstunt', 'esteon'];

    let options = {
        uri: `https://www.marktplaats.nl/z/huizen-en-kamers/haarlem.html?query=haarlem&categoryId=1032&distance=3000&priceFrom=700%2C00&priceTo=1.400%2C00&startDateFrom=always`,
        transform: function (body) {return cheerio.load(body);}
    };

    rp(options).then( ($) => {

        // Iterate search results
        $('.search-result').each(function(i, elem) {

            let seller = $(this).find('.seller-name').attr('title');
            let url = $(this).attr('data-url');

            // Check for forbidden sellers and add to array
            if(forbidden.indexOf(seller.toLowerCase()) === -1 && url !== undefined){
                results.push({
                    seller: seller,
                    link: $(this).attr('data-url')
                });
            }
        });
    }).then( () =>{
        //For testing
        // results.push({
        //     seller: 'milou',
        //     link: 'www.iloveserge.com'
        // });

        // 2)Get old (DB) data
        let oldData = [];
        let getParams = { TableName: "marktplaats_results" };

        docClient.scan(getParams, function(err, data){
            if(err){
                console.log(err, null);}
            else{
                //If not found in the db -> add new
                if(data.Count > 0){
                    oldData = data.Items;

                    // Collect new data after comparing it with the old
                    let newFound = results.filter(compare(oldData));

                    if(newFound.length > 0){

                        //Create string for email and send email
                        let body = 'New result found: \n';
                        for(let i = 0; i < newFound.length; i++) {
                            body += 'Seller: '+newFound[i].seller+'\n'+'Link: '+newFound[i].link+'\n'+'============\n\n';
                        }

                        let eParams = {
                            Destination: {
                                ToAddresses: ["sergelichtveld@hotmail.com"]
                            },
                            Message: {
                                Body: {
                                    Text: {
                                        Data: body
                                    }
                                },
                                Subject: {
                                    Data: "Nieuwe huizen op marktplaats"
                                }
                            },
                            Source: "slichtveld@icloud.com"
                        };

                        console.log('===SENDING EMAIL===');
                        let email = ses.sendEmail(eParams, function(err, dataEmail){
                            if(err) console.log(err);
                            else {
                                console.log("===EMAIL SENT===");
                                context.succeed(event);
                            }
                        });

                        //Seperate for loop for db (otherwise async issues)
                        for(let i = 0; i < newFound.length; i++){
                            //Put new data to DB
                            let putParams = {
                                Item: {
                                    seller : newFound[i].seller,
                                    link : newFound[i].link,
                                    date : Date.now(),
                                },
                                TableName: 'marktplaats_results'
                            };

                            docClient.put(putParams, function(err, data){
                                if(err){
                                    console.log(err);
                                    callback(err, null);
                                }else{
                                    callback(null, data);
                                }
                            });
                        }
                    }
                 
                }else console.log('no items found in DB');
            }
        });

    }).catch((err) => {
        console.log(err);
    });
}

function compare(otherArray){
    return function(current){
        return otherArray.filter(function(other){
                return other.value === current.value && other.link === current.link
            }).length === 0;
    }
}

exports.handler = function(event, context, callback) {
    run(callback, event, context);
    callback(null, 'Success');
};


/**
 * Created by sergelichtveld on 29/07/18.
 */
const rp = require('request-promise');
const cheerio = require('cheerio');
const table = require('cli-table');
const fs = require('fs');
const nodemailer = require('nodemailer');

let results = [];
let forbidden = ['selecthuur','huurstunt', 'esteon'];

let options = {
    uri: `https://www.marktplaats.nl/z/huizen-en-kamers/haarlem.html?query=haarlem&categoryId=1032&distance=3000&priceFrom=700%2C00&priceTo=1.400%2C00&startDateFrom=always`,
    transform: function (body) {return cheerio.load(body);}
};

let oldData = JSON.parse(fs.readFileSync('tmp/data.txt', 'utf8'));

rp(options)
    .then(($) => {

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

        //testing
        // results.push({
        //     seller: 'milou',
        //     link: 'www.iloveserge.com'
        // });

        console.log(results);
        // Collect new data after comparing it with the old
        let newFound = results.filter(compare(oldData));

        //Add new to old data
        oldData.unshift(newFound[0]);

        // if(results.length > 0 && newFound.length > 0){
        //
        //     // Write to file
        //     fs.writeFile("tmp/data.txt", JSON.stringify(oldData), (err) => {
        //         if (err) {
        //             console.error(err);
        //             return;
        //         }
        //         console.log("File has been created");
        //     });
        //
        //     //Send email
        //     let transporter = nodemailer.createTransport({
        //         service: 'gmail',
        //         auth: {
        //             user: 'myemail@gmail.com',
        //             pass: 'abcdefg'
        //         }
        //     });
        //
        //     //Make email string
        //     let i;
        //     let emailtext ='';
        //     for(i=0; i < newFound.length; i++){
        //         emailtext += 'Seller: '+newFound[i].seller+' \n' +'Link: '+newFound[i].link+'\n'+'==============='+'\n';
        //     }
        //
        //     let mailOptions = {
        //         from: 'sergefeet@gmail.com',
        //         to: 'sergelichtveld@hotmail.com',
        //         subject: 'Sending Email using Node.js',
        //         text: emailtext
        //     };
        //
        //     transporter.sendMail(mailOptions, function(error, info){
        //         if (error) {
        //             console.log(error);
        //         } else {
        //             console.log('Email sent: ' + info.response);
        //         }
        //     });
        //
        // }

    })
    .catch((err) => {
        console.log(err);
    });


function compare(otherArray){
    return function(current){
        return otherArray.filter(function(other){
                return other.value === current.value && other.link === current.link
            }).length === 0;
    }
}




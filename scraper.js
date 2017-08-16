"use strict";
var module = (function () {

    //Requiring the modules for the project
    var fs = require('fs'),
        request = require('request'),
        cheerio = require('cheerio'),
        json2csv = require('json2csv');

    //Variables at top of file
    var shirtInfo = [],
        shirtsArray = [],
        shirtsScraped = [],
        dataFile = "./data",
        errorFile = 'scraper-error.log',
        url = "http://shirts4mike.com";

    const csvColumns = ["Title", "Price", "ImageURL", "URL", "Time"];

    /**
     * @description
     * @param {object} error
     */
    function errorMessage(error) {
        console.log('Error occured scrapping site ' + url);
        var errorMsg = "[" + Date() + "]" + " : " + error + "\n";
        fs.appendFile(errorFile, errorMsg, function (err) {
            if (err) throw err;
            console.log('Error logged in "scraper-error.log"');
        });
    }

    function searchForShirts(array, html, link) {
        // Takes all the links of the shirts and adds them to the shirts Array
        var $ = cheerio.load(html);
        var shirts = $(link);
        shirts.each(function () {
            var urlLocation = url + '/' + $(this).attr('href');
            if (array.indexOf(urlLocation) === -1) {
                array.push(urlLocation);
            }
        });
    }

    // Making the request to the URL
    request(url, function (error, response, body) {

        //Was the connection a succcess
        if (!error && response.statusCode === 200) {

            // Takes all the links of the shirts and adds them to the shirts Array
            searchForShirts(shirtsArray, body, "a[href*='shirt']");

            //Loop through the shirts array
            for (var i = 0, x = shirtsArray.length; i < x; i++) {

                // Store the existing shirts into the shirts scraped array
                if (shirtsArray[i].indexOf("?id=") > 0) {
                    shirtsScraped.push(shirtsArray[i]);

                } else {

                    // Make another request to get additional links
                    request(shirtsArray[i], function (error, response, body) {

                        // If connection was made 
                        if (!error && response.statusCode === 200) {

                            // Takes all the links of the shirts and adds them to the ShirtsScrpaed Array
                            searchForShirts(shirtsScraped, body, "a[href*='shirt.php?id=']");

                            // Getting the data from the pages
                            for (var i = 0, x = shirtsScraped.length; i < x; i++) {

                                // Getting data from shirtsScrpaped
                                request(shirtsScraped[i], function (error, response, body) {

                                    // If connection was made 
                                    if (!error && response.statusCode == 200) {

                                        var $ = cheerio.load(body);

                                        //Empty Object
                                        var csvShirtData = {}

                                        //Adding data to the object
                                        csvShirtData.Title = $('title').text();
                                        csvShirtData.Price = $('.price').text();
                                        csvShirtData.ImageURL = $('.shirt-picture img').attr('src');
                                        csvShirtData.URL = response.request.href;

                                        //Created the time object
                                        var thisDay = new Date();
                                        csvShirtData.Time = thisDay;
                                        var day = thisDay.getDate(),
                                            month = thisDay.getMonth() + 1,
                                            year = thisDay.getFullYear(),
                                            csvFileName = year + "-" + day + "-" + month + ".csv";

                                        //Push information about shirts to shirtInfo
                                        shirtInfo.push(csvShirtData);

                                        // If the folder exists, make one
                                        if (!fs.existsSync(dataFile)) {
                                            fs.mkdirSync(dataFile);
                                        };

                                        //Here is where json2csv converts the json information to csv format
                                        json2csv({
                                            data: shirtInfo,
                                            fields: csvColumns
                                        }, function (err, csv) {

                                            if (err) throw err;
                                            //Overwrites the existing file information
                                            fs.writeFile(dataFile + "/" + csvFileName, csv, function (err) {
                                                if (err) throw err;
                                                console.log(csvFileName + ' was created in local directory');
                                            }); // END writefile

                                        }); // End json2csv
                                    } else {
                                        errorMessage(error);
                                    }
                                }); // END REQUEST

                            }
                        } else {
                            errorMessage(error);
                        }
                    }); // END REQEST 
                }
            }
        } else {
            errorMessage(error);
        }
    }); // END REQUEST
})()

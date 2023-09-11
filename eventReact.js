//Ideally, this was supposed to allow one to act on certain event triggers,
//e.g. shut down an account if certain activity was detected, such as a login from a location
//not listed in the ISP/CITY database table. As SaaS Alerts has reported as of July 25th, 2023
//that this part of the API is under review due to not working as it should, this is left
//as is and will be revisited; the code is essentially 'first-draft' work, a first-time
//run-sthrough in which efficiency and best practices shouldn't be expected

const timeVars = require('./timevars');
const axios = require('axios');
const mysql = require('mysql2');
const fs = require('fs');

const { pool, fetchTableData } = require('./procedures');

const {now, minutesAgo, hoursAgo, daysAgo, weeksAgo} = require('./timevars');
s
const minuteDelay = (minutes) => {
  const milliseconds = minutes * 60 * 1000;
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

const valueLookup = (valuesObject, targetObject) => {
  return Object.values(valuesObject).every(value => value in targetObject);
}

const refreshRateMins = 30;
let Iterations = 0

const saasEventReact = async() => {
  const queryData = { //This object is written/formatted for Elasticsearch -- this is what SaaS Alerts seems to use
    body: {         //in API calls
    query: {
      bool: {
        filter: [
          {
            bool: {
              should: [
                { term: {'jointType' : 'login.success'} },
                { term: {'jointType' : 'login.failure'} }
                ]
              }
            },
            { range: { time: { gte: minutesAgo(8), lte: now() } } },
                ],
            },
        },        
          sort: { time: 'asc' },
          size: 5000,
        },
        //scroll: '5s',
    };

    try {
        const response = await axios({
            method: 'post',
            url: 'https://us-central1-the-byway-248217.cloudfunctions.net/reportApi/api/v1/reports/events/query',
            headers: { 'api_key': apiKey },
            data: queryData,
        });
        let Data = response.data.hits.hits;
        if(!Data) {
          Data = "\nNo data to show.";
        }
        let Output = "\n\n*********************************************** \n\nCURRENT TIME: " + timeVars.nNow() + "\n\n" +  Data.length + " items in this pull. " + "\n\n" +  refreshRateMins + " minute(s) to next refresh.\n\n + Data:\n";
	fs.writeFileSync('log.txt', Output, {flag: 'a'});
	for(let i = 0; i < Data.length; i++) {
		fs.writeFileSync('log.txt', JSON.stringify(Data[i]._source, {flag: 'a'}));
		console.log("\n\n");
	}
        console.log(Output);
        console.log(`\nUsing difference between ${time1} and ${time2} as data points.\n`);
	      Iterations++;
	      console.log(`ITERATION: ${Iterations}\n\n`);
        fs.writeFileSync('log.txt', `ITERATION: ${Iterations}\n\n`, {flag: 'a'});

        let userQuery = "SELECT * FROM SAASEmail WHERE EmailAddress IN (";
        for(let i = 0; i < Data.length; i++) {
          if(i + 1 == Data.length) {
            userQuery += "'" + Data[i]._source.user.name + "')";
          } else {
            userQuery += "'" + Data[i]._source.user.name + "', "
          }
        }

        const tableData = await fetchTableData(userQuery);
        for(let i = 0; i < Data.length; i++) {
          for(let j = 0; j < tableData.length; j++) {
            if(Data[i]._source.user.name == tableData[j].EmailAddress) {
              console.log("PERFORMING LOOKUP ON " + Data[i]._source.user.name + '\n');
              let score = 0;
              let scoreMinimum = 1;
              Object.values(tableData[j]).forEach(value => {
                if(value == (Data[i]._source.location.city + ", " + Data[i]._source.location.region)) {
                  console.log("City and State matched.\n");
                  console.log(`${value}` + " is equal to " + `${Data[i]._source.location.city + ", " + Data[i]._source.location.region}` + ".\n")
                  score++;
                } else if(value == Data[i]._source.location.ipInfo.asn.name) {
                  console.log("ISP matched.\n");
                  console.log(`${value}` + " is equal to " + `${Data[i]._source.location.ipInfo.asn.name}` + ".\n")
                  score++;
                } else {
                }
              })
              if(score < scoreMinimum) {
                console.log("\nRUNNING PROCEDURE FOR USER " + `${Data[i]._source.user.name}` + "!!!\n") //RUN BLOCK HERE
                //lockDownAcct(Data[i]._source.customer.id, Data[i]._source.user.id, Data[i]._source.user.name);
              }
            }
          }
        }
        for(let i = 0; i < Data.length; i++) {
          console.log(Data[i]._source);
          console.log("\n\nNEXT\n\n")
        }
        await minuteDelay(refreshRateMins);
        //await minuteDelay(refreshRateMins);
        saasEventReact();
    } catch(error) {
        console.log(error);
    }
}

module.exports.saasEventReact = saasEventReact;

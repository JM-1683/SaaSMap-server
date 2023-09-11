//This completes a build of the DB by building a query and executing it on the remote DB.
//**RUNNING THIS ERASES ALL PREVIOUS DATA via `TRUNCATE TABLE SAASEmail`**
const axios = require('axios');
const { truncateTable } = require('./procedures');
const { now, minutesAgo, hoursAgo, daysAgo, weeksAgo } = require('./timevars');
const dotenv = require('dotenv');

dotenv.config();

//The main DB table build function
const dbIspBuild = async (connection) => {
    try {
        await truncateTable(connection, 'Successfully truncated table for DB build.'); //All data is first erased from the existing table
        //the main data object use to query
        const queryBuild = (date1, date2) => {
        const queryData = {
            body: {
                query: {
                    bool: {
                        filter: [
                            {
                                bool: {
                                    should: [
                                        { term: { 'jointType': 'login.success' } },
                                    ]
                                }
                            },
                            { range: { time: { gte: date1, lte: date2 } } },
                        ],
                    },
                },
                sort: { time: 'asc' },
                size: 10000
            },
            scroll: '5s',
        };
        return queryData;
    }

        //Hit the API endpoint wih the query defined above.
        //The DB is built from logins between three weeks ago and one week ago.
        //Unfortunately, due to SaaSAlerts' API response limits, this has to be broken down into two separate requests.
        let response = await axios({
            method: 'post',
            url: 'https://us-central1-the-byway-248217.cloudfunctions.net/reportApi/api/v1/reports/events/query',
            headers: { 'api_key': process.env.SAASALERTS_KEY.toString() },
            data: queryBuild(weeksAgo(3), weeksAgo(2))
        });
        let Data = response.data.hits.hits; //Read the response into a variable
        console.log(Data[0]);
        response = await axios({
            method: 'post',
            url: 'https://us-central1-the-byway-248217.cloudfunctions.net/reportApi/api/v1/reports/events/query',
            headers: { 'api_key': process.env.SAASALERTS_KEY.toString() },
            data: queryBuild(weeksAgo(2), weeksAgo(1))
        });
        Data.concat(response.data.hits.hits);

        let problemArray = []; //problemArray is defined to contain results from the API where key data is missing
        let email_isp_map = {};

        for (let i = 0; i < Data.length; i++) {
            if (!Data[i]._source || !Data[i]._source.location || !Data[i]._source.location.city
                || !Data[i]._source.location.ipInfo || !Data[i]._source.location.ipInfo.asn
                || !Data[i]._source.location.ipInfo.asn.name || !Data[i]._source.user
                || !Data[i]._source.user.name) {
                //Any entry where the data above = undefined is pushed into the problemArray; more for possible future use and debugging
                problemArray.push("Undefined data detected at postion " + i + ".");
            } else {
                let city = Data[i]._source.location.city + ", " + Data[i]._source.location.region;
                let isp = Data[i]._source.location.ipInfo.asn.name;
                let email = Data[i]._source.user.name;
                if (!email_isp_map[email]) { //create data sets of emails + isps -- sets only store unique values! No repeats will be included
                    email_isp_map[email] = { city: new Set(), isp: new Set() };
                };
                email_isp_map[email].city.add(city);
                email_isp_map[email].isp.add(isp);
            };
        }

        for (let email in email_isp_map) { //combine all the sets into a map
            email_isp_map[email].city = Array.from(email_isp_map[email].city);
            email_isp_map[email].isp = Array.from(email_isp_map[email].isp);
        }

        //These three are used for computation and building of the final insert query
        const dVals = Object.values(email_isp_map);
        const dKeys = Object.keys(email_isp_map);
        const entries = Object.entries(email_isp_map);

        //maxCities and maxIsps are equal to the highest number of cities and isps, respectively, found
        //amongst all of the entries.
        const maxCities = Math.max(...entries.map(entry => entry[1].city.length));
        const maxIsps = Math.max(...entries.map(entry => entry[1].isp.length));

        //Now, to start building the query.
        let dbQuery = "INSERT INTO SAASEmail (EmailID, EmailAddress, ";

        //the table has up to 12 columns for frequent user cities and ISPs, an almost impossible situation
        //as the table is rebuilt once every week, ideally. Nonetheless, the query will include the correct
        //number of cities and ISPs, derived from maxCities and maxIsps.
        //The query, of course, is parameterized.
        for (let i = 0; i < maxCities; i++) {
            dbQuery += `City${i + 1}, `;
        }

        for (let i = 0; i < maxIsps; i++) {
            dbQuery += i + 1 === maxIsps ? `ISP${i + 1})` : `ISP${i + 1}, `;
        }

        dbQuery += " VALUES ";

        const queryParams = [];
        for (let i = 0; i < entries.length; i++) {
            const values = [`?`, `?`];
            queryParams.push(i + 1, dKeys[i]);

            for (let j = 0; j < maxCities; j++) {
                values.push(`?`);
                queryParams.push(dVals[i].city[j] || null);  // Assuming null for non-existent values
            }

            for (let j = 0; j < maxIsps; j++) {
                values.push(`?`);
                queryParams.push(dVals[i].isp[j] || null);
            }

            dbQuery += `(${values.join(', ')})` + (i + 1 !== entries.length ? ', ' : ';');
        }

        await connection.query(dbQuery, queryParams);
        console.log("Final query commit for DB build complete.");
    } catch (err) {
        console.log(err);
    }
}

module.exports.dbIspBuild = dbIspBuild;

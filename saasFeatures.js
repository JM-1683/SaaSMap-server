const axios = require('axios');
const { now, minutesAgo, hoursAgo, daysAgo, weeksAgo } = require('./timevars');

const resolvePlaceName = async (place) => {
    const response = await axios({
        url: `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(place)}.json?access_token=${process.env.MAPBOX_KEY}`,
    });
    const Data = await response.data;
    return Data;
}

const loginSuccessFailure = () => ({ //This object is written/formatted for Elasticsearch. This data object,
    body: {                     //when sent to the API endpoint, will retrieve all login successes and failures
        query: {                    //for the given time period between variables `time1` and `time2`
            bool: {
                filter: [
                    {
                        bool: {
                            should: [
                                { term: { 'jointType': 'login.success' } },
                                { term: { 'jointType': 'login.failure' } }
                            ]
                        }
                    },
                    { range: { time: { gte: hoursAgo(1), lte: now() } } }, //gte = start of range, lte = end
                ],
            },
        },
        sort: { time: 'asc' },
        size: 5000,
    },
    scroll: '5s',
});

const updateMapAndLogins = async () => {
    let arr = [];
    let erroneousArr = [];
    try {
        const response = await axios({
            method: 'POST',
            url: 'https://us-central1-the-byway-248217.cloudfunctions.net/reportApi/api/v1/reports/events/query',
            headers: { 'api_key': process.env.SAASALERTS_KEY },
            data: loginSuccessFailure(),
        })
        const data = response.data.hits.hits;
        for (let i = 0; i < data.length; i++) {
            if (!data[i]._source.location) {
                erroneousArr.push(data[i]);
            } else if (!data[i]._source.location.city) {
                erroneousArr.push(data[i]);
            } else {
                let userLocation = data[i]._source.location.city + ", " + data[i]._source.location.region + ", " + data[i]._source.location.country;
                let Coordinates = await resolvePlaceName(userLocation);
                data[i]._source.location.mapCoordinates = Coordinates.features[0].center;
                arr.push(data[i]);
            }
        }
        return arr;
    } catch (error) {
        console.log(error);
    }
}

const getDb = async (connection) => {
    try {
        const query = "SELECT * FROM SAASEmail";
        const [results] = await connection.query(query);
        return results;
    } catch (error) {
        console.log(error);
    }
}

const forceBuild = async (connection) => {
    try {
        await dbIspBuild(connection); //locally defined in dbIspBuild.js
        res.send("FORCE BUILD SUCCESSFUL");
    } catch (error) {
        console.log(error);
    }
}

module.exports = {
    updateMapAndLogins, getDb, forceBuild,
}
//The main server.js
const express = require('express');
const cors = require('cors');
const { updateMapAndLogins, getDb, forceBuild } = require('./saasFeatures');
const { dbIspBuild } = require('./dbIspBuild');
const { startDbConnection } = require('./procedures');

const app = express();
const dotenv = require('dotenv');
dotenv.config();

const Server = async () => {

    const initialize = async (connection) => {
        await dbIspBuild(connection);
        console.log("DB initialization success.");
    }

    app.locals.dbConnection = await startDbConnection();

    //Enable CORs
    app.use(cors()); //kept (unfortunately) open as location of client is not yet settled

    initialize(app.locals.dbConnection);

    //route for grabbing event data for the login map
    app.get('/updateMapAndLogins', async (req, res) => {
        try {
            const results = await updateMapAndLogins();
            console.log(results);
            res.json(results);
        } catch (err) {
            console.log(err);
        }
    })

    //Used clientside to retrieve the DB
    app.get('/getDb', async (req, res) => {
        try {
            const results = await getDb(app.locals.dbConnection);
            res.json(results);
        } catch (err) {
            console.log(err);
        }
    })

    //For forcebuilding the DB if needed
    app.get('/forcebuild', async (req, res) => {
        try {
            await forceBuild(app.locals.dbConnection);
        } catch (err) {
            console.log(err);
        }
    })

    //This runs serverside on the console at launch
    app.listen(process.env.PORT, async () => {
        try {
            console.log(`Server running at http://localhost:${process.env.PORT}.\n`);
        } catch (error) {
            console.log(error);
        }
    });
}

Server();
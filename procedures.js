//Various SQL and fetch functions are kept here.

const axios = require('axios');
const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();
const apiKey = process.env.SAASALERTS_KEY;

//Starts the DB connection.
const startDbConnection = async () => {
	try {
		const pool = await mysql.createPool({
			host: process.env.DB_HOST,
			port: process.env.DB_PORT,
			user: process.env.DB_USER,
			password: process.env.DB_PASSWORD,
			database: process.env.DB_DB,
		});
		const promisePool = pool.promise();
		console.log('Successfully started DB connection pool.');
		return promisePool;
	} catch (err) {
		console.log(err);
	}
}

//retrieves data table
const fetchTableData = async (connection, query) => {
	try {
		const [results] = await connection.query(query);
		return results;
	} catch (error) {
		console.log(error);
		return null;
	}
}

//erases all data in the EMAIL/ISP data table
const truncateTable = async (connection, string) => {
	try {
		await connection.query("TRUNCATE TABLE SAASEmail");
		console.log(string)
	} catch (error) {
		console.log(error);
	}
}

//retrieves accesstoken
const getToken = async () => {
	try {
		const response = await axios({
			method: 'post',
			url: 'https://us-central1-the-byway-248217.cloudfunctions.net/respondApi/api/v1/auth',
			headers: {
				'api_key': apiKey,
				'Origin': 'https://runnetworks.com'
			}
		});
		return response.data.accessToken;
	} catch (err) {
		console.log(err);
	}
}

const lockDownAcctTest = async (Token) => {
	const actionBody = {
		"accounts": [
			{
				"application": "MS",
				"organizationId": "BJIgdAq6DGtJUr8UntWP",
				"account": {
					"id": "db41a3df-e4b1-4b30-b901-baae72c86693",
					"email": "jmarino@runnetworkrun.com"
				}
			}
		],
		"action": "Block Sign In",
		"contacts": []
	}
	const response = await axios({
		method: 'post',
		url: 'https://us-central1-the-byway-248217.cloudfunctions.net/respondApi/api/v1/response-actions/execute',
		headers: {
			'api_key': process.env.SAASALERTS_KEY,
			'Origin': 'https://runnetworkrun.com',
			'accesstoken': Token
		},
		data: actionBody,
	});
	return response.json();
}

module.exports = {
	lockDownAcctTest, fetchTableData, truncateTable, getToken, startDbConnection,
}

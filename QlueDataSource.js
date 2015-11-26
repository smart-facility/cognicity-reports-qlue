'use strict';

/**
 * The Qlue data source.
 * Poll the specified Qlue feed for new data and send it to the reports application.
 * @constructor
 * @param {Reports} reports An instance of the reports object.
 * @param {object} config Gnip powertrack specific configuration.
 */
var QlueDataSource = function QlueDataSource(
		reports,
		config
	){

	// Store references to reports and logger
	this.reports = reports;
	this.logger = reports.logger;

	// Copy reports config into our own config
	this.config = reports.config;
	for (var prop in config) {
		if (config.hasOwnProperty(prop)) {
			this.config[prop] = config[prop];
		}
	}

	this.https = require('https');

	// Set constructor reference (used to print the name of this data source)
	this.constructor = QlueDataSource;
};

QlueDataSource.prototype = {

	/**
	 * Data source configuration.
	 * This contains the reports configuration and the data source specific configuration.
	 * @type {object}
	 */
	config: {},

	/**
	 * Instance of the reports module that the data source uses to interact with Cognicity Server.
	 * @type {Reports}
	 */
	reports: null,

	/**
	 * Instance of the Winston logger.
	 */
	logger: null,

	/**
	 * Instance of node https.
	 */
	https: null,

	/**
	 * Flag signifying if we are currently able to process incoming data immediately.
	 * Turned on if the database is temporarily offline so we can cache for a short time.
	 * @type {boolean}
	 */
	_cacheMode: false,

	/**
	 * Store data if we cannot process immediately, for later processing.
	 * @type {Array}
	 */
	_cachedData: [],

	/**
	 * Last contribution ID from Qlue result that was processed.
	 * Used to ensure we don't process the same result twice.
	 * @type {number}
	 */
	_lastContributionId: 0,

	/**
	 * Highest contribution ID from current batch of Qlue results.
	 * @type {number}
	 */
	_highestBatchContributionId: 0,

	/**
	 * Reference to the polling interval.
	 * @type {number}
	 */
	_interval: null,

	/**
	 * Polling worker function.
	 * Poll the Qlue web service and process the results.
	 * This method is called repeatedly on a timer.
	 */
	_poll: function(){
		var self = this;

		// Keep track of the newest contribution ID we get in this poll.
		// We want to update our 'latest contribution ID' after we finish this whole batch.
		self._highestBatchContributionId = self._lastContributionId;

		// Begin processing results from page 1 of data
		self._fetchResults();
	},

	/**
	 * When we've reached the end of this polling run, update the stored contribution ID
	 */
	_updateLastContributionIdFromBatch: function() {
		var self = this;

		if ( self._lastContributionId < self._highestBatchContributionId ) {
			self._lastContributionId = self._highestBatchContributionId;
		}
	},

	/**
	 * Fetch one page of results
	 * Call the callback function on the results
	 * Recurse and call self to fetch the next page of results if required
	 * @param {number} page Page number of results to fetch, defaults to 1
	 */
	_fetchResults: function( page ) {
		var self = this;

		if (!page) page = 1;

		self.logger.verbose( 'QlueDataSource > poll > fetchResults: Loading page ' + page );

		var requestURL = self.config.qlue.serviceURL + "&page=" + page;
		var response = "";

		var req = self.https.request( requestURL , function(res) {
		  res.setEncoding('utf8');

		  res.on('data', function (chunk) {
		    response += chunk;
		  });

		  res.on('end', function() {
		    var responseObject;
		    try {
		    	responseObject = JSON.parse( response );
		    } catch (e) {
		    	self.logger.error( "QlueDataSource > poll > fetchResults: Error parsing JSON: " + response );
		    	self._updateLastContributionIdFromBatch();
		    	return;
		    }

		    self.logger.debug('QlueDataSource > poll > fetchResults: Page ' + page + " fetched, " + response.length + " bytes");

			if ( !responseObject || !responseObject.result || responseObject.result.length === 0 ) {
				// If page has a problem or 0 objects, end
				self.logger.error( "QlueDataSource > poll > fetchResults: No results found on page " + page );
				self._updateLastContributionIdFromBatch();
				return;
			} else {
				// Run data processing callback on the result objects
				if ( self._filterResults( responseObject.result ) ) {
					// If callback returned true, processing should continue on next page
					page++;
					self._fetchResults( page );
				}
			}
		  });
		});

		req.on('error', function(error) {
			self.logger.error( "QlueDataSource > poll > fetchResults: Error fetching page " + page + ", " + error.message + ", " + error.stack );
			self._updateLastContributionIdFromBatch();
		});

		req.end();
	},

	/**
	 * Process the passed result objects
	 * Stop processing if we've seen a result before, or if the result is too old
	 * @param {Array} results Array of result objects from the Qlue data to process
	 * @return {boolean} True if we should continue to process more pages of results
	 */
	_filterResults: function( results ) {
		var self = this;

		var continueProcessing = true;

		// For each result:
		var result = results.shift();
		while( result ) {
			if ( result.contributionId <= self._lastContributionId ) {
				// We've seen this result before, stop processing
				self.logger.debug( "QlueDataSource > poll > processResults: Found already processed result with contribution ID " + result.contributionId );
				continueProcessing = false;
				break;
			} else if ( result.date.update.sec * 1000 < new Date().getTime() - self.config.qlue.historicalLoadPeriod ) {
				// This result is older than our cutoff, stop processing
				// TODO What date to use? transform to readable. timezone
				self.logger.debug( "QlueDataSource > poll > processResults: Result " + result.contributionId + " older than maximum configured age of " + self.config.qlue.historicalLoadPeriod / 1000 + " seconds" );
				continueProcessing = false;
				break;
			} else {
				// Process this result
				self.logger.verbose( "QlueDataSource > poll > processResults: Processing result " + result.contributionId );
				// Retain the contribution ID
				if ( self._highestBatchContributionId < result.contributionId ) {
					self._highestBatchContributionId = result.contributionId;
				}
				self._processResult( result );
			}
			result = results.shift();
		}

		if (!continueProcessing) {
			self._updateLastContributionIdFromBatch();
		}

		return continueProcessing;
	},

	/**
	 * Process a result.
	 * This method is called for each new result we fetch from the web service.
	 * @param {object} result The result object from the web service
	 */
	_processResult: function( result ) {
		var self = this;

		if ( self._cacheMode ) {
			// Store result for later processing
			self._cachedData.push( result );
		} else {
			// Process result now
			self._saveResult(result);
		}
	},

	/**
	 * Save a result to cognicity server.
	 * @param {object} result The result object from the web service
	 */
	_saveResult: function( result ) {
		 var self = this;

		 // Qlue doesn't allow users from the Gulf of Guinea (indicates no geo available)
		 if (result.location.geospatial.longitude !== 0 && result.location.geospatial.latitude !== 0){
			 self._insertConfirmed(result);
		 }
	},

	/**
	* Insert a confirmed report - i.e. has geo coordinates
	* Store both the qlue report and the user hash
	* @param {qlueReport} qlueReport Qlue report object
	*/
	_insertConfirmed: function( qlueReport ) {
		var self = this;

		// Check for photo URL and fix escaping slashes
		if (!qlueReport.files.photo) {
			qlueReport.files.photo = null;
		}
		else {
			qlueReport.files.photo = qlueReport.files.photo.replace("'\'","");
		}

		// Fix language code for this data type
		qlueReport.lang = 'id';

		// Fix escaping slashes or report URL
		qlueReport.url = qlueReport.url.replace("'\'", "");

		// Insert report
		self.reports.dbQuery(
			{
				text: "INSERT INTO " + self.config.qlue.pg.table_qlue + " " +
					"(contribution_id, created_at, text, lang, url, image_url, title, the_geom) " +
					"VALUES (" +
					"$1, " +
					"to_timestamp($2), " +
					"$3, " +
					"$4, " +
					"$5, " +
					"$6, " +
					"$7, " +
					"ST_GeomFromText('POINT(' || $8 || ')',4326)" +
					");",
				values : [
					qlueReport.contributionId,
					qlueReport.date.create.sec,
					qlueReport.content,
					qlueReport.lang,
					qlueReport.url,
					qlueReport.files.photo,
					qlueReport.title,
					qlueReport.location.geospatial.longitude + " " + qlueReport.location.geospatial.latitude
				]
			},
			function ( result ) {
				self.logger.info('Logged confirmed qlue report');
				self.reports.dbQuery(
					{
						text: "SELECT upsert_qlue_users(md5($1));",
						values : [
							qlueReport.user.creator.id
						]
					},
					function ( result ) {
						self.logger.info('Logged confirmed qlue user');
					}
				);
			}
		);
	},

	/**
	* Get the last contribution ID as stored in the database
	* Update _lastContributionId
	*/
	_updateLastContributionIdFromDatabase: function() {
		var self = this;

		self.reports.dbQuery(
			{
				text: "SELECT contribution_id FROM " + self.config.qlue.pg.table_qlue + " " +
				"ORDER BY contribution_id DESC LIMIT 1;"
			},
			function ( result ) {
				if (result && result.rows && result.rows[0]){
					self.logger.info('Set last contribution ID from database');
					self._lastContributionId = result.rows[0].contribution_id;
				}
				else {
					self.logger.info('Error setting last contribution ID from database (is the reports table empty?)');
				}
			}
		);
	},

	/**
	 * Connect the Gnip stream.
	 * Establish the network connection, push rules to Gnip.
	 * Setup error handlers and timeout handler.
	 * Handle events from the stream on incoming data.
	 */
	start: function(){
		var self = this;

		// Initiate by getting last report ID from database
		self._updateLastContributionIdFromDatabase();

		// Called on interval to poll data source
		var poll = function(){
			self.logger.debug( "QlueDataSource > start: Polling " + self.config.qlue.serviceURL + " every " + self.config.qlue.pollInterval / 1000 + " seconds" );
			self._poll();
		};

		// Poll now, immediately
		poll();
		// Setup interval to poll repeatedly in future
		self._interval = setInterval(
			poll,
			self.config.qlue.pollInterval
		);
	},

	/**
	 * Stop realtime processing of results and start caching results until caching mode is disabled.
	 */
	enableCacheMode: function() {
		var self = this;

		self.logger.verbose( 'QlueDataSource > enableCacheMode: Enabling caching mode' );
		self._cacheMode = true;
	},

	/**
	 * Resume realtime processing of results.
	 * Also immediately process any results cached while caching mode was enabled.
	 */
	disableCacheMode: function() {
		var self = this;

		self.logger.verbose( 'QlueDataSource > disableCacheMode: Disabling caching mode' );
		self._cacheMode = false;

		self.logger.verbose( 'QlueDataSource > disableCacheMode: Processing ' + self._cachedData.length + ' cached results' );
		self._cachedData.forEach( function(data) {
			self._processResult(data);
		});
		self.logger.verbose( 'QlueDataSource > disableCacheMode: Cached results processed' );
		self._cachedData = [];
	}

};

// Export the PowertrackDataSource constructor
module.exports = QlueDataSource;

'use strict';

/* jshint -W079 */ // Ignore this error for this import only, as we get a redefinition problem
var test = require('unit.js');
/* jshint +W079 */
var QlueDataSource = require('../QlueDataSource');

// Mock reports
var reports = {
	config: {},
	logger: {},
	tweetAdmin: function(){}
};

// Mock result
var result = {
	location:{
		geospatial:{
			longitude:0,
			latitude:0
		}
	}
};

// Create server with empty objects
// We will mock these objects as required for each test suite
var qlueDataSource = new QlueDataSource(
	reports,
	{
		qlue: {}
	}
);

// Mocked logger we can use to let code run without error when trying to call logger messages
qlueDataSource.logger = {
	error:function(){},
	warn:function(){},
	info:function(){},
	verbose:function(){},
	debug:function(){}
};
qlueDataSource.reports.logger = qlueDataSource.logger;

// Test harness for CognicityReportsPowertrack object
describe( 'QlueDataSource', function() {

	describe( "cacheMode", function() {
		beforeEach( function() {
			qlueDataSource._cachedData = [];
			qlueDataSource._cacheMode = false;
		});

		it( 'Realtime processing is enabled by default', function() {
			qlueDataSource._processResult(result);
			test.value( qlueDataSource._cachedData.length ).is( 0 );
		});

		it( 'Enabling caching mode stops realtime filtering and retains tweets', function() {
			qlueDataSource.enableCacheMode(); // Start cache mode
			qlueDataSource._processResult(result);
			test.value( qlueDataSource._cachedData.length ).is( 1 );
		});

		it( 'Disabling caching mode reenables realtime filtering', function() {
			qlueDataSource.enableCacheMode(); // Start cache mode
			qlueDataSource.disableCacheMode(); // Stop cache mode
			qlueDataSource._processResult(result);
			test.value( qlueDataSource._cachedData.length ).is( 0 );
		});

		it( 'Cached tweets are processed when caching mode is disabled', function() {
			qlueDataSource.enableCacheMode(); // Start cache mode
			qlueDataSource._processResult(result);
			test.value( qlueDataSource._cachedData.length ).is( 1 );
			qlueDataSource.disableCacheMode(); // Stop cache mode
			test.value( qlueDataSource._cachedData.length ).is( 0 );
		});

		it( 'Multiple tweet handling', function() {
			qlueDataSource._processResult(result);
			qlueDataSource._processResult(result);
			test.value( qlueDataSource._cachedData.length ).is( 0 );
			qlueDataSource.enableCacheMode(); // Start cache mode
			qlueDataSource._processResult(result);
			qlueDataSource._processResult(result);
			qlueDataSource._processResult(result);
			test.value( qlueDataSource._cachedData.length ).is( 3 );
			qlueDataSource.disableCacheMode(); // Stop cache mode
			test.value( qlueDataSource._cachedData.length ).is( 0 );
		});

	});

	describe( "start", function() {
		var oldPoll;
		var pollCalledTimes;
		var oldSetInterval;
		var testInterval;
		var oldUpdateLastContributionIdFromDatabase;

		before( function() {
			oldPoll = qlueDataSource._poll;
			oldSetInterval = setInterval;
			oldUpdateLastContributionIdFromDatabase = qlueDataSource._updateLastContributionIdFromDatabase;
			qlueDataSource._updateLastContributionIdFromDatabase = function(){};
			qlueDataSource._poll = function() {
				pollCalledTimes++;
			};
			/* jshint -W020 */ // We want to mock out a global function here
			/* global setInterval:true */
			setInterval = function( callback, delay ) {
				if (testInterval) callback();
			};
			/* jshint +W020 */
		});

		beforeEach( function() {
			pollCalledTimes = 0;
		});

		it( 'Poll called immediately at start', function() {
			testInterval = false;
			qlueDataSource.start();
			test.value( pollCalledTimes ).is( 1 );
		});

		it( 'Poll scheduled for future calls via interval', function() {
			testInterval = true;
			qlueDataSource.start();
			test.value( pollCalledTimes ).is( 2 );
		});

		// Restore/erase mocked functions
		after( function(){
			qlueDataSource._poll = oldPoll;
			/* jshint -W020 */ // We want to mock out a global function here
			setInterval = oldSetInterval;
			/* jshint +W020 */
		});

	});

	describe( "_fetchResults", function() {
		var oldHttps;
		var oldFilterResults;

		var dataCallback;
		var endCallback;
		var errorCallback;

		var httpsData;

		var filterResultsCalled;
		var filterResultsReturnTrueOnce;
		var generateRequestError;

		before( function() {
			oldHttps = qlueDataSource.https;
			qlueDataSource.https = {
				request: function(url, callback){
					var res = {
						setEncoding: function(){},
						on: function(event, callback) {
							if (event==='data') dataCallback = callback;
							if (event==='end') endCallback = callback;
						}
					};
					callback(res);

					var req = {
						on: function(event, callback) {
							if (event==='error') errorCallback = callback;
						},
						end: function() {
							if (generateRequestError) {
								errorCallback({message:'foo',stack:'bar'});
							} else {
								dataCallback(httpsData);
								endCallback();
							}
						}
					};
					return req;
				}
			};

			oldFilterResults = qlueDataSource._filterResults;
			qlueDataSource._filterResults = function(){
				filterResultsCalled++;
				if (filterResultsReturnTrueOnce) {
					filterResultsReturnTrueOnce = false;
					return true;
				} else {
					return false;
				}
			};
		});

		beforeEach( function() {
			filterResultsCalled = 0;
			filterResultsReturnTrueOnce = false;
			generateRequestError = false;
		});

		it( 'No results returned stops processing', function() {
			httpsData = '{"result":[]}';
			qlueDataSource._fetchResults();
			test.value( filterResultsCalled ).is( 0 );
		});

		it( 'Invalid result object returned stops processing', function() {
			httpsData = '{invalid-json}';
			qlueDataSource._fetchResults();
			test.value( filterResultsCalled ).is( 0 );
		});

		it( 'Valid result calls _filterResults', function() {
			httpsData = '{"result":[{}]}';
			qlueDataSource._fetchResults();
			test.value( filterResultsCalled ).is( 1 );
		});

		it( 'Request error stops processing', function() {
			httpsData = '{"result":[{}]}';
			generateRequestError = true;
			qlueDataSource._fetchResults();
			test.value( filterResultsCalled ).is( 0 );
		});

		// Restore/erase mocked functions
		after( function(){
			qlueDataSource.https = oldHttps;
			qlueDataSource._filterResults = oldFilterResults;
		});

	});

	describe( "_filterResults", function() {
		var processedResults = [];

		function generateResult( contributionId, date ) {
			return {
				contributionId: contributionId,
				date: {
					update: {
						sec: date / 1000
					}
				}
			};
		}

		before( function() {
			qlueDataSource._processResult = function(result){
				processedResults.push(result);
			};
		});

		beforeEach( function() {
			processedResults = [];
			qlueDataSource.config.qlue.historicalLoadPeriod = new Date().getTime() + 60000;
			qlueDataSource._lastContributionId = 0;
		});

		it( 'New result is processed', function() {
			var results = [];
			test.value( processedResults.length ).is( 0 );
			results.push( generateResult(1,1) );
			qlueDataSource._filterResults(results);
			test.value( processedResults.length ).is( 1 );
		});

		it( 'Already processed result is not processed', function() {
			var results = [];
			results.push( generateResult(1,1) );
			qlueDataSource._filterResults(results);
			qlueDataSource._filterResults(results);
			test.value( processedResults.length ).is( 1 );
		});

		it( 'Result older than cutoff is not processed', function() {
			qlueDataSource.config.qlue.historicalLoadPeriod = 0;
			var results = [];
			results.push( generateResult(1,1) );
			qlueDataSource._filterResults(results);
			test.value( processedResults.length ).is( 0 );
		});

		it( 'Last processed ID is updated from one batch', function() {
			qlueDataSource.config.qlue.historicalLoadPeriod = 60000;
			var results = [];
			results.push( generateResult(1,new Date().getTime()) );
			results.push( generateResult(2,new Date().getTime()-120000) );
			test.value( qlueDataSource._lastContributionId ).is( 0 );
			qlueDataSource._filterResults(results);
			test.value( qlueDataSource._lastContributionId ).is( 1 );
		});

		it( 'Last processed ID is not updated from one batch with no filtered result', function() {
			qlueDataSource.config.qlue.historicalLoadPeriod = 60000;
			var results = [];
			results.push( generateResult(1,new Date().getTime()-120000) );
			results.push( generateResult(2,new Date().getTime())-120000 );
			qlueDataSource._filterResults(results);
			test.value( qlueDataSource._lastContributionId ).is( 0 );
		});

		it( 'Last processed ID is updated during last batch of two', function() {
			qlueDataSource.config.qlue.historicalLoadPeriod = 60000;
			var results = [];
			results.push( generateResult(1,new Date().getTime()) );
			results.push( generateResult(2,new Date().getTime()) );
			qlueDataSource._filterResults(results);
			test.value( qlueDataSource._lastContributionId ).is( 2 );
			results = [];
			results.push( generateResult(3,new Date().getTime()) );
			results.push( generateResult(4,new Date().getTime()-120000) );
			qlueDataSource._filterResults(results);
			test.value( qlueDataSource._lastContributionId ).is( 3 );
		});

		/* TODO This doesn't make sense - nothing is tripping an error here so there always be a result
		it( 'Last processed ID is not updated during last batch of two with no filtered result', function() {
			qlueDataSource.config.qlue.historicalLoadPeriod = 60000;
			var results = [];
			results.push( generateResult(1,new Date().getTime()) );
			results.push( generateResult(2,new Date().getTime()) );
			qlueDataSource._filterResults(results);
			test.value( qlueDataSource._lastContributionId ).is( 0 );
			results = [];
			results.push( generateResult(3,new Date().getTime()) );
			results.push( generateResult(4,new Date().getTime()) );
			qlueDataSource._filterResults(results);
			test.value( qlueDataSource._lastContributionId ).is( 0 );
		});*/

		// Restore/erase mocked functions
		after( function(){
			qlueDataSource.config.qlue = {};
		});

	});

// Test template
//	describe( "suite", function() {
//		before( function() {
//		});
//
//		beforeEach( function() {
//		});
//
//		it( 'case', function() {
//		});
//
//		after( function(){
//		});
//	});

});

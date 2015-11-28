'use strict';

/**
 * @file Cognicity reports data module which retrieves tweet data from the Qlue application
 * @copyright (c) Tomas Holderness & SMART Infrastructure Facility November 2015
 * @license Released under GNU GPLv3 License (see LICENSE.txt).
 * @example
 * Must be run as a subfolder of cognicity-reports, and
 * cognicity-reports must be configured to use this datasource.
 */

var QlueDataSource = require('./QlueDataSource');
var config = require('./live-qlue-config');

/**
 * The constructor function we expose takes a reports object and returns an instance of this
 * data source, with configuration already injected.
 */
var constructor = function( reports ) {
	return new QlueDataSource( reports, config );
};

module.exports = constructor;

'use strict';

// sample-qlue-config.js - sample configuration file for cognicity-reports-qlue module

/**
 * Configuration for cognicity-reports-powertrack
 * @namespace {object} config
 * @property {object} qlue Configuration object for Qlue web service interface
 * @property {string} qlue.serviceURL The URL for the Qlue web service
 * @property {number} qlue.pollInterval Poll interval for web service in milliseconds
 * @property {number} qlue.historicalLoadPeriod Maximum age in milliseconds of reports which will be processed
 */
var config = {};

// Qlue web service API
config.qlue = {};
config.qlue.serviceURL = "https://example.com/qluein_marker_level1.php?category=ic_2flod"; // E.g. https://example.com/qluein_marker_level1.php?category=ic_2flod
config.qlue.pollInterval = 1000 * 60 * 5; // E.g. 1000 * 60 * 5 = 5min
config.qlue.historicalLoadPeriod = 1000 * 60 * 60; // E.g. 1000 * 60 * 60 = 1hr

// Qlue configuration for cognicity-schema
config.qlue.pg = {};
config.qlue.pg.table_qlue = 'qlue_reports';
config.qlue.pg.table_qlue_users = 'qlue_users';

module.exports = config;

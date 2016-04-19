CogniCity
===========
**Open Source GeoSocial Intelligence Framework**

####cognicity-reports-qlue: Module for [cognicity-reports](https://github.com/smart-facility/cognicity-reports) module to collect [QLUE](http://qluein.com) flood reports.

Travis build status: [![Build Status](https://travis-ci.org/smart-facility/cognicity-reports-qlue.svg?branch=master)](https://travis-ci.org/smart-facility/cognicity-reports-qlue)

### About
Cognicity-reports-qlue is the NodeJS reports module for collecting flood reports from the QLUE API. For detailed framework documentation see [http://cognicity.info](http://cognicity.info).
This module is not designed to be run standalone but is designed to be run as a submodule of [cognicity-reports](https://github.com/smart-facility/cognicity-reports), which can run just with this submodule alone.

### Dependencies
* [NodeJS](http://nodejs.org) version 0.10.16 or compatible

#### Dev Modules
* [jshint](https://github.com/jshint/node-jshint) version 2.5.8 or compatible
* [unit.js](http://unitjs.com/) version 1.0.2 or compatible
* [mocha](http://mochajs.org/) version 2.0.1 or compatible
* [jsdoc](https://github.com/jsdoc3/jsdoc) version 3.2.0 or compatible
* [istanbul](https://github.com/gotwarlost/istanbul) version 0.3.5 or compatible

If you're going to commit changes to the JavaScript, be sure to run 'npm test' first - and fix any issues that it complains about, otherwise the build will fail when you push the commit.

### Installation
Please install this as a submodule of [cognicity-reports](https://github.com/smart-facility/cognicity-reports). Please refer to the [documentation of that project](https://github.com/smart-facility/cognicity-reports/blob/master/README.md) for further information.

Install the node dependencies for this submodule as listed in package.json using npm: `npm install`

#### Platform-specific notes ####
To build on OS X we recommend using [homebrew](http://brew.sh) to install node, npm, and required node modules as follows:
```shell
brew install node
npm install
```

To build on Windows we recommend installing all dependencies and running `npm install`.

### Configuration
App configuration parameters are stored in a configuration file which is parsed by FloodgaugeDataSource.js. See sample-floodgauge-config.js for an example configuration.

#### Configuration parameters

config.floodgauge = {};
config.floodgauge.serviceURL = "http://example.com/cgi-bin/wlr"; // E.g. https://example.com/cgi-bin/wlr
config.floodgauge.pollInterval = 1000 * 60 * 15; // E.g. 1000 * 60 * 15 = 15 minutes
config.floodgauge.historicalLoadPeriod = 1000 * 60 * 120; // E.g. 1000 * 60 * 120 = 2 hours

// Floodgauge configuration for cognicity-schema
config.floodgauge.pg = {};
config.floodgauge.pg.table_floodgauge = 'floodgauge_reports';

* serviceURL - The URL of the flood gauge API
* pollInterval - How often to poll the data source, in milliseconds
* historicalLoadPeriod - How far back to process reports, in milliseconds
* pg.table_floodgauge - Database table to store floodgauge data reports in

### Development

#### Testing

To run the full set of tests, run:

```shell
npm test
```

This will run the following tests:

##### JSHint

JSHint will run on all JavaScript files in the root folder and test folders.

Running the script:

```shell
npm run jshint
```

This will print an error to the screen if any problems are found.

##### Mocha

Mocha will run all unit tests in the test folder and can be run with the following script:

```shell
npm run mocha
```

The test output will tell you how many tests passed and failed.

#### Git Hooks

There is a git pre-commit hook which will run the 'npm test' command before your commit and will fail the commit if testing fails.

To use this hook, copy the file from 'git-hooks/pre-commit' to '.git/hooks/pre-commit' in your project folder.

```shell
cp git-hooks/pre-commit .git/hooks/
```

#### Documentation

To build the JSDoc documentation run the following npm script:

```shell
npm run build-docs
```

This will generate the API documentation in HTML format in the `docs` folder, where you can open it with a web browser.

#### Test Coverage

To build test code coverage documentation, run the following npm script:

```shell
npm run coverage
```

This will run istanbul code coverage over the full mocha test harness and produce HTML documentation in the directory `coverage` where you can open it with a web browser.

#### Release

The release procedure is as follows:
* Update the CHANGELOG.md file with the newly released version, date, and a high-level overview of changes. Commit the change.
* Create a tag in git from the current head of master. The tag version should be the same as the version specified in the package.json file - this is the release version.
* Update the version in the package.json file and commit the change.
* Further development is now on the updated version number until the release process begins again.

### License
This software is released under the GPLv3 License. See License.txt for details.

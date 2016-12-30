var APP_ID = 'amzn1.ask.skill.b974f6b7-d975-430e-8788-8431c250d696';//replace with 'amzn1.echo-sdk-ams.app.[your-unique-value-here]';

var https = require('https');

/**
 * The AlexaSkill prototype and helper functions
 */
var AlexaSkill = require('./AlexaSkill');

var TramTracker = function () {
    AlexaSkill.call(this, APP_ID);
};

// Extend AlexaSkill
TramTracker.prototype = Object.create(AlexaSkill.prototype);
TramTracker.prototype.constructor = TramTracker;

// ----------------------- Override AlexaSkill request and intent handlers -----------------------

TramTracker.prototype.eventHandlers.onSessionStarted = function (sessionStartedRequest, session) {
    console.log("onSessionStarted requestId: " + sessionStartedRequest.requestId
        + ", sessionId: " + session.sessionId);
    // any initialization logic goes here
};

TramTracker.prototype.eventHandlers.onLaunch = function (launchRequest, session, response) {
    console.log("onLaunch requestId: " + launchRequest.requestId + ", sessionId: " + session.sessionId);
    handleWelcomeRequest(response);
};

TramTracker.prototype.eventHandlers.onSessionEnded = function (sessionEndedRequest, session) {
    console.log("onSessionEnded requestId: " + sessionEndedRequest.requestId
        + ", sessionId: " + session.sessionId);
    // any cleanup logic goes here
};

/**
 * override intentHandlers to map intent handling functions.
 */
TramTracker.prototype.intentHandlers = {
    "OneShotTramIntent": function (intent, session, response) {
        handleOneShotTramRequest(intent, session, response);
    },

    "DialogTramIntent": function (intent, session, response) {
        // Determine if this turn is for city, for date, or an error.
        // We could be passed slots with values, no slots, slots with no value.
        var routeSlot = intent.slots.Route;
        var stopSlot = intent.slots.Stop;
		/*if (routeSlot && routeSlot.value && stopSlot && stopSlot.value){
			handleRouteStopDialogRequest(intent, session, response);
		}*/
        if (routeSlot && routeSlot.value) {
            handleRouteDialogRequest(intent, session, response);
        } else if (stopSlot && stopSlot.value) {
            handleStopDialogRequest(intent, session, response);
        } else {
            handleNoSlotDialogRequest(intent, session, response);
        }
    },

    "SupportedRoutesIntent": function (intent, session, response) {
        handleSupportedRoutesRequest(intent, session, response);
    },
	
	"SupportedAnnouncementsIntent": function (intent, session, response) {
        handleSupportedAnnouncementsRequest(intent, session, response);
    },

    "AMAZON.HelpIntent": function (intent, session, response) {
        handleHelpRequest(response);
    },

    "AMAZON.StopIntent": function (intent, session, response) {
        var speechOutput = "Goodbye";
        response.tell(speechOutput);
    },

    "AMAZON.CancelIntent": function (intent, session, response) {
        var speechOutput = "Goodbye";
        response.tell(speechOutput);
    }
};

// -------------------------- TramTracker Domain Specific Business Logic --------------------------

function handleWelcomeRequest(response) {
    var whichRoutePrompt = "Which route and stop would you like arrival information for?",
        speechOutput = {
            speech: "<speak>Welcome to Tram Tracker. "
                + whichRoutePrompt
                + "</speak>",
            type: AlexaSkill.speechOutputType.SSML
        },
        repromptOutput = {
            speech: "I can lead you through providing a route and "
                + "stop to get arrival information, "
                + "or you can simply open Tram Tracker and ask a question like, "
                + "get arrival information for B Route at Leavey Library. "
                + "For a list of supported routes, ask what routes are supported, "
				+ "or you can ask for the announcements regarding arrival information. "
                + whichRoutePrompt,
            type: AlexaSkill.speechOutputType.PLAIN_TEXT
        };

    response.ask(speechOutput, repromptOutput);
}

function handleHelpRequest(response) {
    var repromptText = "Which route and stop would you like arrival information for?";
    var speechOutput = "I can lead you through providing a route and "
        + "stop to get arrival information, "
        + "or you can simply open Tram Tracker and ask a question like, "
        + "get arrival information for B Route at Leavey Library. "
        + "For a list of supported routes, ask what routes are supported, "
		+ "or you can ask for the announcements regarding arrival information. "
        + "Or you can say exit. "
        + repromptText;

    response.ask(speechOutput, repromptText);
}

/**
 * Handles the case where the user asked or for, or is otherwise being with supported routes
 */
function handleSupportedRoutesRequest(intent, session, response) {
    // get city re-prompt
	
	getAllRoutes(function routeResponseCallback(err, routeList) {
        var speechOutput;
		var repromptText = " Which route would you like arrival information for?";

        if (err) {
            speechOutput = "Sorry, the USC website is experiencing a problem. Please try again later";
        } else {
            speechOutput = "Currently, these routes are supported: " + routeList
        + repromptText;
        
		}

        response.tellWithCard(speechOutput, "TramTracker", repromptText)
    });
}

function getAllRoutes(routeResponseCallback) {

    //var routeList = '';
	var endpoint = 'https://uscbuses.com/Region/0/Routes';

	https.get(endpoint, function (res) {
	var routeResponseString = '';

	if (res.statusCode != 200) {
		routeResponseCallback(new Error("Non 200 Response"));
	}

	res.on('data', function (data) {
		routeResponseString += data;
	});

	res.on('end', function () {
		var routeResponseObject = JSON.parse(routeResponseString);

		if (routeResponseObject.error) {
			console.log("USC error: " + routeResponseObj.error.message);
			routeResponseCallback(new Error(routeResponseObj.error.message));
		} else {
			var routeList = '';
			for (var i = 0; i < routeResponseObject.length; i++) {
				routeList += routeResponseObject[i]["Name"] + ", ";
			}
			routeResponseCallback(null,routeList);
		}
	});
	}).on('error', function (e) {
	console.log("Communications error: " + e.message);
	routeResponseCallback(new Error(e.message));
	});
}

function handleSupportedAnnouncementsRequest(intent, session, response) {
	
	getAnnouncements(function announcementResponseCallback(err, announcementList) {
        var speechOutput;
		var repromptText = " Ask again to listen the information for announcements ";

        if (err) {
            speechOutput = "Sorry, the USC website is experiencing a problem. Please try again later";
        } else {
			
			if(announcementList)
			{
				speechOutput = "Currently, I know these announcements: " + announcementList
					+ repromptText;
			}
			else
			{
				speechOutput = "Currently, There are no announcements. "
			}        
		}

        response.tellWithCard(speechOutput, "TramTracker", repromptText)
		//response.ask(speechOutput,repromptText);
    });
}

function getAnnouncements(announcementResponseCallback) {

	var endpoint = 'https://uscbuses.com/Home/GetPortalEntries?json';

	https.get(endpoint, function (res) {
	var announcementResponseString = '';

	if (res.statusCode != 200) {
		announcementResponseCallback(new Error("Non 200 Response"));
	}

	res.on('data', function (data) {
		announcementResponseString += data;
	});

	res.on('end', function () {
		var announcementResponseObject = JSON.parse(announcementResponseString);

		if (announcementResponseObject.error) {
			console.log("USC error: " + announcementResponseObj.error.message);
			announcementResponseCallback(new Error(announcementResponseObj.error.message));
		} else {
			var announcementList = '';
			for (var i = 0; i < announcementResponseObject.length; i++) {
				announcementList += "Announcement " + (i+1) +": ";
				announcementList += announcementResponseObject[i]["Message"] + ", ";
			}
			announcementResponseCallback(null,announcementList);
		}
	});
	}).on('error', function (e) {
	console.log("Communications error: " + e.message);
	announcementResponseCallback(new Error(e.message));
	});
}

function handleRouteDialogRequest(intent, session, response) {

    getRouteStationFromIntent(intent, false, function getRouteStationFromIntentResponseCallback(err, routeStation) {
        if (routeStation.error) {
			getAllRoutes(function routeResponseCallback(err, routeList) {
				var speechOutput;
				var repromptText = "Currently, I know arrival information for these routes: " + routeList
					+ " Which route would you like arrival information for?";

				if (err) {
					speechOutput = "Sorry, the USC website is experiencing a problem. Please try again later";
				} else {
					speechOutput = "I'm sorry, I don't have any data for this route. " + repromptText;
				
				}
				response.ask(speechOutput, repromptText)
			});
			return;
		}
		getRouteID(routeStation.route,function getRouteIDResponseCallback(err, routeID) {
			if (intent.slots.Stop.value) {
				getFinalTramResponse(routeID, routeStation.route, {stop: intent.slots.Stop.value}, response);
			} else {
				// set city in session and prompt for date
				session.attributes.route = routeStation;
				speechOutput = "For which stop would you like arrival information for " + routeStation.route + "?";
				repromptText = "For which stop would you like arrival information for " + routeStation.route + "?";

				response.ask(speechOutput, repromptText);
			}
		});			
    });
}

function handleStopDialogRequest(intent, session, response) {
	if(session.attributes.route){
		getRouteID(session.attributes.route.route,function getRouteIDResponseCallback(err, routeID) {
			getStopStationFromIntent(intent, routeID, false, function getStopStationFromIntentResponseCallback(err, stopStation){
				if (stopStation.error) {
					// Invalid date. set city in session and prompt for date
					getAllStops(routeID,function getAllStopsResponseCallback(err, stopList) {
						var speechOutput;
						var repromptText = " Please try again saying a valid stop in the list for the given route: " + stopList;

						if (err) {
							speechOutput = "Sorry, the USC website is experiencing a problem. Please try again later";
						} else {
							speechOutput = "I'm sorry, I don't have any data for this stop ." + repromptText;
						
						}
						response.ask(speechOutput, repromptText)
					});
					return;
				}
				
				getFinalTramResponse(routeID, session.attributes.route, stopStation, response);
			});
		});
			
    }
	else{
		if(session.attributes.stop){			
			
			session.attributes.stop = stopStation;
			getAllRoutes(function routeResponseCallback(err, routeList) {
				var speechOutput;
				var repromptText = "Currently, I know arrival information for these routes: " + routeList
					+ " Which route would you like arrival information for?";

				if (err) {
					speechOutput = "Sorry, the USC website is experiencing a problem. Please try again later";
				} else {
					speechOutput = "I'm sorry, I don't have any data for this route. " + repromptText;
				
				}
				response.ask(speechOutput, repromptText)
			});			
		}
		else{
			var repromptText, speechOutput;
			repromptText = "For which route and stop would you like arrival information?";
			speechOutput = "For which route and stop would you like arrival information?";
			response.ask(speechOutput,repromptText);
		}
	}
}

function handleNoSlotDialogRequest(intent, session, response) {
    if (session.attributes.route) {
        // get date re-prompt
		getRouteID(session.attributes.route.route,function getRouteIDResponseCallback(err, routeID) {
			getAllStops(routeID,function getAllStopsResponseCallback(err, stopList) {
				var repromptText = "Please try again saying a stop in the list for the given route: " + getAllStops(routeID);
				var speechOutput = repromptText;
				response.ask(speechOutput, repromptText);
			});			 
		});        
    } else {
        handleSupportedRoutesRequest(intent, session, response);
    }
}

function handleOneShotTramRequest(intent, session, response) {
	
	getRouteStationFromIntent(intent, false, function getRouteStationFromIntentResponseCallback(err, routeStation) {
        if (routeStation.error) {
			getAllRoutes(function routeResponseCallback(err, routeList) {
				var speechOutput;
				var repromptText = "Currently, I know arrival information for these routes: " + routeList
					+ " Which route would you like arrival information for?";

				if (err) {
					speechOutput = "Sorry, the USC website is experiencing a problem. Please try again later";
				} else {
					speechOutput = "I'm sorry, I don't have any data for this route. " + repromptText;
				
				}
				response.ask(speechOutput, repromptText)
			});
			return;
		}
		getRouteID(routeStation.route,function getRouteIDResponseCallback(err, routeID) {
			getStopStationFromIntent(intent, routeID, false, function getStopStationFromIntentResponseCallback(err, stopStation){
				if (stopStation.error) {
					// Invalid date. set city in session and prompt for date
					getAllStops(routeID,function getAllStopsResponseCallback(err, stopList) {
						var speechOutput;
						var repromptText = " Please try again saying a valid stop in the list for the given route: " + stopList;

						if (err) {
							speechOutput = "Sorry, the USC website is experiencing a problem. Please try again later";
						} else {
							speechOutput = "I'm sorry, I don't have any data for this stop ." + repromptText;
						
						}
						response.ask(speechOutput, repromptText)
					});
					return;
				}
				
				getFinalTramResponse(routeID, routeStation, stopStation, response);
			});
		});
			
    });
}

function getRouteID(routename,getRouteIDResponseCallback)
{
	var endpoint = 'https://uscbuses.com/Region/0/Routes';

	https.get(endpoint, function (res) {
	var getRouteIDResponseString = '';

	if (res.statusCode != 200) {
		getRouteIDResponseCallback(new Error("Non 200 Response"));
	}

	res.on('data', function (data) {
		getRouteIDResponseString += data;
	});

	res.on('end', function () {
		var getRouteIDResponseObject = JSON.parse(getRouteIDResponseString);

		if (getRouteIDResponseObject.error) {
			console.log("USC error: " + getRouteIDResponseObj.error.message);
			getRouteIDResponseCallback(new Error(getRouteIDResponseObj.error.message));
		} else {
			var routeID;
			for (var i = 0; i < getRouteIDResponseObject.length; i++) {
				if(getRouteIDResponseObject[i]["Name"].trim().toLowerCase() == routename.trim().toLowerCase())
				{
					routeID = getRouteIDResponseObject[i]["ID"];
					break;
				}
			}
			getRouteIDResponseCallback(null,routeID);
		}
	});
	}).on('error', function (e) {
	console.log("Communications error: " + e.message);
	getRouteIDResponseCallback(new Error(e.message));
	});
}
	
function getAllStops(routeID,getAllStopsResponseCallback)
{
	var endpoint = 'https://uscbuses.com/Route/' + routeID + '/Direction/0/Stops';

	https.get(endpoint, function (res) {
	var getAllStopsResponseString = '';

	if (res.statusCode != 200) {
		getAllStopsResponseCallback(new Error("Non 200 Response"));
	}

	res.on('data', function (data) {
		getAllStopsResponseString += data;
	});

	res.on('end', function () {
		var getAllStopsResponseObject = JSON.parse(getAllStopsResponseString);

		if (getAllStopsResponseObject.error) {
			console.log("USC error: " + getAllStopsResponseObj.error.message);
			getAllStopsResponseCallback(new Error(getAllStopsResponseObj.error.message));
		} else {
			var stopList = '';
			for (var i = 0; i < getAllStopsResponseObject.length; i++) {
				stopList += getAllStopsResponseObject[i]["Name"] + ", ";
			}
			getAllStopsResponseCallback(null,stopList);
		}
	});
	}).on('error', function (e) {
	console.log("Communications error: " + e.message);
	getAllStopsResponseCallback(new Error(e.message));
	});
}

function getStopID(stopname,routeID,getStopIDResponseCallback)
{
	var endpoint = 'https://uscbuses.com/Route/' + routeID + '/Direction/0/Stops';

	https.get(endpoint, function (res) {
	var getStopIDResponseString = '';

	if (res.statusCode != 200) {
		getStopIDResponseCallback(new Error("Non 200 Response"));
	}

	res.on('data', function (data) {
		getStopIDResponseString += data;
	});

	res.on('end', function () {
		var getStopIDResponseObject = JSON.parse(getStopIDResponseString);

		if (getStopIDResponseObject.error) {
			console.log("USC error: " + getStopIDResponseObj.error.message);
			getStopIDResponseCallback(new Error(getStopIDResponseObj.error.message));
		} else {
			var stopID;
			for (var i = 0; i < getStopIDResponseObject.length; i++) {
				if(getStopIDResponseObject[i]["Name"].trim().toLowerCase() == stopname.trim().toLowerCase())
				{
					stopID = getStopIDResponseObject[i]["ID"];
				}
			}
			getStopIDResponseCallback(null,stopID);
		}
	});
	}).on('error', function (e) {
	console.log("Communications error: " + e.message);
	getStopIDResponseCallback(new Error(e.message));
	});
}

function getFinalTramResponse(routeID, routeStation, stopStation, response) {

	getStopID(stopStation.stop,routeID,function getStopIDResponseCallback(err,stopID){
	
		makeTramRequest(routeID, stopID, function tramResponseCallback(err, tramResponseObject) {
			var speechOutput;

			if (err) {
				speechOutput = "Sorry, the University of Southern California tram service is experiencing a problem. Please try again later";
			} else {
				if(tramResponseObject['Predictions'].length <= 0)
				{
					speechOutput = "There are no arrival predictions as of " + tramResponseObject['PredictionTime'] + ".";
				}
				else
				{
					speechOutput = "Bus is arriving at " + tramResponseObject['PredictionTime'][0] + ".";
				}
			}

			response.tellWithCard(speechOutput, "TramTracker", speechOutput)
		});
	});
}

function makeTramRequest(routeID, stopID, tramResponseCallback) {

    var endpoint = 'https://uscbuses.com/Route/' + routeID + '/Stop/' + stopID + '/Arrivals?customerID=4';

    https.get(endpoint, function (res) {
        var tramResponseString = '';
        //console.log('Status Code: ' + res.statusCode);

        if (res.statusCode != 200) {
            tramResponseCallback(new Error("Non 200 Response"));
        }

        res.on('data', function (data) {
            tramResponseString += data;
        });

        res.on('end', function () {
            var tramResponseObject = JSON.parse(tramResponseString);

            if (tramResponseObject.error) {
                console.log("USC error: " + tramResponseObj.error.message);
                tramResponseCallback(new Error(tramResponseObj.error.message));
            } else {
                //var highTide = findHighTide(tramResponseObject);
                tramResponseCallback(null, tramResponseObject);
            }
        });
    }).on('error', function (e) {
        console.log("Communications error: " + e.message);
        tramResponseCallback(new Error(e.message));
    });
}

function getRouteStationFromIntent(intent, assignDefault, getRouteStationFromIntentResponseCallback) {

    var routeSlot = intent.slots.Route;
	
    if (!routeSlot || !routeSlot.value) {
		getRouteStationFromIntentResponseCallback(null,{error:true});
    } else {
        // lookup the city. Sample skill uses well known mapping of a few known cities to station id.
        var routeName = routeSlot.value;
		
		findRoute(routeName,function findRouteResponseCallback(err, routefound) {
			if (routefound) {
				getRouteStationFromIntentResponseCallback(null,{route:routeName});
			} else {
				getRouteStationFromIntentResponseCallback(null,{error:true});
			}
		});
	}
}

function findRoute(routeName,findRouteResponseCallback) {

	var endpoint = 'https://uscbuses.com/Region/0/Routes';

	https.get(endpoint, function (res) {
	var findRouteResponseString = '';

	if (res.statusCode != 200) {
		findRouteResponseCallback(new Error("Non 200 Response"));
	}

	res.on('data', function (data) {
		findRouteResponseString += data;
	});

	res.on('end', function () {
		var findRouteResponseObject = JSON.parse(findRouteResponseString);

		if (findRouteResponseObject.error) {
			console.log("USC error: " + findRouteResponseObj.error.message);
			findRouteResponseCallback(new Error(findRouteResponseObj.error.message));
		} else {
			var routefound = false;
			for (var i = 0; i < findRouteResponseObject.length; i++) {
				if(findRouteResponseObject[i]["Name"].trim().toLowerCase() == routeName.trim().toLowerCase())
				{
					routefound = true;
					break;
				}
			}			
			findRouteResponseCallback(null,routefound);
		}
	});
	}).on('error', function (e) {
	console.log("Communications error: " + e.message);
	findRouteResponseCallback(new Error(e.message));
	});
}

function getStopStationFromIntent(intent, routeID, assignDefault, getStopStationFromIntentResponseCallback) {

    var stopSlot = intent.slots.Stop;
    // slots can be missing, or slots can be provided but with empty value.
    // must test for both.
    if (!stopSlot || !stopSlot.value) {
        getStopStationFromIntentResponseCallback(null,{error:true}); 
    } else {

        var stopName = stopSlot.value;

		findStop(stopName, routeID, function findStopResponseCallback(err, stopfound) {
			if (stopfound) {
				getStopStationFromIntentResponseCallback(null,{stop:stopName});
			} else {
				getRouteStationFromIntentResponseCallback(null,{error:true});
			}
		});
    }
}

function findStop(stopName,routeID,findStopResponseCallback) {

	var endpoint = 'https://uscbuses.com/Route/' + routeID + '/Direction/0/Stops';

	https.get(endpoint, function (res) {
	var findStopResponseString = '';

	if (res.statusCode != 200) {
		findStopResponseCallback(new Error("Non 200 Response"));
	}

	res.on('data', function (data) {
		findStopResponseString += data;
	});

	res.on('end', function () {
		var findStopResponseObject = JSON.parse(findStopResponseString);

		if (findStopResponseObject.error) {
			console.log("USC error: " + findStopResponseObj.error.message);
			findStopResponseCallback(new Error(findStopResponseObj.error.message));
		} else {
			var stopfound = false;
			for (var i = 0; i < findStopResponseObject.length; i++) {
				if(findStopResponseObject[i]["Name"].trim().toLowerCase() == stopName.trim().toLowerCase())
				{
					stopfound = true;
					break;
				}
			}			
			findStopResponseCallback(null,stopfound);
		}
	});
	}).on('error', function (e) {
	console.log("Communications error: " + e.message);
	findStopResponseCallback(new Error(e.message));
	});
}

// Create the handler that responds to the Alexa Request.
exports.handler = function (event, context) {
    var tramTracker = new TramTracker();
    tramTracker.execute(event, context);
};
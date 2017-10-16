//on document ready
$(() => {
	// start the process
	log("Starting ATC...");
	
	log("Waiting for Timecard page load...");
	
	// wait till we detect the Timecard page
	waitForPageLoad();
	
	// listen for an event from the Options page. This fires everytime the user adds or removes a time entry
	chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
		if(request.timeEntriesUpdated) {
			log("Detected time entry change!");
	
			updateAutofillDisableState();	
		}
	});
});


function waitForPageLoad() {
	
	var correctPage = false;
	// Hacky ways to find if we are on the correct page. 
	var url = window.location.href;
	var pageTitle = $(".dijitTitlePaneTextNode").text();

	log("Waiting for Timecard page...");
	if(url.includes("MyTimecard")) {
		correctPage = true;
	} 
	else if(pageTitle === 'My Timecard'){
		// sometimes the url doesnt update, search for the title text
		correctPage = true;	
	}

	if(correctPage) {
		var body = $("body");

		// add spinner
		var spinner = $("#atc-loader");
		if(spinner.length < 1) {			
			$(`<div class="fullscreen-center-wrapper" id="atc-loader" style="display:none"><div class="loader"></div></div>`).insertBefore(body);
		}

		//add error modal
		var spinner = $("#error-modal-wrapper");
		if(spinner.length < 1) {
			$(`<div class="fullscreen-center-wrapper" id="error-modal-wrapper" style="display:none"><div class="error-modal"><h1>Whoops!</h1><p id="error-modal-message"></p><div><button class="adp-btn okay-btn" id="close-model-btn">Ok</button></div></div></div>`).insertBefore(body);

			$("#close-model-btn").click((event)=> {
				event.preventDefault();
				$("#error-modal-wrapper").hide();
			});
		}

		// add autofill button
		var submitButton = $("#btnSubmit");
		
		// Check if the submit button exists, it only will if the page has loaded
		if(submitButton.length > 0) {
			log("Page appears to be loaded. Getting ATC ready...");
			
			$('<button class="adp-btn autofill-btn" style="display:none">Autofill</button>').insertBefore(submitButton);
			
			checkForTimeEntries();

			log("ATC ready!");
			return;
		}
	}

	// we didnt find it, check again in a bit
	setTimeout(() => { waitForPageLoad() }, 1500);
}

function runATC(timeEntries, salariedMode) {
   log("Running autofill...");
   
   if(timeEntries.length < 1) {
	   log("Attempted to run with no entries!");
	   return;
   }

   var spinner = $("#atc-loader");
   spinner.show();

   setTimeout(() => {
		populateRows(timeEntries, salariedMode).then(() => {
			spinner.hide();
			log("Autofill complete!"); 
		});
	}, 100);
}

function getDeterminedDayRowCount(daysToCount = 3) {
	// Iterates through the table to determine how many rows per day there is.
	var currentDay = null;
	var rowInCurrentDay = 1;

	var lowestRowCount = null;

	var dayCount = 0;

	var dayTable = $("#TcGrid"); 
	var dayRows = dayTable.children().children();
	//iterate over each row
	dayRows.each((i) => {
		var row = $(this);
		//Update our current day and row of that day
		var day = $(dayRows[i]).children(".DayName").text().trim();
   	   
		if(day != "" && (currentDay == null || day != currentDay)) {			
			if(currentDay != null && (lowestRowCount == null || rowInCurrentDay < lowestRowCount)) {
				lowestRowCount = rowInCurrentDay;
			}

			currentDay = day;
			rowInCurrentDay = 1;
			if(dayCount > daysToCount) {
				return false;
			} else {
				dayCount++;
			}			
		} else {		
			if(currentDay != null) {
				rowInCurrentDay++;
			}		
		}
	});

	return lowestRowCount;
}

function populateRows(timeEntries, salariedMode) {
	return new Promise((resolve, reject) => {
		var currentDay = null;
		var rowInCurrentDay = 0;
		var skipTheRemainderOfTheDay = false;
		
		var dayTable = $("#TcGrid"); 
		var dayRows = dayTable.children().children();
		var dayIndex = -1;

		function runNextDay() {

			dayIndex++;
			if(dayIndex >= dayRows.length) {
				// we have reached the end.
				// Click on table to deselect the last input field we edited
				dayTable.click();
				
				resolve();
				return;
			}
			
			var row = $(dayRows[dayIndex]);
			
			if(shouldIgnoreRow(row) == false) {
				
				//Update our current day and row of that day
				var day = row.children(".DayName").text().trim();	   	   
				if(day != "" && (currentDay == null || day != currentDay)) {
					currentDay = day;
					rowInCurrentDay = 0;
					//reset skipTheRemainderOfTheDay flag
					skipTheRemainderOfTheDay = false;
				} else {
					rowInCurrentDay++;
				}
				
				// Check if we need to skip this row. We need to skip if:
				// 1) current day is a weekend.
				// 2) the index of the row of the current day is higher than the number of time entries we have (meaning we just want to leave it blank)
				// 3) or if the SkipTheRemainderOfTheDay flag has been set
				var weekend = ["Sat", "Sun"];
				if(!weekend.includes(currentDay) && rowInCurrentDay < timeEntries.length && !skipTheRemainderOfTheDay) {
					
					var timeEntry = timeEntries[rowInCurrentDay];
					
					var hoursDiv = row.find("div[id$=Value]");
					var hoursDivText = hoursDiv.text();
					
					//First check if the hours field has anything in it. If it does, we skip the whole day.
					if(hoursDivText != null && hoursDivText.trim() != "0.00" && hoursDivText.trim() != "0:00") {
						skipTheRemainderOfTheDay = true;
					} else {
						fillInCellsForRow(row, timeEntry, salariedMode).then(()=>{
							runNextDay();							
						});
					}			   
				} else {
					runNextDay();
				}
			} else {
				runNextDay();
			}
		}
		
		//run for the first row/day
		runNextDay();
	});
}

function fillInCellsForRow(row, timeEntry, salariedMode) {
	return new Promise((resolve, reject) => {	

		if(salariedMode) {
			// Handle hours
			var hoursDiv = row.find("div[id$=Value]");
			hoursDiv.click();
			
			var hoursTr = row.find("td[id$=Value]");
			var hoursInput = hoursTr.find(".dijitInputInner");				
			
			hoursInput.sendkeys(timeEntry.hours);
	
		} else {
			// Handle In-Time
			var inTimeDiv = row.find("div[id$=InTime]");
			inTimeDiv.click();
			
			var inTimeTr = row.find("td[id$=InTime]");
			var inTimeInput = inTimeTr.find(".dijitInputInner");
			
			inTimeInput.val(timeEntry.inTime);
			inTimeInput.keyup();
			
			
			// Handle Out-Time
			var outTimeDiv = row.find("div[id$=OutTime]");
			outTimeDiv.click();
			
			var outTimeTr = row.find("td[id$=OutTime]");
			var outTimeInput = outTimeTr.find(".dijitInputInner");				
			
			outTimeInput.val(timeEntry.outTime);
			outTimeInput.keyup();
	
		}
		
		/*
		* The 'product code' is put into a timeout block with a sort delay because
		* the salaried mode "hours" field needs this to be able to be properly filled out.
		* Not sure why, I am guessing ADP just needs a JS cycle or two to do things before we
		* edit the next row. Technically, the project code bit doesnt need to be in a timeout block
		* for the non salaried workflow, but since they both need it, it I just kept it in for both.
		* Plus this allows us to do scroll to row stuff that makes the autofill more visually interesting.
		*/
		setTimeout(() => {
			// Handle Project Code
			var projectDiv = row.find("div[id$=WorkedJobID]");
			projectDiv[0].click();

			var projectTr = row.find("td[id$=WorkedJobID]");
			var projectInput = projectTr.find(".dijitInputInner");
						
			projectInput.val(timeEntry.projectCode);
			projectInput.keyup();


			// scroll the row into view, this is an unneeded visual thing, but it looks cool
			var $container = $('.TcGrid').eq(1),
			$scrollTo = row;
		
			$container.scrollTop(
				$scrollTo.offset().top - $container.offset().top + $container.scrollTop()
			);

			resolve();
		}, 10);
	});								
}

function makeSureAutofillButtonExists() {
    var autofillButton = $(".autofill-btn");

	if(autofillButton.length > 0) {
		// auto fill button exists, check again in 3 secs
	   	setTimeout(() => { makeSureAutofillButtonExists(); }, 1500);
	} else {
		// Oh no we cant find the auto fill button. Wait for the page to load and load it again.
		waitForPageLoad();
	}
}

function verifyEverythingIsReady(entries) {
	/*var rowsPerDayText = ""
	var re = /[\w\s]+\((\d{1,2})\)\.\.\./g;
	var result = re.exec(rowsPerDayText);
	var numberOfRows = parseInt(result[1]);*/

	var rowCount = getDeterminedDayRowCount();

	return rowCount >= entries.length;
}

function getTimeEntries() {
	return new Promise((resolve, reject) => {
		chrome.storage.sync.get({
			"entries": {
				hourly: [],
				salary: []
			},
			"salariedMode": false
		  }, (options) => {
			  if(options.salariedMode) {
				resolve(options.entries.salary)
			  } else {
				resolve(options.entries.hourly)
			  }		  
		  });
	});
}

function getEntriesAndMode() {
	return new Promise((resolve, reject) => {
		chrome.storage.sync.get({
			"entries": {
				hourly: [],
				salary: []
			},
			"salariedMode": false
		  }, (options) => {
			  resolve(options);	  
		  });
	});
}

function checkForTimeEntries() {
	var autofillBtn = $('.autofill-btn');
	
	autofillBtn.hide();

	getTimeEntries().then((entries) => {
		savedTimeEntries = entries;

		autofillBtn.click(function(event) {
			event.preventDefault();
			getEntriesAndMode().then((options) => {
				var salariedMode = options.salariedMode;
				var entries = salariedMode ? options.entries.salary : options.entries.hourly
				setTimeout(function() {
					if(!verifyEverythingIsReady(entries)) {
						$("#error-modal-message").html(`You do not have enough rows per day to autofill your Timecard. <br/><br/>In the bottom right corner, click on <b>Preferences</b> > <b>Rows Per Day</b> and select <b>${entries.length}</b> or higher.`);
						$("#error-modal-wrapper").show();					
						return;
					}
					$('.autofill-btn').attr("disabled",true);
					runATC(entries, salariedMode);
			    }, 1);			
			});		
		});
		
		if(entries.length < 1) {		  
			autofillBtn.attr("disabled",true);
			autofillBtn.attr("title","No time entries saved!");		
		}

		autofillBtn.show();
	});
	
	makeSureAutofillButtonExists();
}

/* Helpers */

function log(message) {
	console.log(`[ATC: ${message}]`);
}

function updateAutofillDisableState() {
	getTimeEntries().then((entries) => {
		var autofillBtn = $('.autofill-btn');
		
		if(entries.length < 1) {		  
			autofillBtn.attr("disabled",true);
			autofillBtn.attr("title","No time entries saved!");		
		} else {
			autofillBtn.attr("disabled",false);
			autofillBtn.attr("title",null);	
		}
	});	
}

function shouldIgnoreRow(row) {
	
	var ignoredRows = 
		["WeekHeaderRow", 
		"ApprovedPTORow", 
		"WeekSummary", 
		"WeekHeaderRow"];
	
	var shouldIgnore = false;
	ignoredRows.forEach(c => {
		if(row.hasClass(c)) {
			shouldIgnore = true;
		}
	});
	
	return shouldIgnore;
}











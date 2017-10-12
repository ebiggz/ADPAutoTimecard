function log(message) {
	console.log(`[ATC: ${message}]`);
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

function runATC(timeEntries) {
   log("Running autofill...");
   
   if(timeEntries.length < 1) {
	   log("Attempted to run with no entries!");
	   return;
   }

   var spinner = $("#atc-loader");
   spinner.show();

   setTimeout(() => {
		populateRows(timeEntries).then(() => {
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

function populateRows(timeEntries) {
	return new Promise((resolve, reject) => {
		var currentDay = null;
		var rowInCurrentDay = 0;
		var skipTheRemainderOfTheDay = false;
		
		var dayTable = $("#TcGrid"); 
		var dayRows = dayTable.children().children();
		//iterate over each row
		dayRows.each(function(i){
			var row = $(this);
				
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
					
					var inTimeDiv = row.find("div[id$=InTime]");
					var inTimeDivText = inTimeDiv.text();
					
					//First check if the in time field has anything in it. If it does, we skip the whole day.
					if(inTimeDivText != null && inTimeDivText.trim() != "") {
						skipTheRemainderOfTheDay = true;
					} else {
						
						// Handle In-Time
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
						
						// Handle Project Code
						var projectDiv = row.find("div[id$=WorkedJobID]");
						projectDiv.click();
						
						var projectTr = row.find("td[id$=WorkedJobID]");
						var projectInput = projectTr.find(".dijitInputInner");
									  
						projectInput.val(timeEntry.projectCode);
						projectInput.keyup();
					}			   
				}
			}
		});
		
		// Click on table to deselect the last input field we edited
		dayTable.click();

		resolve();
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
			"timeEntries": []
		  }, (options) => {
			  resolve(options.timeEntries)
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
			getTimeEntries().then((entries) => {
				setTimeout(function() {
					if(!verifyEverythingIsReady(entries)) {
						alert(`You do not have enough rows per day to fill out your Timecard. \n\nIn the bottom right corner, click on "Preferences" > "Rows Per Day" and select ${entries.length} or higher.`);
						return;
					}
					$('.autofill-btn').attr("disabled",true);
					runATC(entries);
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
		// add spinner
		var spinner = $("#atc-loader");
		if(spinner.length < 1) {
			var body = $("body");
			$(`<div class="loader-wrapper" id="atc-loader" style="display:none"><div class="loader"></div></div>`).insertBefore(body);
		}

		// add autofil button
		var submitButton = $("#btnSubmit");
		
		// Check if the submit button exists, it only will if the page has loaded
		if(submitButton.length > 0) {
			log("Page appears to be loaded. Getting ATC ready...");
			
			$('<button class="autofill-btn" style="display:none">Autofill</button>').insertBefore(submitButton);
			
			checkForTimeEntries();

			log("ATC ready!");
			return;
		}
	}

	setTimeout(() => { waitForPageLoad() }, 1500);
}

function startATC() {
	log("Starting ATC...");
	
	log("Waiting for page load...");
	
	waitForPageLoad();
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
 
//on document ready
$(() => {
	startATC();
	
	chrome.runtime.onMessage.addListener(
		(request, sender, sendResponse) => {
		  if(request.timeEntriesUpdated) {
			log("Detected time entry change!");
	
			updateAutofillDisableState();	
		  }
	});
});










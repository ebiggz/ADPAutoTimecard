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
   console.log("[Running ATC...]");
   
   populateRows(timeEntries);
   
   console.log("[ATC Complete!]"); 
}

function populateRows(timeEntries) {
  
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
   $('.autofill-btn').attr("disabled",true);
}

function makeSureAutofillButtonExists() {
    var submitButton = $(".autofill-btn");

	if(submitButton.length > 0) {
		// auto fill button exists, check again in 3 secs
	   	setTimeout(() => { makeSureAutofillButtonExists(); }, 3000);
	} else {
		// Oh no we cant find the auto fill button. Wait for the page to load and load it again.
		waitForPageLoad();
	}
}

function checkForTimeEntries() {
	var autofillBtn = $('.autofill-btn');
	
	autofillBtn.hide();
	
	chrome.storage.sync.get({
		"timeEntries": []
	  }, function(options) {
		  savedTimeEntries = options.timeEntries;
		  if(savedTimeEntries.length > 0) {		  
			  
			  $('.autofill-btn').click(function(event) {
				event.preventDefault();
				setTimeout(function() {
					/*if(!verifyEverythingIsReady()) {
						alert(`You do not have enough rows per day to fill out your Timecard. Please click on "Preferences" > "Rows Per Day" and select ${savedTimeEntries.length} or higher.`);
						return;
					}*/
					runATC(savedTimeEntries);
			    }, 1);				 
			  });			  
			  autofillBtn.show();
		  }
	  });  
	  makeSureAutofillButtonExists();
}

function verifyEverythingIsReady() {
	//This doesnt work yet. 

	var rowsPerDayText = $("#dijit_PopupMenuItem_0_text").text();
	
	var re = /[\w\s]+\((\d{1,2})\)\.\.\./g;
	var result = re.exec(rowsPerDayText);
	var numberOfRows = parseInt(result[1]);
	
	//dijit_MenuItem_5
	console.log(numberOfRows);
	return numberOfRows >= savedTimeEntries.length;
}

function waitForPageLoad() {
	var submitButton = $("#btnSubmit");
	
	// Check if the submit button exists, it only will if the page has loaded
	if(submitButton.length > 0) {
		console.log("[ATC: Page appears to be loaded. Getting ATC ready...]");
		
		$('<button class="autofill-btn" style="display:none">Autofill</button>').insertBefore(submitButton);
		
		checkForTimeEntries();
	} else {
		// keep looking
		setTimeout(() => { waitForPageLoad() }, 500);
	}
}

function startATC() {
	console.log("[ATC: Starting ATC...]");
	
	console.log("[ATC: Waiting for page load...]");
	
	waitForPageLoad();

	console.log("[ADP Auto Timecard loaded.]");
}


// Hacky ways to find if we are on the correct page. 
var url = window.location.href;

if(url.includes("MyTimecard")) {
	startATC();
} else {
	// sometimes the url doesnt update, search for the title text
	var pageTitle = $(".dijitTitlePaneTextNode").text();
	if(pageTitle === 'My Timecard') {
		startATC();
	}
}






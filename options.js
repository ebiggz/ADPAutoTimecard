var app = new Vue({
	el: '#app',
	data: {
		timeEntries: {
			hourly: [],
			salary: []
		},
		salariedMode: false,
		showingAddEntryInputs: false,
		newEntry: {
			hourly: {
				inTime: "",
				outTime: "",
				projectCode: ""
			},
			salary: {
				hours: "",
				projectCode: ""
			}
		},
		errors: {
			invalidInTime: false,
			invalidOutTime: false,
			invalidProjectCode: false,
			invalidHours: false
		}
	},
	methods: {
		openADPTab: function() {
			var url = "https://workforcenow.adp.com/portal/theme#/Myself_ttd_MyselfTabTimecardsAttendanceSchCategoryTLMWebMyTimecard/MyselfTabTimecardsAttendanceSchCategoryTLMWebMyTimecard";
			window.open(url,'_blank');
		},
		hasErrors: function() {
			var app = this;
			
			return (app.errors.invalidInTime || app.errors.invalidOutTime || app.errors.invalidProjectCode || app.errors.invalidHours);
		},
		normalizeTimeString: (rawTime) => {
			time = rawTime.trim();

			if(time === "") return rawTime;
			
			if(!time.includes(":")) {

				if(time.length > 2) {
					var split = time.split(" ");
					var timeSplit = split[0];
					if(timeSplit.length > 2) {

						var addColon = ""
						if(timeSplit.length == 3) {
							addColon = timeSplit.substring(0,1) + ":" + timeSplit.substring(1,3)
						} else {
							addColon = timeSplit.substring(0,2) + ":" + timeSplit.substring(2,timeSplit.length)
						}

						if(split.length > 1) {
							addColon = addColon + " " + split[1].trim();
						}

						time = addColon;
					} 
				}

				if(!time.includes(":")) {
					if(time.includes(" ")) {
						time = time.replace(" ", ":00 ");
					} 
					else if(time.length < 3 && !isNaN(time)) {
						time = `${time}:00`
					} else {
						return rawTime;
					}	
				}
			} 

			var hrAndMins = time.split(":");

			var hour = hrAndMins[0].trim();
			var mins = "00";

			if(hrAndMins.length > 1 && hrAndMins[1].trim() !== "") {
				mins = hrAndMins[1].trim();
			}
			
			var meridiem = "am"; //am or pm

			if(mins.includes(" ")) {
				var minsAndMeridem = mins.split(" ");

				mins = minsAndMeridem[0];

				if(minsAndMeridem.length > 1) {
					meridiem = minsAndMeridem[1].trim().toLowerCase();
				}
			}

			if(hour.length === 1) {
				hour = `0${hour}`
			}
			if(mins.length === 1) {
				mins = `${mins}0`
			}

			if(meridiem.length == 1) {
				meridiem = `${meridiem}m`
			}

			if(hour.length > 2 || isNaN(hour) || mins.length > 2 || isNaN(mins) || (meridiem !== 'am' && meridiem !== 'pm')) {
				return rawTime;
			}
			
			return `${hour}:${mins} ${meridiem.toUpperCase()}`
		},
		normalizeTimeForType: function(type) {
			var app = this;

			if(type === 'in') {
				app.newEntry.hourly.inTime = app.normalizeTimeString(app.newEntry.hourly.inTime.trim());
			} else {
				app.newEntry.hourly.outTime = app.normalizeTimeString(app.newEntry.hourly.outTime.trim());
			}
		},
		getSavedData: function() {
			var app = this;
			chrome.storage.sync.get({
				"entries": {
					hourly: [],
					salary: []
				},
				"salariedMode": false
			}, function(options) {
				app.timeEntries = options.entries;
				app.salariedMode = options.salariedMode;
			});
		},
		saveNewHourlyEntry: function() {			  
			var app = this;
			
			app.errors.invalidInTime = false;
			app.errors.invalidOutTime = false;
			app.errors.invalidProjectCode = false;
			
			var newEntry = app.newEntry.hourly;
			
			var timeRegex = /^\d{2}:\d{2}\s(A|P)M$/i;	  
			
			newEntry.inTime = app.normalizeTimeString(newEntry.inTime.trim());
			newEntry.outTime = app.normalizeTimeString(newEntry.outTime.trim());

			var inTimeValid = timeRegex.test(newEntry.inTime);	  
			if(!inTimeValid) {
				app.errors.invalidInTime = true;
			}
			
			var outTimeValid = timeRegex.test(newEntry.outTime);
			if(!outTimeValid) {
				app.errors.invalidOutTime = true;
			}
			
			var projectCodeValid = newEntry.projectCode.toString();
			if(!projectCodeValid) {
				app.errors.invalidProjectCode = true;
			}

			if(app.hasErrors()) {
				return;
			}
			
			newEntry.inTime = newEntry.inTime.toUpperCase();
			newEntry.outTime = newEntry.outTime.toUpperCase();
			newEntry.projectCode = newEntry.projectCode.toString();		  
			
			app.timeEntries.hourly.push(newEntry);
			
			app.showingAddEntryInputs = false;
			
			app.newEntry.hourly = { inTime:"", outTime:"", projectCode:"" }
			
			app.saveAllEntries();
		},
		saveNewSalaryEntry: function() {			  
			var app = this;
			
			app.errors.invalidHours = false;
			app.errors.invalidProjectCode = false;
			
			var newEntry = app.newEntry.salary;
			
			var hoursValid = newEntry.hours.toString();
			if(!hoursValid) {
				app.errors.invalidHours = true;
			}
			
			var projectCodeValid = newEntry.projectCode.toString();
			if(!projectCodeValid) {
				app.errors.invalidProjectCode = true;
			}

			if(app.hasErrors()) {
				return;
			}
			
			newEntry.hours = newEntry.hours.toString();
			newEntry.projectCode = newEntry.projectCode.toString();		  
			
			app.timeEntries.salary.push(newEntry);
			
			app.showingAddEntryInputs = false;
			
			app.newEntry.salary = { hours: "", projectCode:"" }
			
			app.saveAllEntries();
		},
		deleteEntryAtIndex: function(entryType, index) {
			var app = this;
			
			if(entryType === 'salary') {
				app.timeEntries.salary.splice(index, 1);
			}
			else if(entryType === 'hourly') {
				app.timeEntries.hourly.splice(index, 1);
			}		
			
			app.saveAllEntries();
		},
		saveAllEntries: function() {
			var app = this;
			
			chrome.storage.sync.set({
				entries: app.timeEntries,
				salariedMode: app.salariedMode
			}, () => {
				// let the content script on whatever tab know the entries have been updated
				app.fireSaveEvent();
			});
		},
		fireSaveEvent: function() {
			chrome.tabs.query({}, function(tabs) {
				var message = { timeEntriesUpdated: true };
				for (var i=0; i<tabs.length; ++i) {
					chrome.tabs.sendMessage(tabs[i].id, message);
				}
			});
		}
	},
	mounted: function() {
		this.getSavedData();
	}
});

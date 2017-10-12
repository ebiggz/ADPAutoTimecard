var app = new Vue({
	el: '#app',
	data: {
		timeEntries: [],
		showingAddEntryInputs: false,
		newEntry: {
			inTime: "",
			outTime: "",
			projectCode: ""
		},
		errors: {
			invalidInTime: false,
			invalidOutTime: false,
			invalidProjectCode: false
		}
	},
	methods: {
		hasErrors: function() {
			var app = this;
			
			return (app.errors.invalidInTime || app.errors.invalidOutTime || app.errors.invalidProjectCode);
		},
		getSavedData: function() {
			var app = this;
			chrome.storage.sync.get({
				"timeEntries": []
			}, function(options) {
				app.timeEntries = options.timeEntries;
			});
		},
		saveNewEntry: function() {			  
			var app = this;
			
			app.errors.invalidInTime = false;
			app.errors.invalidOutTime = false;
			app.errors.invalidProjectCode = false;
			
			var newEntry = app.newEntry;
			
			var timeRegex = /^\d{2}:\d{2}\s(A|P)M$/i;	  
			
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
			
			app.timeEntries.push(newEntry);
			
			app.showingAddEntryInputs = false;
			
			app.newEntry = {inTime:"",outTime:"",projectCode:""}
			
			app.saveAllEntries();
		},
		deleteEntryAtIndex: function(index) {
			var app = this;
			
			app.timeEntries.splice(index, 1);
			
			app.saveAllEntries();
		},
		saveAllEntries: function() {
			var app = this;
			
			chrome.storage.sync.set({
				timeEntries: app.timeEntries
			}, () => {
				// let the content script on current active tab know the entries have been updated
				chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
					chrome.tabs.sendMessage(tabs[0].id, { timeEntriesUpdated: true }, () => {});
				});
			});
		}
	},
	mounted: function() {
		this.getSavedData();
	}
});

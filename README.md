## ADP AutoTimecard

A Google Chrome Extension that autofills your ADP Timecard with predefined entries. 

![ATC Preview](https://i.imgur.com/igyD36u.gif)

### Installing
1) Visit the [Releases page](https://github.com/ebiggz/ADPAutoTimecard/releases) and download the latest version.
2) In Chrome, open the Extensions page (Three dots > More tools > Extensions).
3) Drag the downloaded .crx file into the Extensions page.

### Usage
#### First Time Setup
1) Open up the Options page (either by clicking **Options** in the Extensions page or clicking the ATC icon in the Chrome toolbar)
2) If you are salaried, check the **Salaried** checkbox.
3) Create time entries. Each entry represents one row in a day and will be copied to all days in a pay period.

#### Once A Pay Period
1) Navigate to ADP's My Timecard page.
2) Press the new orange **Autofill** button next to the **Save** button.
3) Once ATC has finished, review the changes and click **Save** when satisfied. 

### Things To Note
- ATC does *not* look at or save any sensitive info. It's just some hacky jQuery that tries to fill out all the appropriate rows in the pay period table.
- The script automatically skips over weekends, PTO/Sick days, holidays, and any days that already have a time entry in it.
- ATC does not automatically save after autofilling. Please confirm the changes to ensure everything is correct before saving.
- The Extension is provided as is. It should work. But could easily break at any time if ADP changes anything to due with the Timecard page.

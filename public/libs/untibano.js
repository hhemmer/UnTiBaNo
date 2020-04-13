var now = new Date();

window.onloadstart = renderTime();

function substract_minutes(minutes) {
	now = new Date(now.getTime() - minutes*60000);
};

function saveData(hostname, port) {
	window.location = "http://" +hostname +":" +port +"/event?timestamp=" +now.getTime();
};

function renderTime() {
	const tag = moment(now).locale("de").format("DD.MM.YYYY");
	document.getElementById('datum').textContent = tag;
	
	const stunde = moment(now).locale("de").format("HH");
	document.getElementById('stunde').textContent = stunde;
	
	const minute = moment(now).format("mm");
	document.getElementById('minute').textContent = minute;
};

function showCountdown(eventTimerEnd) {
	var difference = moment(now).diff(moment(eventTimerEnd));
	console.log("Time left to end of countdown: " +difference.format('HH:mm'));
}
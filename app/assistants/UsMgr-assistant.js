function UsMgrAssistant() {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
}

UsMgrAssistant.prototype.identifier = 'palm://org.webosinternals.upstartmgr';

UsMgrAssistant.prototype.setup = function() {
	/* this function is for setup tasks that have to happen when the scene is first created */

	/* use Mojo.View.render to render view templates and add them to the scene, if needed. */

	/* setup widgets here */
	Mojo.Log.info("Set up attributes");

	/* Make the list uneditable by the user */
	this.listAttributes = {
		// Template for how to display list items
		itemTemplate: 'UsMgr/itemTemplate',
		swipeToDelete: false,
		reorderable: true,
		lookahead: 30,
		renderLimit: 40		
	};
	Mojo.Log.info("Set up list model");

	/* Set a fake item, Give a title to the list */
	this.listModel = {
		listTitle: 'Running Services',
		items: [{name:"this.broke.horribly",state:"-1",status:0}]
	};

	/* Create the list widget */
	this.controller.setupWidget("UsMgr_list",this.listAttributes,this.listModel);

	/* Create the app menu */
	this.controller.setupWidget(Mojo.Menu.appMenu,this.attributes={omitDefaultItems:true},this.model={
		visible:true,
		items:[
			{label:"Sort by name",command:"sn"}
			,{label:"Sort by state",command:"st"}
			,{label:"Sort by status",command:"sss"}
		]
	});
	/* add event handlers to listen to events from widgets */

	/* Set up the listener for tapping on list items */
	this.controller.listen("UsMgr_list", Mojo.Event.listTap, this.handleTap.bind(this));
	/* Default sort preference is by # of open service handles */
	this.sortPref = "name";
	//this.interval = setInterval(this.updateList.bind(this),5000);
	/* Holder of the last process list, keep it around so reordering list doesn't need to poll lunastats */
	this.lastList = {};
}

/* handler for app menu buttons */
UsMgrAssistant.prototype.handleCommand = function(event) {
	var f = this.appendList.bind(this);
	if (event.type === Mojo.Event.command)
	{
		switch(event.command)
		{
			case 'sn':
				this.sortPref = "name";
				Mojo.Log.info("Sort by name set");
				f(this.lastList);
				break;
			case 'st':
				this.sortPref = "state";
				Mojo.Log.info("Sort by state set");
				f(this.lastList);
				break;
			case 'sss':
				this.sortPref = "status";
				Mojo.Log.info("Sort by status set");
				f(this.lastList);
				break;
			default: break;
		}
	}
}


/* Handle the tap on the list item */
UsMgrAssistant.prototype.handleTap = function(event) {
	var f = this.serviceControl.bind(this);
	f(event);
}

/* Confirm that you REALLY want to toggle this item */
UsMgrAssistant.prototype.serviceControl = function(event) {
	var f = this.toggleService.bind(this);
	var statusText = newStatusText = labelText = event.item.state;
	Mojo.Log.info(event.item.status);
	//format the service state into more engrish friendly words
	if (event.item.state == "stop"){
		statusText = "stopped";
		newStatusText = "start";
	}
	else if (event.item.state == "start"){
		statusText = "running";
		newStatusText = "stop";
	}
	else{
		statusText = event.item.status
	}
	var titleText = event.item.name + " is " + statusText + ". Would you like to " + newStatusText + " it?";
	labelText = newStatusText + " it!";
	var affirm = function(transport)
	{
		if (transport)
		{
			f(event);
		}
	}
	this.controller.showAlertDialog({
		onChoose:affirm,
		title:titleText,
		choices:[
			{label:labelText,value:true,type:'affirmative'},
			{label:"No, don't do that!", value:false,type:'negative'}
		]
	});
}

/* Launches a service by name */
UsMgrAssistant.prototype.toggleService = function(event) {
	/* Make sure the click event came from a list item */
	Mojo.Log.info("Toggling service: " + event.item.name);
	var id = event.item.name
	/* Call the Application Manager to kill the selection process */
	if (event.item.state == "stop") {
		//this.startService(this.handleStart.bindAsEventListener(this), event.item.name);
		this.startService(event.item.name);
	}
	if (event.item.state == "start") {
		//this.startService(this.handleStart.bindAsEventListener(this), event.item.name);
		this.stopService(event.item.name);
	}
}

UsMgrAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
	
	/* Update the list with real info */
	var f = this.updateList.bind(this);
	f();
}


UsMgrAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
//	clearInterval(this.interval);
}

UsMgrAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
}

/* Calls the service which knows about application statistics */
UsMgrAssistant.prototype.updateList = function() {
	var request = new Mojo.Service.Request
	(
		UsMgrAssistant.prototype.identifier,
		{
			method: 'list',
			parameters: {subscribe:true},
			onSuccess: this.appendList.bind(this),
		}
	);
	Mojo.Log.info("List Grabbed");
	return request;
}

UsMgrAssistant.prototype.startService = function(id)
{
	var request = new Mojo.Service.Request
	(
		UsMgrAssistant.prototype.identifier,
		{
			method: 'start',
			parameters:
			{
				'id': id
			},
			onSuccess: this.updateList.bind(this),
		}
	);
	return request;
}

UsMgrAssistant.prototype.stopService = function(id)
{
	var request = new Mojo.Service.Request
	(
		UsMgrAssistant.prototype.identifier,
		{
			method: 'stop',
			parameters:
			{
				'id': id
			},
			onSuccess: this.updateList.bind(this),
		}
	);
	return request;
}

/* Append the real processes to the Process List */
UsMgrAssistant.prototype.appendList = function(event) {
	/* save event */
	this.lastList = event;
	/* Used for debugging purposes */
	for (var i in event.jobs[1]) {Mojo.Log.info(i);}
	/* sort by preference */
	
	
	var sorter = function (a,b) {
		if (this.sortPref == 'name')
		{
    		var x = a.name.toLowerCase();
    		var y = b.name.toLowerCase();
			Mojo.Log.info("Sort by name");
			return ((x < y) ? -1 : ((x > y) ? 1 : 0));
		}
		if (this.sortPref == 'state')
		{
    		var x = a.state.toLowerCase();
    		var y = b.state.toLowerCase();
			Mojo.Log.info("Sort by state");
			return ((x < y) ? -1 : ((x > y) ? 1 : 0));
		}
		if (this.sortPref == 'status')
		{
    		var x = a.status.toLowerCase();
    		var y = b.status.toLowerCase();
			Mojo.Log.info("Sort by status");
			return ((x < y) ? -1 : ((x > y) ? 1 : 0));
		}
		else
		{
			return 0;
		}
	}
	/* Array holding all the processes */
	var services = new Array();
	Mojo.Log.info("Add services to list");
	//shorten the status to just the first word	(A.K.A. cut it off at the first comma)
	var docLength = event.jobs.length;
	for (var i = 0; i < docLength; i++) {
		var shortstatus=event.jobs[i].status.split(",");
		event.jobs[i].status = shortstatus[0]		
	}	
	/* Sort list */
	var services = new Array();
	services = event.jobs.sort(sorter.bind(this));
	/* Add the list of processes to the GUI list */
	this.controller.get("UsMgr_list").mojo.setLength(services.length);
	this.controller.get("UsMgr_list").mojo.noticeUpdatedItems(0,services);
};
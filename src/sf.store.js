'use strict';

import Rx from './sf.include';

// Use only native events even if jQuery
Rx.config.useNativeEvents = true;

function StoreBase(store_data, default_act, ext_methods) {
	this._storeSubject = new Rx.BehaviorSubject(store_data);

	this._storeState = store_data;
	this._storeHistory = [];
	this._historyIndex = -1;

	//the default action is primarily for enabling 'Store Owner' to call functions (via bindAction) *outside* store object, like in a legacy angular controller
	//yeah, to keep the base class simple, one store only have one default action, it can be null (no call outside the store when an Action is dispatched)
	//the actual instantiation of the store can have multiple actions
	this.action = default_act;

	//cache subscriptions for potential disposal and make init re-entrant
	this._subs = {};

	if (typeof ext_methods === "object") {
		Object.assign(this, ext_methods);
	}
}

StoreBase.prototype = {
	constructor: StoreBase,

	/**
	invoke explicitly to enable Undo/Redo
	*/
	init() {
		this.enableUndoRedo(true);
		this.streamChange();
	},

	/**
	listen to store state changes, returns Rx subscription
	*/
	subscribe(fn, context) {
		return this._storeSubject.subscribe( (payload) => {
			fn.apply(context, [payload]);
		});
	},

	/**
	dispose the subscription returned from subscribe call
	*/
	dispose(subscription) {
		if (subscription) {
			subscription.dispose();
		}
		else { //dispose ALL
			this._storeSubject.dispose();
		}
	},

	/**
	wrap the onNext to enbale history cache for Undo/redo
	*/
	streamChange() {
		// always remember the initial state, in case 'cancel'
		if (this.undoRedoSub || this._historyIndex < 0) {
			this._historyIndex++;
			this._storeHistory.push(this._storeState);
		}
		this._storeSubject.onNext(this._storeState);
	},

	/**
	 * bind action to self, only once
	 */
	registerAction(actObj, actType, actFn) {
		if (!this._subs[actType]) {
			this._subs[actType] = actObj.subscribe(actType, actFn, this);
		}
	},

	/**
	unregister a listening function by type
	*/
	unRegisterAction(actObj, actType) {
		if (this._subs[actType]) {
			actObj.dispose(this._sub[actType]);
			delete this._subs[actType];
		}
	},

	/**
	 * bind default action to function *outside* store
	 */
	bindAction(actType, actFn, actContext) {
		if (!this.action) {
			console.warn("StoreBase: missing default action, no call outside of the store.");
		}
		else {
			return this.action.subscribe(actType, actFn, actContext);
		}
	},

	/**
	when external function no longer need to response to state change stream, unbind it by subscription returned from bindAction call earlier
	*/
	unBindAction(actSubs) {
		if (!actSubs) { //prevent dispose all
			console.warn("StoreBase: missing subscription argument.");
		}
		else {
			this.action.dispose(actSubs);
		}
	},

	/**
	start or stop state history recording for undo/redo
	*/
	enableUndoRedo(toEnable) {
		if (toEnable) {
			if (!this.undoRedoSub) {
				this.undoRedoSub = this.bindAction("UNDO_REDO", this.onUndoRedo, this);
			}
		}
		else {
			if (this.undoRedoSub) {
				this.unBindAction(this.undoRedoSub);
				this.undoRedoSub = null;
			}
		}
	},

	/**
	default action handler for default "UNDO_REDO" action
	*/
	onUndoRedo(payload) {
		if (payload.data === "--") {
			if (this._historyIndex > 0) {
				this._historyIndex--;
			}
		}
		else if (payload.data === "++") {
			if (this._historyIndex < this._storeHistory.length - 1) {
				this._historyIndex++;
			}
		}

		if (this._storeState != this._storeHistory[this._historyIndex]) {
			this._storeState = this._storeHistory[this._historyIndex];
			this._storeSubject.onNext(this._storeState);
		}
	},

	/**
	wipe the store state history, restart the history recoding either by a specified state or the very first initial state
	useful for 'cancel' or 'reset' for container component
	*/
	resetStoreState(headState) {
		this._historyIndex = 0;
		this._storeState = headState || this._storeHistory[this._historyIndex];
		this._storeHistory = [this._storeState];
	}
};

module.exports = StoreBase;


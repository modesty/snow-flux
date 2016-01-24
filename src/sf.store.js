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

	init() {
		this.enableUndoRedo(true);
		this.streamChange();
	},

	subscribe(fn, context) {
		return this._storeSubject.subscribe( (payload) => {
			fn.apply(context, [payload]);
		});
	},

	dispose(subscription) {
		if (subscription) {
			subscription.dispose();
		}
		else { //dispose ALL
			this._storeSubject.dispose();
		}
	},

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

	unRegisterAction(actObj, actType) {
		if (this._subs[actType]) {
			actObj.dispose(this._sub[actType]);
			this._subs[actType] = null;
		}
	},

	/**
	 * bind default action to function *outside* or *inside* store
	 */
		bindAction(actType, actFn, actContext) {
		if (!this.action) {
			console.warn("StoreBase: missing default action, no call outside of the store.");
		}
		else {
			return this.action.subscribe(actType, actFn, actContext);
		}
	},

	unBindAction(actSubs) {
		if (!actSubs) { //prevent dispose all
			console.warn("StoreBase: missing subscription argument.");
		}
		else {
			this.action.dispose(actSubs);
		}
	},

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

	resetStoreState(headState) {
		this._historyIndex = 0;
		this._storeState = headState || this._storeHistory[this._historyIndex];
		this._storeHistory = [this._storeState];
	}
};

module.exports = StoreBase;


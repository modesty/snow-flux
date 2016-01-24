'use strict';

import Rx from './sf.include';

//when instantiating, needs to pass in "action_types", see ../menus/reactive.menubar.action for example
function ActionBase(action_types, ext_methods) {
	//back rx subject, initialized to have empty type and data, if dispatched, will show error
	this._actionSubject = new Rx.BehaviorSubject({type: "", data: null});

	//make the types map to be ready only properties
	for (let name in action_types) {
		if (action_types.hasOwnProperty(name)) {
			Object.defineProperty(this, name, {
				enumerable: true, configurable: true, get: () => action_types[name]
			});
		}
	}

	if (typeof ext_methods === "object") {
		Object.assign(this, ext_methods);
	}
}

ActionBase.prototype = {
	constructor: ActionBase,

	dispatch(actType, actData) {
		if (!actType || typeof(actData) === "undefined") {
			console.error("ActionBase: missing arguments", actType, actData);
		}
		else {
			this._actionSubject.onNext({
				type: actType,
				data: actData
			});
		}
	},

	subscribe(actType, fn, context) {
		if (!actType || !this.hasOwnProperty(actType)) {
			console.error(`action type of ${actType} is not defined.`);
			return null;
		}

		return this._actionSubject.filter((payload) => payload.type === this[actType])
			.subscribe((payload) => {
				fn.apply(context, [payload]);
			});
	},

	dispose(subscription) {
		if (subscription) {
			subscription.dispose();
		}
		else { //dispose ALL
			this._actionSubject.dispose();
		}
	}
};

module.exports = ActionBase;
# Snow-Flux

> A simple and practical unidirectional data flow implementation with Reactive Extensions [RxJS](https://github.com/Reactive-Extensions/RxJS).

This module is utilizing the expressiveness and conciseness of [RxJS](https://github.com/Reactive-Extensions/RxJS) to simplify and empower of the idea of unidirectional data flow, enabling the 'store' to be the single source of truth for component state in [ReactJS] (https://github.com/facebook/react) based web application with greater simplicity and effectiveness. More in depth discussion can be found at [Reactive Flux without Flux](http://www.codeproject.com/Articles/1063098/Reactive-Flux-without-Flux).

## Installation

Install from npm:
```
npm install snow-flux
```

Or, install from GitHub:
```
npm install modesty/snow-flux
```

Then, build 'dist' as needed:
```
npm run gulp
```

## Why Snow-Flux

There are other [RxJS](https://github.com/Reactive-Extensions/RxJS) based Flux implementations in GitHub, [Reactive Flux without Flux](http://www.codeproject.com/Articles/1063098/Reactive-Flux-without-Flux) lists at least 5 in 'Overview' section. I'm building this module with the following goals and features:

* Managed RxJS decencies: RxJS is a big library: complete, main, lite, core, etc., we’d like to manage the dependencies to the bare minimum. In the meantime, the dependency list can grow if the application uses more Rx features
* Avoid [waitFor](https://github.com/facebook/flux/issues/209) in Action while make Action type extensible
* Enable external handler to subscribe to Action through Store: this is to enable Store to play well with legacy code, like a scoped function within Angular controller
* Pair an Action with a Store by default, while still enable Store to subscribe to multiple Actions
* Eliminating global dispatcher and singleton, keep the base implementation practical and simple
* Promote immutable data structure by __build-in redo/undo__ functionality in Store, but not enforce it, concrete instance of Store can opt-in for undo/redo support
* No addition concepts and constructs beyond Flux, keep everything simple

## About Store and Action

Here are some general technical considerations for snow-flux:

* Store data object is private, use [React Immutable Helper](https://facebook.github.io/react/docs/update.html) or [Immutable.js](https://github.com/facebook/immutable-js) to manipulate and keep it immutable, undo/redo can opt-in or opt-out any moment
* Action _types_ will be ready only properties and only customizable when instantiate
* Both Store and Action are backed by a [BehaviorSubject](https://github.com/Reactive-Extensions/RxJS/blob/master/doc/api/subjects/behaviorsubject.md), it makes Store and Action are both [observable](https://github.com/Reactive-Extensions/RxJS/blob/master/doc/api/core/observable.md) and [observer](https://github.com/Reactive-Extensions/RxJS/blob/master/doc/api/core/observer.md), and also makes sure the observer will always get the initial or last data regardless the timing to subscribe
* Subscribe and dispose invocation can be reentrant
* All other Flux architectural aspects stay, including Store can subscribe to multiple Action, view can subscribe to multiple stores, etc., although the default behavior prefers one to one relationship for simplicity

## Examples

### Actions
#### Create a simple Action:

```javascript
'use strict';

import { SfAction } from 'snow-flux';

let NavBarAction = new SfAction({
	ACTION: "NAV_BAR_ACTION", UNDO_REDO: "NAV_BAR_UNDO_REDO", REFRESH_APP: "REFRESH_APP"
});

module.exports = NavBarAction;
```

#### Create an Action with customized initialization method
```javascript
'use strict';

import { SfAction } from 'snow-flux';

let PermAction = new SfAction({
	ACTION: "USER_ACTION", UNDO_REDO: "USER_UNDO_REDO",
	UPDATE_ONE_RIGHT: "UPDATE_ONE_RIGHT",
	UPDATE_ALL_PERM: "UPDATE_ALL_PERM", UPDATE_ONE_PERM: "UPDATE_ONE_PERM"
}, {
	init(httpRequest, scopeId) {
		let getAppEndpoint =  "api/now/delegation/permission/list";
		return httpRequest.get(getAppEndpoint).then(
			response => response.data.result
		);
	}
});

module.exports = PermAction;
```

#### Dispatch an Action from React component:

```javascript
	renderLinkItems() {
		return this.props.links.map( (item, idx) => {
			let clsName = (this.props.align === 'left' && idx === 0) ? "btn btn-primary" : "icon-link-hover-handler";

			return (
				<li key={item.action} >
					<div className={clsName} onClick={this.onAppLinksAction.bind(this, idx)}>
						<a href="#">
							<i className={"icon " + item.icon}></i><span> </span>{item.t_label}
						</a>
					</div>
				</li>
			);
		});
	},

	onAppLinksAction(idx, evt) {
		evt.preventDefault();
		let actName = this.props.links[idx].action;
		navBarAction.dispatch(navBarAction.ACTION, actName);
	}
```

### Store
#### Createa store with [React Immutable Helper](https://facebook.github.io/react/docs/update.html) to localize all "t_label" properties when initializes:

```javascript
'use strict';

import reactUpdate from 'react/lib/update';
import { SfStore } from 'snow-flux';
import navBarAction from './navBarAction';

let NavBarStore = new SfStore({
		favorites: [
			{t_label: "Create New", icon: "icon-add", action: "modal-createNew"}
		],
		searches: [
			{t_label: "Go To", icon: "icon-search", action: "modal-goto"},
			{t_label: "Search", icon: "icon-advanced-search", action: "modal-search"}
		]
	}, 
	navBarAction, {
		init(i18nFunc) {
			// imperative initialization with i18n
			function _translate(itemArray) {
				return itemArray.map((item, idx, array) => {
					return reactUpdate(item, {
						label: {$set: i18nFunc(item.t_label)}
					});
				});
			}

			this._storeState = reactUpdate(this._storeState, {
				favorites: {
					$apply: _translate
				},
				searches: {
					$apply: _translate
				}
			});

			this.streamChange();
		}
	}
);

module.exports = NavBarStore;
```


#### Create a store with Action handlers:

```javascript
'use strict';

import reactUpdate from 'react/lib/update';
import { SfStore } from 'snow-flux';
import navBarAction from './navBarAction';

let NavBarStore = new SfStore({
		favorites: [
			{t_label: "Create New", icon: "icon-add", action: "modal-createNew"}
		],
		searches: [
			{t_label: "Go To", icon: "icon-search", action: "modal-goto"},
			{t_label: "Search", icon: "icon-advanced-search", action: "modal-search"}
		]
	}, 
	navBarAction, {
		init(i18nFunc) {
			// imperative initialization with i18n
			function _translate(itemArray) {
				return itemArray.map((item, idx, array) => {
					return reactUpdate(item, {
						label: {$set: i18nFunc(item.t_label)}
					});
				});
			}

			this._storeState = reactUpdate(this._storeState, {
				favorites: { $apply: _translate },
				searches: { $apply: _translate }
			});

			this.registerAction(this.action, 'REFRESH_APP', this.onRefreshApp);

			this.streamChange();
		},
		onRefreshApp(action) {
			this.resetStoreState();
		}
	}
);

module.exports = NavBarStore;
```

#### Subscribe to store changes in top level (container component / higher order component / controller component) React component:

```javascript
	...
	componentDidMount() {
		this.stateSubs = navBarStore.subscribe( (stateData) => this.setState(stateData) );
	},

	componentWillUnmount() {
		navBarStore.dispose(this.stateSubs);
	},
	...
```

## More info

More in depth discussion can be found at [Reactive Flux without Flux](http://www.codeproject.com/Articles/1063098/Reactive-Flux-without-Flux).

## Contribution

By participating in this project, you are expected to honor this [code of conduct](http://todogroup.org/opencodeofconduct/#Open+Code+of+Conduct/abuse@todogroup.org).
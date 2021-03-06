/** SyncPromise internal states */
var States;
(function (States) {
	/** Pending */
	States["PENDING"] = "PENDING";
	/** Resolved / OK */
	States["RESOLVED"] = "RESOLVED";
	/** Rejected / Error */
	States["REJECTED"] = "REJECTED";
})(States || (States = {}));

/**
 * Checks whether given value has a then function.
 * @param wat A value to be checked.
 */
function isThenable(wat) {
	// tslint:disable:no-unsafe-any
	return Boolean(wat && wat.then && typeof wat.then === 'function');
	// tslint:enable:no-unsafe-any
}

/**
 * Thenable class that behaves like a Promise and follows it's interface
 * but is not async internally
 */
var SyncPromise = /** @class */ (function () {
	function SyncPromise(executor) {
		var _this = this;
		this._state = States.PENDING;
		this._handlers = [];
		/** JSDoc */
		this._resolve = function (value) {
			_this._setResult(States.RESOLVED, value);
		};
		/** JSDoc */
		this._reject = function (reason) {
			_this._setResult(States.REJECTED, reason);
		};
		/** JSDoc */
		this._setResult = function (state, value) {
			if (_this._state !== States.PENDING) {
				return;
			}
			if (isThenable(value)) {
				value.then(_this._resolve, _this._reject);
				return;
			}
			_this._state = state;
			_this._value = value;
			_this._executeHandlers();
		};
		// TODO: FIXME
		/** JSDoc */
		this._attachHandler = function (handler) {
			_this._handlers = _this._handlers.concat(handler);
			_this._executeHandlers();
		};
		/** JSDoc */
		this._executeHandlers = function () {
			if (_this._state === States.PENDING) {
				return;
			}
			if (_this._state === States.REJECTED) {
				_this._handlers.forEach(function (handler) {
					if (handler.onrejected) {
						handler.onrejected(_this._value);
					}
				});
			}
			else {
				_this._handlers.forEach(function (handler) {
					if (handler.onfulfilled) {
						// tslint:disable-next-line:no-unsafe-any
						handler.onfulfilled(_this._value);
					}
				});
			}
			_this._handlers = [];
		};
		try {
			executor(this._resolve, this._reject);
		}
		catch (e) {
			this._reject(e);
		}
	}
	/** JSDoc */
	SyncPromise.prototype.toString = function () {
		return '[object SyncPromise]';
	};
	/** JSDoc */
	SyncPromise.resolve = function (value) {
		return new SyncPromise(function (resolve) {
			resolve(value);
		});
	};
	/** JSDoc */
	SyncPromise.reject = function (reason) {
		return new SyncPromise(function (_, reject) {
			reject(reason);
		});
	};
	/** JSDoc */
	SyncPromise.all = function (collection) {
		return new SyncPromise(function (resolve, reject) {
			if (!Array.isArray(collection)) {
				reject(new TypeError("Promise.all requires an array as input."));
				return;
			}
			if (collection.length === 0) {
				resolve([]);
				return;
			}
			var counter = collection.length;
			var resolvedCollection = [];
			collection.forEach(function (item, index) {
				SyncPromise.resolve(item)
					.then(function (value) {
					resolvedCollection[index] = value;
					counter -= 1;
					if (counter !== 0) {
						return;
					}
					resolve(resolvedCollection);
				})
					.then(null, reject);
			});
		});
	};
	/** JSDoc */
	SyncPromise.prototype.then = function (onfulfilled, onrejected) {
		var _this = this;
		return new SyncPromise(function (resolve, reject) {
			_this._attachHandler({
				onfulfilled: function (result) {
					if (!onfulfilled) {
						// TODO: ¯\_(ツ)_/¯
						// TODO: FIXME
						resolve(result);
						return;
					}
					try {
						resolve(onfulfilled(result));
						return;
					}
					catch (e) {
						reject(e);
						return;
					}
				},
				onrejected: function (reason) {
					if (!onrejected) {
						reject(reason);
						return;
					}
					try {
						resolve(onrejected(reason));
						return;
					}
					catch (e) {
						reject(e);
						return;
					}
				},
			});
		});
	};
	/** JSDoc */
	SyncPromise.prototype.catch = function (onrejected) {
		return this.then(function (val) { return val; }, onrejected);
	};
	/** JSDoc */
	SyncPromise.prototype.finally = function (onfinally) {
		var _this = this;
		return new SyncPromise(function (resolve, reject) {
			var val;
			var isRejected;
			return _this.then(function (value) {
				isRejected = false;
				val = value;
				if (onfinally) {
					onfinally();
				}
			}, function (reason) {
				isRejected = true;
				val = reason;
				if (onfinally) {
					onfinally();
				}
			}).then(function () {
				if (isRejected) {
					reject(val);
					return;
				}
				// tslint:disable-next-line:no-unsafe-any
				resolve(val);
			});
		});
	};
	return SyncPromise;
}());

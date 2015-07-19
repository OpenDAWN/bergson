/*
 * Bergson Scheduler
 * http://github.com/colinbdclark/bergson
 *
 * Copyright 2015, Colin Clark
 * Dual licensed under the MIT and GPL Version 2 licenses.
 */
(function () {
    "use strict";

    /**
     * Scheduler
     *
     * Responsible for scheduling "score event specifications"
     * at defined moments in time.
     *
     * Schedulers are typically driven by a Clock instance.
     *
     * Bergson provides two primary scheduling primitives:
     *  1. "once", which will schedule a one-time event
     *  2. "repeat", which schedules a repeating event
     *
     * Score Event Specifications:
     *
     * One-time events:
     *    {
     *        type: "once",
     *
     *        // a future time in seconds when the callback should be invoked
     *        time: 2,
     *
     *        // a function to invoke at the specified time
     *        callback: function (time, this) {}
     *    }
     *
     * Repeating events:
     *    {
     *        type: "repeat",
     *
     *        // The frequency, in Hz, at which to repeat
     *        freq: 5,
     *
     *        // A future time in seconds at which to start repeating. Defaults to 0.
     *        time: 2,
     *
     *        // A future time in seconds at which to stop. Defaults to Infinity
     *        //(i.e. never stop)
     *        end: 20,
     *
     *        // A function to invoke repeatedly.
     *        callback: callback
     *    }
     *
     * Note: the Bergson scheduler operates a "late"
     * scheduling algorithm for changes that are finer-grained
     * than the resolution of its clock. So, for example, if the
     * clock is running at a rate of 1 tick/second, an event scheduled
     * at time 1.1 seconds will be invoked at the 2 second tick.
     *
     * The order of events scheduled for the same clock time is indeterminate.
     *
     */
    fluid.defaults("berg.scheduler", {
        gradeNames: ["fluid.standardRelayComponent", "autoInit"],

        members: {
            queue: "@expand:berg.priorityQueue()"
        },

        model: {
            timeScale: 1.0
        },

        components: {
            clock: { // Should be supplied by the user.
                type: "berg.clock.offline"
            }
        },

        invokers: {
            /**
             * Causes the scheduler to evaluate its
             * queue of scheduled callback and fire those that
             * are appropriate for the current clock time.
             *
             * This function is invoked automatically when the
             * scheduler's clock fires its onTick event.
             *
             * @param {Number} now - the current clock time, in seconds
             */
            tick: "berg.scheduler.tick({arguments}.0, {that}.model.timeScale, {that}.queue)",

            /**
             * Schedules one or more score event specifications.
             *
             * @param {Object||Array} scoreSpecs - the score event specifications to schedule
             */
            schedule: "berg.scheduler.schedule({arguments}.0, {that})",

            /**
             * Schedules a callback to be fired once at the specified time.
             *
             * @param {Number} time - the time from now, in seconds, to schedule the callback
             * @param {Function} callback - the callback to schedule
             */
            once: "berg.scheduler.once({arguments}.0, {arguments}.1, {that})",

            /**
             * Schedules a callback to be fired repeatedly at the specified frequency.
             *
             * @param {Number} freq - the frequency (per second) to repeat at
             * @param {Function} callback - the callback to schedule
             * @param {Number} time - the time (in seconds) to start repeating at
             * @param {Number} end - the time (in seconds) to stop repeating at; this value is inclusive
             */
            repeat: {
                funcName: "berg.scheduler.repeat",
                args: [
                    "{arguments}.0",
                    "{arguments}.1",
                    "{arguments}.2",
                    "{arguments}.3",
                    "{that}"
                ]
            },

            /**
             * Clears a scheduled event,
             * causing it not to be evaluated by this scheduler
             * if it hasn't already fired or is repeating.
             *
             * @param {Object} eventSpec - the event specification to clear
             */
            clear: "{that}.queue.remove({arguments}.0)",


            /**
             * Clears all scheduled events.
             */
            clearAll: "{that}.queue.clear()",

            /**
             * Scales the scheduled time of all currently and future events.
             *
             * @param {Number} value - the timeScale value (default is 1.0)
             */
            setTimeScale: {
                changePath: "timeScale",
                value: "{arguments}.0"
            }
        },

        modelListeners: {
            "timeScale": "berg.scheduler.scaleEventTimes({that}.queue, {change}.value)"
        },

        listeners: {
            "{clock}.events.onTick": {
                func: "{scheduler}.tick"
            }
        }
    });

    // Unsupported, non-API function.
    berg.scheduler.calcPriority = function (baseTime, timeOffset, timeScale) {
        return baseTime + (timeOffset * timeScale);
    };

    // Unsupported, non-API function.
    berg.scheduler.scaleEventTimes = function (queue, timeScale) {
        for (var i = 0; i < queue.items.length; i++) {
            var item = queue.items[i];
            item.priority = berg.scheduler.calcPriority(item.scheduledAt, item.time, timeScale);
        }
    };

    // Unsupported, non-API function.
    berg.scheduler.expandRepeatingEventSpec = function (now, eventSpec) {
        if (typeof eventSpec.time !== "number") {
            eventSpec.time = 0;
        }
        eventSpec.interval = 1.0 / eventSpec.freq;
        eventSpec.end = typeof eventSpec.end !== "number" ?
            Infinity : eventSpec.end + now;
    };

    // Unsupported, non-API function.
    berg.scheduler.validateEventSpec = function (eventSpec) {
        if (typeof eventSpec.callback !== "function") {
            throw new Error("No callback was specified for scheduled event: " +
                fluid.prettyPrintJSON(eventSpec));
        }

        if (eventSpec.type === "repeat" && typeof eventSpec.freq !== "number") {
            throw new Error("No freq was specified for scheduled event: " +
                fluid.prettyPrintJSON(eventSpec));
        }

        if (typeof eventSpec.time !== "number") {
            throw new Error("No time was specified for scheduled event: " +
                fluid.prettyPrintJSON(eventSpec));
        }
    };

    // Unsupported, non-API function.
    berg.scheduler.evaluateScoreEvent = function (scoreEvent, now, timeScale, queue) {
        scoreEvent.callback(now, scoreEvent);

        // If it's a repeating event, queue it back up.
        if (scoreEvent.type === "repeat" && scoreEvent.end > now) {
            scoreEvent.priority = berg.scheduler.calcPriority(now, scoreEvent.interval, timeScale);
            queue.push(scoreEvent);
        }
    };

    // Unsupported, non-API function.
    berg.scheduler.scheduleEvent = function (eventSpec, that) {
        var now = that.clock.time,
            timeScale = that.model.timeScale;

        // TODO: Should we warn on omitted type?
        if (!eventSpec.type) {
            eventSpec.type = "once";
        }

        if (eventSpec.type === "repeat") {
            berg.scheduler.expandRepeatingEventSpec(now, eventSpec);
        }

        if (typeof eventSpec.scheduledAt !== "number") {
            eventSpec.scheduledAt = now;
        }

        berg.scheduler.validateEventSpec(eventSpec);
        eventSpec.priority = berg.scheduler.calcPriority(now, eventSpec.time, timeScale);

        if (eventSpec.priority <= now) {
            berg.scheduler.evaluateScoreEvent(eventSpec, now, timeScale, that.queue);
        } else {
            that.queue.push(eventSpec);
        }

        return eventSpec;
    };

    // Unsupported, non-API function.
    berg.scheduler.scheduleEvents = function (eventSpecs, that) {
        eventSpecs.forEach(function (eventSpec) {
            berg.scheduler.scheduleEvent(eventSpec, that);
        });

        return eventSpecs;
    };

    berg.scheduler.schedule = function (eventSpec, that) {
        if (fluid.isArrayable(eventSpec)) {
            return berg.scheduler.scheduleEvents(eventSpec, that);
        }

        return berg.scheduler.scheduleEvent(eventSpec, that);
    };

    berg.scheduler.once = function (time, callback, that) {
        var eventSpec = {
            type: "once",
            time: time,
            callback: callback
        };

        return berg.scheduler.scheduleEvent(eventSpec, that);
    };

    berg.scheduler.repeat = function (freq, callback, time, end, that) {
        var eventSpec = {
            type: "repeat",
            freq: freq,
            time: time,
            end: end,
            callback: callback
        };

        return berg.scheduler.scheduleEvent(eventSpec, that);
    };

    berg.scheduler.tick = function (now, timeScale, queue) {
        var next = queue.peek();

        // Check to see if this event should fire now
        // (or should have fired earlier!)
        while (next && next.priority <= now) {
            // Take it out of the queue and invoke its callback.
            queue.pop();
            berg.scheduler.evaluateScoreEvent(next, now, timeScale, queue);
            next = queue.peek();
        }
    };

}());

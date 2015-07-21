/*
 * Bergson Clock Test Utilities
 * http://github.com/colinbdclark/bergson
 *
 * Copyright 2015, Colin Clark
 * Dual licensed under the MIT and GPL Version 2 licenses.
 */
 /*global QUnit, fluid, berg*/
(function () {

    "use strict";

    fluid.registerNamespace("berg.test.clock");

    berg.test.assertTimeEqual = function (actual, expected, tolerance, msg) {
        var larger = expected,
            smaller = actual;

        if (actual > expected) {
            larger = actual;
            smaller  = expected;
        }

        var diff = larger - smaller;

        QUnit.ok(diff <= tolerance, msg +
            " Tolerance is " + tolerance +
            "; difference was: " + diff + "ms.");
    };

    berg.test.clock.manualTicker = function (numTicks, clock) {
        for (var i = 0; i < numTicks; i++) {
            clock.tick();
        }
    };

    fluid.defaults("berg.test.clock.tester.manual", {
        gradeNames: ["fluid.eventedComponent", "autoInit"],

        invokers: {
            start: {
                funcName: "berg.test.clock.manualTicker",
                args: ["{that}.options.numTicks", "{clock}"]
            }
        }
    });

    // Tester mixin grade for clocks that are driven externally and thus:
    //   a) run asynchronously and need to signal QUnit to resume.
    //   b) need to be explicitly stopped.
    fluid.defaults("berg.test.clock.tester.external", {
        gradeNames: ["fluid.eventedComponent", "autoInit"],

        invokers: {
            start: "{clock}.start()"
        },

        listeners: {
            onStop: [
                {
                    priority: "first",
                    func: "{clock}.stop"
                },
                {
                    priority: "last",
                    func: "QUnit.start"
                }
            ]
        }
    });

}());
